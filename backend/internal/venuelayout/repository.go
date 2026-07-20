package venuelayout

import (
	"context"
	"database/sql"
	"errors"
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
