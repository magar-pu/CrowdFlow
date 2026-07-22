package organizer

// Event seat overlay. Paints the event's ticket tiers directly onto the seats
// of its bound venue layout, writing event_seats_matrix rows. The layout itself
// is an untiered, reusable template; tier grouping exists only here, per event.
//
// Booking reads seat availability through this table, so painting only ever
// ADDS or re-tiers AVAILABLE seats — it never disturbs sold/blocked seats.

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"crowdflow-backend/internal/middleware"
	"crowdflow-backend/internal/response"
)

// ── DTOs ────────────────────────────────────────────────────────────────

// SeatingAssignment paints one ticket tier onto a set of seats. Seats are
// addressed individually, matching how the editor's marquee/paint selection
// works — there is no section granularity any more.
type SeatingAssignment struct {
	SeatIDs      []int `json:"seat_ids"`
	TicketTierID int   `json:"ticket_tier_id"`
}

type SeedSeatingRequest struct {
	Assignments []SeatingAssignment `json:"assignments"`
}

// TierSeating is one of the event's ticket tiers with the seats currently
// painted to it and their per-state counts.
type TierSeating struct {
	TicketTierID int    `json:"ticket_tier_id"`
	TierName     string `json:"tier_name"`
	SeatCount    int    `json:"seat_count"`
	Available    int    `json:"available"`
	Sold         int    `json:"sold"`
	Blocked      int    `json:"blocked"`
}

// EventSeatingResponse describes how far the event's seat painting has got.
// UntieredSeats counts seats in the bound layout with no event_seats_matrix
// row — these block submitting the event for review.
type EventSeatingResponse struct {
	LayoutID      *int          `json:"layout_id"`
	Tiers         []TierSeating `json:"tiers"`
	TotalSeats    int           `json:"total_seats"`
	UntieredSeats int           `json:"untiered_seats"`
}

// ── Service ─────────────────────────────────────────────────────────────

func (s *OrganizerService) GetEventSeating(ctx context.Context, eventID, organizerID int) (*EventSeatingResponse, error) {
	if eventID <= 0 {
		return nil, fmt.Errorf("%w: invalid event ID", ErrValidation)
	}
	return s.repo.GetEventSeating(ctx, eventID, organizerID)
}

func (s *OrganizerService) SeedEventSeating(ctx context.Context, eventID, organizerID int, req SeedSeatingRequest) error {
	if eventID <= 0 {
		return fmt.Errorf("%w: invalid event ID", ErrValidation)
	}
	for _, a := range req.Assignments {
		if a.TicketTierID <= 0 {
			return fmt.Errorf("%w: each assignment needs a ticket tier", ErrValidation)
		}
		if len(a.SeatIDs) == 0 {
			return fmt.Errorf("%w: assignment for tier %d has no seats", ErrValidation, a.TicketTierID)
		}
		for _, id := range a.SeatIDs {
			if id <= 0 {
				return fmt.Errorf("%w: invalid seat id in tier %d", ErrValidation, a.TicketTierID)
			}
		}
	}
	return s.repo.SeedEventSeating(ctx, eventID, organizerID, req.Assignments)
}

// ── Repository ──────────────────────────────────────────────────────────

