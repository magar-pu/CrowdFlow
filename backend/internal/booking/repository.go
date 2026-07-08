package booking

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type PostgresRedisRepository struct {
	db    *sql.DB
	redis *redis.Client
}

func NewPostgresRedisRepository(db *sql.DB, redisClient *redis.Client) *PostgresRedisRepository {
	return &PostgresRedisRepository{db: db, redis: redisClient}
}

// ListTicketTiers returns only tiers currently on sale: public visibility
// and within the sales window. Admin-facing listing (all tiers, all
// visibilities) already exists separately in internal/admin.
func (r *PostgresRedisRepository) ListTicketTiers(eventID int) ([]*TicketTier, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, event_id, name, COALESCE(description, ''), price, allocation_limit, tickets_sold, max_ticket_per_user
		FROM ticket_tiers
		WHERE event_id = $1 AND visibility = 'public' AND sales_start <= now() AND sales_end >= now()
		ORDER BY price ASC
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tiers []*TicketTier
	for rows.Next() {
		var t TicketTier
		var allocationLimit, ticketsSold int
		if err := rows.Scan(&t.ID, &t.EventID, &t.Name, &t.Description, &t.Price, &allocationLimit, &ticketsSold, &t.MaxPerTransaction); err != nil {
			return nil, err
		}
		t.QuotaRemaining = allocationLimit - ticketsSold
		tiers = append(tiers, &t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return tiers, nil
}

// GetSeatMap returns every assigned seat for the event, grouped by section.
// Seat status comes from event_seats_matrix.current_state (per-event booking
// status), not seats.seat_status (the seat's venue-level physical condition).
func (r *PostgresRedisRepository) GetSeatMap(eventID int) ([]*SeatSection, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT es.id, vs.section_name, es.ticket_tier_id, tt.price,
			s.id, s.row_number, s.seat_number, esm.current_state
		FROM event_sections es
		JOIN venue_sections vs ON es.section_id = vs.id
		JOIN ticket_tiers tt ON es.ticket_tier_id = tt.id
		JOIN event_seats_matrix esm ON esm.event_section_id = es.id AND esm.event_id = es.event_id
		JOIN seats s ON s.id = esm.seat_id
		WHERE es.event_id = $1 AND es.is_active = true
		ORDER BY vs.section_name, s.row_number, s.seat_number
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sectionsByID := make(map[int]*SeatSection)
	var order []int
	for rows.Next() {
		var sectionID, tierID, seatID int
		var sectionName, row, number, state string
		var price float64
		if err := rows.Scan(&sectionID, &sectionName, &tierID, &price, &seatID, &row, &number, &state); err != nil {
			return nil, err
		}

		section, ok := sectionsByID[sectionID]
		if !ok {
			section = &SeatSection{
				EventSectionID: sectionID,
				Name:           sectionName,
				TicketTierID:   tierID,
				Price:          price,
			}
			sectionsByID[sectionID] = section
			order = append(order, sectionID)
		}
		section.Seats = append(section.Seats, Seat{
			SeatID: seatID,
			Row:    row,
			Number: number,
			Status: state,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	sections := make([]*SeatSection, 0, len(order))
	for _, id := range order {
		sections = append(sections, sectionsByID[id])
	}
	return sections, nil
}

func (r *PostgresRedisRepository) IsAssignedSeating(ticketTierID int) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS (SELECT 1 FROM event_seats_matrix WHERE ticket_tier_id = $1)
	`, ticketTierID).Scan(&exists)
	return exists, err
}

func seatLockKey(eventID, seatID int) string {
	return fmt.Sprintf("lock:event:%d:seat:%d", eventID, seatID)
}

func gaCapacityKey(ticketTierID int) string {
	return fmt.Sprintf("event:ticket_tier:%d:capacity", ticketTierID)
}

func holdMetadataKey(holdToken string) string {
	return "hold:" + holdToken
}

// releaseIfMatchScript deletes a seat lock only if it's still held by the
// caller's token, so a hold that already expired and was re-acquired by
// someone else is never released out from under them.
var releaseIfMatchScript = redis.NewScript(`
if redis.call("GET", KEYS[1]) == ARGV[1] then
	return redis.call("DEL", KEYS[1])
else
	return 0
end
`)

func (r *PostgresRedisRepository) AcquireSeatHolds(eventID int, seatIDs []int, holdToken string, ttl time.Duration) (bool, error) {
	ctx := context.Background()
	acquiredKeys := make([]string, 0, len(seatIDs))

	for _, seatID := range seatIDs {
		key := seatLockKey(eventID, seatID)
		ok, err := r.redis.SetNX(ctx, key, holdToken, ttl).Result()
		if err != nil {
			r.redis.Del(ctx, acquiredKeys...)
			return false, err
		}
		if !ok {
			r.redis.Del(ctx, acquiredKeys...)
			return false, nil
		}
		acquiredKeys = append(acquiredKeys, key)
	}
	return true, nil
}

func (r *PostgresRedisRepository) ReleaseSeatHolds(eventID int, seatIDs []int, holdToken string) error {
	ctx := context.Background()
	for _, seatID := range seatIDs {
		key := seatLockKey(eventID, seatID)
		if err := releaseIfMatchScript.Run(ctx, r.redis, []string{key}, holdToken).Err(); err != nil && !errors.Is(err, redis.Nil) {
			return err
		}
	}
	return nil
}

// decrementIfEnoughScript atomically checks the counter has enough remaining
// capacity before decrementing it - a plain DECRBY would happily go negative
// under concurrent requests.
var decrementIfEnoughScript = redis.NewScript(`
local current = tonumber(redis.call("GET", KEYS[1]))
local qty = tonumber(ARGV[1])
if current >= qty then
	redis.call("DECRBY", KEYS[1], qty)
	return 1
else
	return 0
end
`)

func (r *PostgresRedisRepository) AcquireGAHold(ticketTierID int, quantity int) (bool, error) {
	ctx := context.Background()
	key := gaCapacityKey(ticketTierID)

	exists, err := r.redis.Exists(ctx, key).Result()
	if err != nil {
		return false, err
	}
	if exists == 0 {
		dbCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
		var remaining int
		err := r.db.QueryRowContext(dbCtx, `
			SELECT allocation_limit - tickets_sold FROM ticket_tiers WHERE id = $1
		`, ticketTierID).Scan(&remaining)
		cancel()
		if err != nil {
			return false, err
		}
		// SETNX so a concurrent seeder never clobbers an already-seeded value.
		if err := r.redis.SetNX(ctx, key, remaining, 0).Err(); err != nil {
			return false, err
		}
	}

	result, err := decrementIfEnoughScript.Run(ctx, r.redis, []string{key}, quantity).Int()
	if err != nil {
		return false, err
	}
	return result == 1, nil
}

func (r *PostgresRedisRepository) ReleaseGAHold(ticketTierID int, quantity int) error {
	ctx := context.Background()
	return r.redis.IncrBy(ctx, gaCapacityKey(ticketTierID), int64(quantity)).Err()
}

func (r *PostgresRedisRepository) StoreHoldMetadata(holdToken string, req HoldRequest, ttl time.Duration) error {
	ctx := context.Background()
	payload, err := json.Marshal(req)
	if err != nil {
		return err
	}
	return r.redis.Set(ctx, holdMetadataKey(holdToken), payload, ttl).Err()
}

func (r *PostgresRedisRepository) GetHoldMetadata(holdToken string) (*HoldRequest, error) {
	ctx := context.Background()
	payload, err := r.redis.Get(ctx, holdMetadataKey(holdToken)).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, errors.New("hold not found or already expired")
		}
		return nil, err
	}
	var req HoldRequest
	if err := json.Unmarshal(payload, &req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *PostgresRedisRepository) DeleteHoldMetadata(holdToken string) error {
	ctx := context.Background()
	return r.redis.Del(ctx, holdMetadataKey(holdToken)).Err()
}
