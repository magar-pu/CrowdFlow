package venuelayout

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

// scanLayout reads the shared venue_layouts column list into a Layout, handling
// the nullable owner_user_id.
func scanLayout(s interface {
	Scan(dest ...any) error
}) (*Layout, error) {
	var l Layout
	var geometry []byte
	var owner sql.NullInt64
	if err := s.Scan(
		&l.ID, &l.VenueID, &l.Name, &l.SchemaVersion, &geometry,
		&l.Visibility, &owner, &l.Status, &l.CreatedAt, &l.UpdatedAt,
	); err != nil {
		return nil, err
	}
	l.Geometry = geometry
	if owner.Valid {
		v := int(owner.Int64)
		l.OwnerUserID = &v
	}
	return &l, nil
}

const layoutColumns = `id, venue_id, name, schema_version, geometry, visibility, owner_user_id, status, created_at, updated_at`

func (r *PostgresRepository) ListLayouts(ctx context.Context, venueID, userID int) ([]*Layout, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT `+layoutColumns+`
		FROM venue_layouts
		WHERE venue_id = $1 AND (visibility = 'public' OR owner_user_id = $2)
		ORDER BY updated_at DESC
	`, venueID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	layouts := make([]*Layout, 0)
	for rows.Next() {
		l, err := scanLayout(rows)
		if err != nil {
			return nil, err
		}
		layouts = append(layouts, l)
	}
	return layouts, rows.Err()
}

func (r *PostgresRepository) GetLayout(ctx context.Context, layoutID int) (*LayoutDetail, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	layout, err := scanLayout(r.db.QueryRowContext(ctx, `
		SELECT `+layoutColumns+` FROM venue_layouts WHERE id = $1
	`, layoutID))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	sections, err := r.listSections(ctx, layoutID)
	if err != nil {
		return nil, err
	}
	seats, err := r.listSeats(ctx, layoutID)
	if err != nil {
		return nil, err
	}

	return &LayoutDetail{Layout: *layout, Sections: sections, Seats: seats}, nil
}

func (r *PostgresRepository) CreateLayout(ctx context.Context, venueID, ownerUserID int, req CreateLayoutRequest) (*Layout, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	visibility := req.Visibility
	if visibility == "" {
		visibility = "public"
	}
	return scanLayout(r.db.QueryRowContext(ctx, `
		INSERT INTO venue_layouts (venue_id, name, visibility, owner_user_id)
		VALUES ($1, $2, $3, $4)
		RETURNING `+layoutColumns+`
	`, venueID, req.Name, visibility, ownerUserID))
}

// SaveLayout persists the entire editor state atomically. The transaction locks
// the layout row, enforces ownership + optimistic concurrency, then diffs
// sections and seats and finally rewrites the header. Deletes are refused for
// rows already referenced by an event (event_sections / event_seats_matrix).
func (r *PostgresRepository) SaveLayout(ctx context.Context, venueID, layoutID, userID int, req SaveLayoutRequest) (*SaveLayoutResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 1. Lock the layout and enforce ownership + the optimistic-lock check.
	var dbVenueID int
	var owner sql.NullInt64
	var updatedAt time.Time
	err = tx.QueryRowContext(ctx, `
		SELECT venue_id, owner_user_id, updated_at
		FROM venue_layouts WHERE id = $1 FOR UPDATE
	`, layoutID).Scan(&dbVenueID, &owner, &updatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if dbVenueID != venueID {
		return nil, ErrNotFound
	}
	if !owner.Valid || int(owner.Int64) != userID {
		return nil, ErrForbidden
	}
	if !updatedAt.Truncate(time.Microsecond).Equal(req.ExpectedUpdatedAt.Truncate(time.Microsecond)) {
		return nil, ErrStale
	}

	// 2. Snapshot the current ids so we can compute deletions.
	existingSections, err := selectIDSet(ctx, tx, `SELECT id FROM venue_sections WHERE layout_id = $1`, layoutID)
	if err != nil {
		return nil, err
	}
	existingSeats, err := selectIDSet(ctx, tx, `SELECT id FROM seats WHERE layout_id = $1`, layoutID)
	if err != nil {
		return nil, err
	}

	// 3. Upsert sections and build the client-key -> real-id lookup.
	sectionKeyToID := make(map[string]int, len(req.Sections))
	sectionIDMap := make(map[string]int)
	keepSections := make(map[int]bool)
	for _, s := range req.Sections {
		if s.ID != nil {
			res, err := tx.ExecContext(ctx, `
				UPDATE venue_sections SET section_name = $1, color = $2, shape = $3::jsonb
				WHERE id = $4 AND layout_id = $5
			`, s.SectionName, s.Color, jsonbArg(s.Shape), *s.ID, layoutID)
			if err != nil {
				return nil, err
			}
			if n, _ := res.RowsAffected(); n == 0 {
				return nil, fmt.Errorf("%w: section id %d does not belong to this layout", ErrInvalidInput, *s.ID)
			}
			sectionKeyToID[s.Key] = *s.ID
			keepSections[*s.ID] = true
		} else {
			var newID int
			if err := tx.QueryRowContext(ctx, `
				INSERT INTO venue_sections (venue_id, layout_id, section_name, capacity, color, shape)
				VALUES ($1, $2, $3, 0, $4, $5::jsonb)
				RETURNING id
			`, venueID, layoutID, s.SectionName, s.Color, jsonbArg(s.Shape)).Scan(&newID); err != nil {
				return nil, err
			}
			sectionKeyToID[s.Key] = newID
			sectionIDMap[s.Key] = newID
			keepSections[newID] = true
		}
	}

	// 4. Delete sections no longer present, unless an event depends on them.
	for id := range existingSections {
		if keepSections[id] {
			continue
		}
		var inUse bool
		if err := tx.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM event_sections WHERE section_id = $1)`, id).Scan(&inUse); err != nil {
			return nil, err
		}
		if inUse {
			return nil, fmt.Errorf("%w: section id %d", ErrSectionInUse, id)
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM venue_sections WHERE id = $1 AND layout_id = $2`, id, layoutID); err != nil {
			return nil, err
		}
	}

	// 5. Upsert seats, resolving each seat's section via the key lookup.
	seatIDMap := make(map[string]int)
	keepSeats := make(map[int]bool)
	for _, st := range req.Seats {
		var sectionID *int
		if st.SectionKey != nil {
			id, ok := sectionKeyToID[*st.SectionKey]
			if !ok {
				return nil, fmt.Errorf("%w: seat %q references unknown section_key %q", ErrInvalidInput, st.Key, *st.SectionKey)
			}
			sectionID = &id
		}
		if st.ID != nil {
			res, err := tx.ExecContext(ctx, `
				UPDATE seats SET section_id = $1, row_number = $2, seat_number = $3, pos_x = $4, pos_y = $5
				WHERE id = $6 AND layout_id = $7
			`, sectionID, st.Row, st.Number, st.PosX, st.PosY, *st.ID, layoutID)
			if err != nil {
				return nil, err
			}
			if n, _ := res.RowsAffected(); n == 0 {
				return nil, fmt.Errorf("%w: seat id %d does not belong to this layout", ErrInvalidInput, *st.ID)
			}
			keepSeats[*st.ID] = true
		} else {
			var newID int
			if err := tx.QueryRowContext(ctx, `
				INSERT INTO seats (layout_id, section_id, row_number, seat_number, pos_x, pos_y)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING id
			`, layoutID, sectionID, st.Row, st.Number, st.PosX, st.PosY).Scan(&newID); err != nil {
				return nil, err
			}
			seatIDMap[st.Key] = newID
			keepSeats[newID] = true
		}
	}

	// 6. Delete seats no longer present, unless an event depends on them.
	for id := range existingSeats {
		if keepSeats[id] {
			continue
		}
		var inUse bool
		if err := tx.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM event_seats_matrix WHERE seat_id = $1)`, id).Scan(&inUse); err != nil {
			return nil, err
		}
		if inUse {
			return nil, fmt.Errorf("%w: seat id %d", ErrSeatInUse, id)
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM seats WHERE id = $1 AND layout_id = $2`, id, layoutID); err != nil {
			return nil, err
		}
	}

	// 7. Recompute section capacities from the settled seat assignments.
	if _, err := tx.ExecContext(ctx, `
		UPDATE venue_sections vs
		SET capacity = (SELECT count(*) FROM seats s WHERE s.section_id = vs.id AND s.layout_id = $1)
		WHERE vs.layout_id = $1
	`, layoutID); err != nil {
		return nil, err
	}

	// 8. Rewrite the layout header and bump updated_at (advances the lock token).
	geometry := "{}"
	if len(req.Geometry) > 0 {
		geometry = string(req.Geometry)
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE venue_layouts SET name = $1, visibility = $2, geometry = $3::jsonb, updated_at = now()
		WHERE id = $4
	`, req.Name, req.Visibility, geometry, layoutID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// 9. Re-read the persisted state for the response body.
	detail, err := r.GetLayout(ctx, layoutID)
	if err != nil {
		return nil, err
	}
	return &SaveLayoutResponse{Layout: detail, SectionIDMap: sectionIDMap, SeatIDMap: seatIDMap}, nil
}

