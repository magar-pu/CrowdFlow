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

// GetSeatMap returns the buyer-facing seating payload for an event: the bound
// layout's decorative geometry, every assigned seat grouped by priced section,
// and any on-sale tiers that have no assigned seats (general admission).
//
// Seat status comes from event_seats_matrix.current_state (per-event booking
// status), not seats.seat_status (the seat's venue-level physical condition).
// Geometry (section shape/colour, seat pos_x/pos_y) rides along so buyers can
// render the same map the organizer designed without needing the
// organizer-gated layout API.
func (r *PostgresRedisRepository) GetSeatMap(eventID int) (*SeatMap, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tiers, seatedTierIDs, err := r.seatMapTiers(ctx, eventID)
	if err != nil {
		return nil, err
	}

	// current_state only becomes 'sold' once an order is paid, so a seat another
	// buyer is holding right now still reads 'available' in Postgres. Overlay
	// the live Redis locks, otherwise the map advertises seats that cannot be
	// held and buyers only discover the clash at the last step.
	if err := r.applySeatHolds(ctx, eventID, tiers); err != nil {
		return nil, err
	}

	layout, err := r.seatMapLayout(ctx, eventID)
	if err != nil {
		return nil, err
	}

	// Any on-sale tier without assigned seats is sold as general admission.
	allTiers, err := r.ListTicketTiers(eventID)
	if err != nil {
		return nil, err
	}
	gaTiers := make([]*TicketTier, 0, len(allTiers))
	for _, t := range allTiers {
		if !seatedTierIDs[t.ID] {
			gaTiers = append(gaTiers, t)
		}
	}

	return &SeatMap{Layout: layout, Tiers: tiers, GaTiers: gaTiers}, nil
}

// applySeatHolds marks seats currently locked in Redis as "held", in place.
//
// Only seats Postgres still reports as available are considered: a sold or
// blocked seat outranks a stale lock. Read-only, and a missing key simply means
// the seat is free — expiry is handled by Redis, not here.
func (r *PostgresRedisRepository) applySeatHolds(ctx context.Context, eventID int, tiers []*SeatTier) error {
	keys := make([]string, 0)
	positions := make([][2]int, 0) // tier index, seat index
	for ti, tier := range tiers {
		for si, seat := range tier.Seats {
			if seat.Status != "available" {
				continue
			}
			keys = append(keys, seatLockKey(eventID, seat.SeatID))
			positions = append(positions, [2]int{ti, si})
		}
	}
	if len(keys) == 0 {
		return nil
	}

	values, err := r.redis.MGet(ctx, keys...).Result()
	if err != nil {
		return err
	}
	for i, v := range values {
		if v == nil {
			continue
		}
		ti, si := positions[i][0], positions[i][1]
		tiers[ti].Seats[si].Status = "held"
	}
	return nil
}

// seatMapTiers loads each ticket tier with the seats assigned to it for this
// event, also reporting which tiers are sold as assigned seating. Grouping is
// per-seat via event_seats_matrix - the venue layout itself is untiered.
func (r *PostgresRedisRepository) seatMapTiers(ctx context.Context, eventID int) ([]*SeatTier, map[int]bool, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT tt.id, tt.name, tt.price, '' AS color,
			s.id, s.row_number, s.seat_number, esm.current_state, s.pos_x, s.pos_y
		FROM event_seats_matrix esm
		JOIN ticket_tiers tt ON tt.id = esm.ticket_tier_id
		JOIN seats s ON s.id = esm.seat_id
		WHERE esm.event_id = $1
		ORDER BY tt.price, s.row_number, s.seat_number
	`, eventID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	tiersByID := make(map[int]*SeatTier)
	seatedTierIDs := make(map[int]bool)
	var order []int
	for rows.Next() {
		var tierID, seatID int
		var tierName, row, number, state string
		var price float64
		var color sql.NullString
		var posX, posY sql.NullFloat64
		if err := rows.Scan(
			&tierID, &tierName, &price, &color,
			&seatID, &row, &number, &state, &posX, &posY,
		); err != nil {
			return nil, nil, err
		}

		tier, ok := tiersByID[tierID]
		if !ok {
			tier = &SeatTier{
				TicketTierID: tierID,
				Name:         tierName,
				Price:        price,
				Seats:        []Seat{},
			}
			if color.Valid {
				tier.Color = &color.String
			}
			tiersByID[tierID] = tier
			order = append(order, tierID)
			seatedTierIDs[tierID] = true
		}

		seat := Seat{SeatID: seatID, Row: row, Number: number, Status: state}
		if posX.Valid {
			seat.PosX = &posX.Float64
		}
		if posY.Valid {
			seat.PosY = &posY.Float64
		}
		tier.Seats = append(tier.Seats, seat)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	tiers := make([]*SeatTier, 0, len(order))
	for _, id := range order {
		tiers = append(tiers, tiersByID[id])
	}
	return tiers, seatedTierIDs, nil
}

// seatMapLayout loads the decorative geometry of the layout bound to the
// event. Returns nil (not an error) when the event has no layout bound.
func (r *PostgresRedisRepository) seatMapLayout(ctx context.Context, eventID int) (*SeatMapLayout, error) {
	var layoutID int
	var geometry []byte
	err := r.db.QueryRowContext(ctx, `
		SELECT vl.id, vl.geometry
		FROM events e
		JOIN venue_layouts vl ON vl.id = e.layout_id
		WHERE e.id = $1
	`, eventID).Scan(&layoutID, &geometry)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	// venue_layouts.geometry is NOT NULL DEFAULT '{}', but guard anyway so an
	// empty column can never emit invalid JSON.
	if len(geometry) == 0 {
		geometry = []byte("{}")
	}
	return &SeatMapLayout{LayoutID: layoutID, Geometry: json.RawMessage(geometry)}, nil
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

// GetMaxPerOrder reads the tier's per-order cap. A missing tier reports 0
// (uncapped) rather than an error: CreateHold's later inventory calls are what
// authoritatively reject an unknown tier.
func (r *PostgresRedisRepository) GetMaxPerOrder(ticketTierID int) (int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var max int
	err := r.db.QueryRowContext(ctx, `
		SELECT max_ticket_per_user FROM ticket_tiers WHERE id = $1
	`, ticketTierID).Scan(&max)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return max, err
}

// IsTierBookable resolves the event from the ticket tier rather than trusting
// req.EventID, which is client-supplied and never cross-checked against the
// tier anywhere else in the hold path.
//
// A withdrawn (unpublished) event still serves its detail page so existing
// ticket holders keep working links — this is what stops it from taking new
// orders while it is off the public listing.
func (r *PostgresRedisRepository) IsTierBookable(ticketTierID int) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var bookable bool
	err := r.db.QueryRowContext(ctx, `
		SELECT e.status = 'approved'
		   AND e.published_at IS NOT NULL
		   AND e.archived_at IS NULL
		FROM ticket_tiers tt
		JOIN events e ON tt.event_id = e.id
		WHERE tt.id = $1
	`, ticketTierID).Scan(&bookable)
	if err == sql.ErrNoRows {
		return false, nil
	}
	return bookable, err
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
