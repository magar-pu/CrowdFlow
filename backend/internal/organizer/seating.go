package organizer

// Phase 4 — event seat overlay. Seeds the relational overlay tables
// (event_sections + event_seats_matrix) from the event's bound venue layout,
// assigning each physical section to one of the event's ticket tiers. Booking
// reads seat availability through these tables, so seeding only ever ADDS or
// re-tiers AVAILABLE seats — it never disturbs sold/blocked seats.

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"crowdflow-backend/internal/middleware"
	"crowdflow-backend/internal/response"
)

// ── DTOs ────────────────────────────────────────────────────────────────

type SeatingAssignment struct {
	VenueSectionID int `json:"venue_section_id"`
	TicketTierID   int `json:"ticket_tier_id"`
}

type SeedSeatingRequest struct {
	Assignments []SeatingAssignment `json:"assignments"`
}

// SectionSeating is one physical section of the bound layout with its current
// event overlay state (assigned tier + per-state seat counts).
type SectionSeating struct {
	VenueSectionID int    `json:"venue_section_id"`
	SectionName    string `json:"section_name"`
	SeatCount      int    `json:"seat_count"`
	TicketTierID   *int   `json:"ticket_tier_id"`
	Available      int    `json:"available"`
	Sold           int    `json:"sold"`
	Blocked        int    `json:"blocked"`
}

type EventSeatingResponse struct {
	LayoutID      *int             `json:"layout_id"`
	Sections      []SectionSeating `json:"sections"`
	UntieredSeats int              `json:"untiered_seats"`
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
		if a.VenueSectionID <= 0 || a.TicketTierID <= 0 {
			return fmt.Errorf("%w: each assignment needs a section and a tier", ErrValidation)
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

	resp := &EventSeatingResponse{Sections: []SectionSeating{}}
	if !layoutID.Valid {
		return resp, nil
	}
	lid := int(layoutID.Int64)
	resp.LayoutID = &lid

	rows, err := r.db.QueryContext(ctx, `
		SELECT vs.id, vs.section_name,
			COUNT(s.id) AS seat_count,
			es.ticket_tier_id,
			COUNT(esm.id) FILTER (WHERE esm.current_state = 'available') AS available,
			COUNT(esm.id) FILTER (WHERE esm.current_state = 'sold')      AS sold,
			COUNT(esm.id) FILTER (WHERE esm.current_state = 'blocked')   AS blocked
		FROM venue_sections vs
		JOIN seats s ON s.section_id = vs.id AND s.layout_id = $1
		LEFT JOIN event_sections es ON es.section_id = vs.id AND es.event_id = $2
		LEFT JOIN event_seats_matrix esm ON esm.seat_id = s.id AND esm.event_id = $2
		WHERE vs.layout_id = $1
		GROUP BY vs.id, vs.section_name, es.ticket_tier_id
		ORDER BY vs.id
	`, lid, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var sec SectionSeating
		var tierID sql.NullInt64
		if err := rows.Scan(&sec.VenueSectionID, &sec.SectionName, &sec.SeatCount,
			&tierID, &sec.Available, &sec.Sold, &sec.Blocked); err != nil {
			return nil, err
		}
		if tierID.Valid {
			t := int(tierID.Int64)
			sec.TicketTierID = &t
		}
		resp.UntieredSeats += sec.SeatCount - (sec.Available + sec.Sold + sec.Blocked)
		resp.Sections = append(resp.Sections, sec)
	}
	return resp, rows.Err()
}

// SeedEventSeating assigns tiers to layout sections and seeds the seat matrix.
// New seats are inserted as 'available'; existing 'available' seats are re-tiered
// to match; sold/blocked seats are never touched. Section-less seats are skipped
// (the matrix requires an event_section).
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
		// Validate the section belongs to the bound layout.
		var ok bool
		if err := tx.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM venue_sections WHERE id = $1 AND layout_id = $2)`,
			a.VenueSectionID, lid).Scan(&ok); err != nil {
			return err
		}
		if !ok {
			return fmt.Errorf("%w: section %d", ErrSectionNotInLayout, a.VenueSectionID)
		}
		// Validate the tier belongs to this event.
		if err := tx.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM ticket_tiers WHERE id = $1 AND event_id = $2)`,
			a.TicketTierID, eventID).Scan(&ok); err != nil {
			return err
		}
		if !ok {
			return fmt.Errorf("%w: tier %d", ErrTierNotInEvent, a.TicketTierID)
		}

		// Upsert the event_section (event_id + section_id is the logical key).
		var esID int
		err := tx.QueryRowContext(ctx,
			`SELECT id FROM event_sections WHERE event_id = $1 AND section_id = $2`, eventID, a.VenueSectionID).Scan(&esID)
		if err == sql.ErrNoRows {
			if err := tx.QueryRowContext(ctx, `
				INSERT INTO event_sections (event_id, section_id, ticket_tier_id, is_active)
				VALUES ($1, $2, $3, true) RETURNING id
			`, eventID, a.VenueSectionID, a.TicketTierID).Scan(&esID); err != nil {
				return err
			}
		} else if err != nil {
			return err
		} else {
			if _, err := tx.ExecContext(ctx,
				`UPDATE event_sections SET ticket_tier_id = $1, is_active = true WHERE id = $2`,
				a.TicketTierID, esID); err != nil {
				return err
			}
		}

		// Seed missing seats as available.
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO event_seats_matrix (event_id, seat_id, event_section_id, ticket_tier_id, current_state)
			SELECT $1, s.id, $2, $3, 'available'
			FROM seats s
			WHERE s.section_id = $4 AND s.layout_id = $5
			  AND NOT EXISTS (
				SELECT 1 FROM event_seats_matrix m WHERE m.event_id = $1 AND m.seat_id = s.id
			  )
		`, eventID, esID, a.TicketTierID, a.VenueSectionID, lid); err != nil {
			return err
		}
		// Re-tier already-available seats (never touch sold/blocked).
		if _, err := tx.ExecContext(ctx, `
			UPDATE event_seats_matrix m
			SET ticket_tier_id = $1, event_section_id = $2
			WHERE m.event_id = $3 AND m.current_state = 'available'
			  AND m.seat_id IN (SELECT id FROM seats WHERE section_id = $4 AND layout_id = $5)
		`, a.TicketTierID, esID, eventID, a.VenueSectionID, lid); err != nil {
			return err
		}
	}

	return tx.Commit()
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
		case errors.Is(err, ErrSectionNotInLayout):
			response.Error(w, http.StatusUnprocessableEntity, "SECTION_NOT_IN_LAYOUT", err.Error())
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