// selectIDSet runs a single-integer-column query and collects the ids into a set.
func selectIDSet(ctx context.Context, tx *sql.Tx, query string, args ...any) (map[int]bool, error) {
	rows, err := tx.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	set := make(map[int]bool)
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		set[id] = true
	}
	return set, rows.Err()
}

// jsonbArg normalises a raw-JSON field for a $n::jsonb parameter: empty input
// becomes SQL NULL, otherwise the JSON text is passed for Postgres to parse.
func jsonbArg(raw json.RawMessage) any {
	if len(raw) == 0 {
		return nil
	}
	return string(raw)
}

func (r *PostgresRepository) listSections(ctx context.Context, layoutID int) ([]*Section, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, section_name, color, shape
		FROM venue_sections
		WHERE layout_id = $1
		ORDER BY id
	`, layoutID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sections := make([]*Section, 0)
	for rows.Next() {
		var s Section
		var color sql.NullString
		var shape []byte
		if err := rows.Scan(&s.ID, &s.Name, &color, &shape); err != nil {
			return nil, err
		}
		if color.Valid {
			s.Color = &color.String
		}
		s.Shape = shape
		sections = append(sections, &s)
	}
	return sections, rows.Err()
}

func (r *PostgresRepository) listSeats(ctx context.Context, layoutID int) ([]*Seat, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, section_id, row_number, seat_number, pos_x, pos_y
		FROM seats
		WHERE layout_id = $1
		ORDER BY id
	`, layoutID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	seats := make([]*Seat, 0)
	for rows.Next() {
		var s Seat
		var sectionID sql.NullInt64
		var posX, posY sql.NullFloat64
		if err := rows.Scan(&s.ID, &sectionID, &s.Row, &s.Number, &posX, &posY); err != nil {
			return nil, err
		}
		if sectionID.Valid {
			v := int(sectionID.Int64)
			s.SectionID = &v
		}
		if posX.Valid {
			s.PosX = &posX.Float64
		}
		if posY.Valid {
			s.PosY = &posY.Float64
		}
		seats = append(seats, &s)
	}
	return seats, rows.Err()
}