func (r *PostgresRepository) GetEventSeating(ctx context.Context, eventID, organizerID int) (*EventSeatingResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	var layoutID sql.NullInt64
	err := r.db.QueryRowContext(ctx,
		`SELECT layout_id FROM events WHERE id = $1 AND organizer_id = $2`, eventID, organizerID).Scan(&layoutID)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("event not found or unauthorized")
	}
	if err != nil {
		return nil, err
	}

	resp := &EventSeatingResponse{Tiers: []TierSeating{}}
	if !layoutID.Valid {
		return resp, nil
	}
	lid := int(layoutID.Int64)
	resp.LayoutID = &lid

	// Every seat in the template, and how many of them are painted at all.
	if err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*),
			COUNT(*) FILTER (
				WHERE NOT EXISTS (
					SELECT 1 FROM event_seats_matrix m
					WHERE m.event_id = $2 AND m.seat_id = s.id
				)
			)
		FROM seats s
		WHERE s.layout_id = $1
	`, lid, eventID).Scan(&resp.TotalSeats, &resp.UntieredSeats); err != nil {
		return nil, err
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT tt.id, tt.name,
			COUNT(esm.id) AS seat_count,
			COUNT(esm.id) FILTER (WHERE esm.current_state = 'available') AS available,
			COUNT(esm.id) FILTER (WHERE esm.current_state = 'sold')      AS sold,
			COUNT(esm.id) FILTER (WHERE esm.current_state = 'blocked')   AS blocked
		FROM ticket_tiers tt
		LEFT JOIN event_seats_matrix esm
			ON esm.ticket_tier_id = tt.id AND esm.event_id = $1
		WHERE tt.event_id = $1
		GROUP BY tt.id, tt.name
		ORDER BY tt.price, tt.id
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var t TierSeating
		if err := rows.Scan(&t.TicketTierID, &t.TierName, &t.SeatCount,
			&t.Available, &t.Sold, &t.Blocked); err != nil {
			return nil, err
		}
		resp.Tiers = append(resp.Tiers, t)
	}
	return resp, rows.Err()
}

// SeedEventSeating paints ticket tiers onto individual seats of the event's
// bound layout. New seats are inserted as 'available'; existing 'available'
// seats are re-tiered to match; sold/blocked seats are never touched.
//
// Every seat id is validated against the bound layout, so a caller cannot paint
// seats belonging to somebody else's venue.
func (r *PostgresRepository) SeedEventSeating(ctx context.Context, eventID, organizerID int, assignments []SeatingAssignment) error {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var layoutID sql.NullInt64
	err = tx.QueryRowContext(ctx,
		`SELECT layout_id FROM events WHERE id = $1 AND organizer_id = $2 FOR UPDATE`, eventID, organizerID).Scan(&layoutID)
	if err == sql.ErrNoRows {
		return fmt.Errorf("event not found or unauthorized")
	}
	if err != nil {
		return err
	}
	if !layoutID.Valid {
		return ErrNoLayoutBound
	}
	lid := int(layoutID.Int64)

	for _, a := range assignments {
		// Validate the tier belongs to this event.
		var ok bool
		if err := tx.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM ticket_tiers WHERE id = $1 AND event_id = $2)`,
			a.TicketTierID, eventID).Scan(&ok); err != nil {
			return err
		}
		if !ok {
			return fmt.Errorf("%w: tier %d", ErrTierNotInEvent, a.TicketTierID)
		}

		// Every seat must belong to the bound layout. Counting once is cheaper
		// than validating ids one at a time, and a mismatch means the payload
		// referenced a seat from another venue.
		seatIDs := intArrayLiteral(a.SeatIDs)
		var valid int
		if err := tx.QueryRowContext(ctx,
			`SELECT COUNT(*) FROM seats WHERE layout_id = $1 AND id = ANY($2::int[])`,
			lid, seatIDs).Scan(&valid); err != nil {
			return err
		}
		if valid != len(a.SeatIDs) {
			return fmt.Errorf("%w: %d of %d seats are not in this event's layout",
				ErrSeatNotInLayout, len(a.SeatIDs)-valid, len(a.SeatIDs))
		}

		// Paint missing seats as available.
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO event_seats_matrix (event_id, seat_id, ticket_tier_id, current_state)
			SELECT $1, s.id, $2, 'available'
			FROM seats s
			WHERE s.layout_id = $3 AND s.id = ANY($4::int[])
			  AND NOT EXISTS (
				SELECT 1 FROM event_seats_matrix m WHERE m.event_id = $1 AND m.seat_id = s.id
			  )
		`, eventID, a.TicketTierID, lid, seatIDs); err != nil {
			return err
		}
		// Re-tier already-available seats (never touch sold/blocked).
		if _, err := tx.ExecContext(ctx, `
			UPDATE event_seats_matrix m
			SET ticket_tier_id = $1
			WHERE m.event_id = $2 AND m.current_state = 'available'
			  AND m.seat_id = ANY($3::int[])
		`, a.TicketTierID, eventID, seatIDs); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// intArrayLiteral renders ids as a Postgres array literal ("{1,2,3}") for use
// with `= ANY($n::int[])`.
//
// The project drives pgx through database/sql, where a plain []int is not a
// valid driver value, and lib/pq (whose pq.Array would do this) is not a
// dependency. Formatting the literal here keeps the query parameterised - the
// values are still bound, not interpolated into SQL - without adding a driver
// dependency for one call site.
func intArrayLiteral(ids []int) string {
	if len(ids) == 0 {
		return "{}"
	}
	var b strings.Builder
	b.WriteByte('{')
	for i, id := range ids {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString(strconv.Itoa(id))
	}
	b.WriteByte('}')
	return b.String()
}

// ── Handlers ────────────────────────────────────────────────────────────

func (h *Handler) organizerIDFrom(w http.ResponseWriter, r *http.Request) (int, bool) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return 0, false
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return 0, false
	}
	return userID, true
}

func (h *Handler) handleGetSeating(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.organizerIDFrom(w, r)
	if !ok {
		return
	}
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}
	seating, err := h.service.GetEventSeating(r.Context(), eventID, userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load seating: "+err.Error())
		return
	}
	response.JSON(w, http.StatusOK, seating)
}

func (h *Handler) handleSeedSeating(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.organizerIDFrom(w, r)
	if !ok {
		return
	}
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	var req SeedSeatingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	if err := h.service.SeedEventSeating(r.Context(), eventID, userID, req); err != nil {
		switch {
		case errors.Is(err, ErrNoLayoutBound):
			response.Error(w, http.StatusUnprocessableEntity, "NO_LAYOUT", "Bind a venue layout to this event before assigning seating")
		case errors.Is(err, ErrSeatNotInLayout):
			response.Error(w, http.StatusUnprocessableEntity, "SEAT_NOT_IN_LAYOUT", err.Error())
		case errors.Is(err, ErrTierNotInEvent):
			response.Error(w, http.StatusUnprocessableEntity, "TIER_NOT_IN_EVENT", err.Error())
		case errors.Is(err, ErrValidation):
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
		default:
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save seating: "+err.Error())
		}
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Seating updated"})
}
