package event

import (
	"context"
	"database/sql"
	"time"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) GetAll(limit, offset int, sort EventSort) ([]*Event, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// Only the upcoming sort hides finished events. The /events browse page
	// shares this endpoint and still needs to reach past events, so this stays
	// out of the base WHERE clause. event_end (not event_start) is the cutoff:
	// an event that has begun but not ended is still attendable.
	timeFilter := ""
	if sort == SortUpcoming {
		timeFilter = "AND e.event_end >= now()"
	}

	// orderBy is chosen from this fixed set only — never built from user input.
	// Each ends in e.id so that LIMIT/OFFSET paging cannot duplicate or skip
	// rows when the leading key ties.
	var orderBy string
	switch sort {
	case SortUpcoming:
		orderBy = "ORDER BY e.event_start ASC, e.id ASC"
	case SortTrending:
		// Events with no recent sales all tie at 0 and fall through to the
		// soonest-first tiebreak, which is the honest answer on a quiet
		// catalogue rather than an invented ranking.
		orderBy = "ORDER BY COALESCE(sales.recent_sold, 0) DESC, e.event_start ASC, e.id ASC"
	default:
		orderBy = "ORDER BY e.created_at DESC, e.id ASC"
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT
			e.id, e.venue_id, e.organizer_id, e.event_name, COALESCE(e.description, ''), e.event_start, e.event_end,
			e.entertainment_tax_rate, e.entertainment_tax_passed_to_buyer, e.status, e.created_at, e.updated_at,
			e.event_type_id, COALESCE(e.cover_image_url, ''),
			-- Mirrors the on-sale filter in booking.ListTicketTiers. Taking a
			-- bare MIN over every tier quoted "tickets from" prices off private
			-- or closed tiers that no buyer could actually purchase.
			(SELECT MIN(tt.price) FROM ticket_tiers tt
			  WHERE tt.event_id = e.id
			    AND tt.visibility = 'public'
			    AND tt.sales_start <= now()
			    AND tt.sales_end >= now()),
			COALESCE(sales.recent_sold, 0),
			v.id, COALESCE(v.name, ''), COALESCE(v.address, ''), COALESCE(v.city, ''), COALESCE(v.province, ''), COALESCE(v.total_capacity, 0),
			u.id, COALESCE(up.full_name, ''), COALESCE(up.avatar_pic, '')
		FROM events e
		LEFT JOIN venues v ON e.venue_id = v.id
		LEFT JOIN users u ON e.organizer_id = u.id
		LEFT JOIN user_profiles up ON u.id = up.user_id
		-- Sales velocity over a rolling 7-day window, from orders -- the same
		-- source of truth the payout figures use. ticket_tiers.tickets_sold is
		-- never written by anything in this codebase and must not be used.
		LEFT JOIN (
			SELECT event_id, SUM(quantity) AS recent_sold
			FROM orders
			WHERE status = 'paid'
			  AND paid_at >= now() - interval '7 days'
			GROUP BY event_id
		) sales ON sales.event_id = e.id
		-- 'approved' is the auditor's verdict; published_at is the organizer's
		-- decision to actually go on sale. Both are required to appear here.
		-- archived_at excludes events the organizer has filed away (0017).
		WHERE e.status = 'approved'
		  AND e.published_at IS NOT NULL
		  AND e.archived_at IS NULL
		  `+timeFilter+`
		`+orderBy+`
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*Event
	for rows.Next() {
		var e Event
		var eventTypeID sql.NullInt64
		var coverImageURL sql.NullString
		var startingPrice sql.NullFloat64

		var vID sql.NullInt64
		var vName sql.NullString
		var vAddress sql.NullString
		var vCity sql.NullString
		var vProvince sql.NullString
		var vCapacity sql.NullInt64

		var oID sql.NullInt64
		var oName sql.NullString
		var oAvatar sql.NullString

		err := rows.Scan(
			&e.ID, &e.VenueID, &e.OrganizerID, &e.EventName, &e.Description, &e.EventStart, &e.EventEnd,
			&e.EntertainmentTaxRate, &e.EntertainmentTaxPassedToBuyer, &e.Status, &e.CreatedAt, &e.UpdatedAt,
			&eventTypeID, &coverImageURL, &startingPrice, &e.RecentSales,
			&vID, &vName, &vAddress, &vCity, &vProvince, &vCapacity,
			&oID, &oName, &oAvatar,
		)
		if err != nil {
			return nil, err
		}
		if eventTypeID.Valid {
			e.EventTypeID = int(eventTypeID.Int64)
		}
		if coverImageURL.Valid {
			e.CoverImageURL = coverImageURL.String
		}
		// Left nil when the event has no ticket tiers, so the client can tell
		// "no tiers configured" apart from a free event.
		if startingPrice.Valid {
			e.StartingPrice = &startingPrice.Float64
		}

		if vID.Valid {
			e.Venue = &Venue{
				ID:            int(vID.Int64),
				Name:          vName.String,
				Address:       vAddress.String,
				City:          vCity.String,
				Province:      vProvince.String,
				TotalCapacity: int(vCapacity.Int64),
			}
		}

		if oID.Valid {
			e.Organizer = &Organizer{
				ID:        int(oID.Int64),
				Name:      oName.String,
				AvatarURL: oAvatar.String,
			}
		}

		events = append(events, &e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return events, nil
}

func (r *PostgresRepository) GetAllAdmin(limit, offset int) ([]*Event, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT 
			e.id, e.venue_id, e.organizer_id, e.event_name, COALESCE(e.description, ''), e.event_start, e.event_end, 
			e.entertainment_tax_rate, e.entertainment_tax_passed_to_buyer, e.status, e.created_at, e.updated_at, 
			e.event_type_id, COALESCE(e.cover_image_url, ''),
			v.id, COALESCE(v.name, ''), COALESCE(v.address, ''), COALESCE(v.city, ''), COALESCE(v.province, ''), COALESCE(v.total_capacity, 0),
			u.id, COALESCE(up.full_name, ''), COALESCE(up.avatar_pic, '')
		FROM events e
		LEFT JOIN venues v ON e.venue_id = v.id
		LEFT JOIN users u ON e.organizer_id = u.id
		LEFT JOIN user_profiles up ON u.id = up.user_id
		ORDER BY e.created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*Event
	for rows.Next() {
		var e Event
		var eventTypeID sql.NullInt64
		var coverImageURL sql.NullString
		
		var vID sql.NullInt64
		var vName sql.NullString
		var vAddress sql.NullString
		var vCity sql.NullString
		var vProvince sql.NullString
		var vCapacity sql.NullInt64
		
		var oID sql.NullInt64
		var oName sql.NullString
		var oAvatar sql.NullString

		err := rows.Scan(
			&e.ID, &e.VenueID, &e.OrganizerID, &e.EventName, &e.Description, &e.EventStart, &e.EventEnd,
			&e.EntertainmentTaxRate, &e.EntertainmentTaxPassedToBuyer, &e.Status, &e.CreatedAt, &e.UpdatedAt,
			&eventTypeID, &coverImageURL,
			&vID, &vName, &vAddress, &vCity, &vProvince, &vCapacity,
			&oID, &oName, &oAvatar,
		)
		if err != nil {
			return nil, err
		}
		if eventTypeID.Valid {
			e.EventTypeID = int(eventTypeID.Int64)
		}
		if coverImageURL.Valid {
			e.CoverImageURL = coverImageURL.String
		}

		if vID.Valid {
			e.Venue = &Venue{
				ID:            int(vID.Int64),
				Name:          vName.String,
				Address:       vAddress.String,
				City:          vCity.String,
				Province:      vProvince.String,
				TotalCapacity: int(vCapacity.Int64),
			}
		}

		if oID.Valid {
			e.Organizer = &Organizer{
				ID:        int(oID.Int64),
				Name:      oName.String,
				AvatarURL: oAvatar.String,
			}
		}

		events = append(events, &e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return events, nil
}

func (r *PostgresRepository) GetByID(id int) (*Event, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var e Event
	var eventTypeID sql.NullInt64
	var coverImageURL sql.NullString
	var layoutID sql.NullInt64
	var publishedAt sql.NullTime

	var vID sql.NullInt64
	var vName sql.NullString
	var vAddress sql.NullString
	var vCity sql.NullString
	var vProvince sql.NullString
	var vCapacity sql.NullInt64

	var oID sql.NullInt64
	var oName sql.NullString
	var oAvatar sql.NullString

	err := r.db.QueryRowContext(ctx, `
		SELECT
			e.id, e.venue_id, e.organizer_id, e.event_name, COALESCE(e.description, ''), e.event_start, e.event_end,
			e.entertainment_tax_rate, e.entertainment_tax_passed_to_buyer, e.status, e.created_at, e.updated_at,
			e.event_type_id, COALESCE(e.cover_image_url, ''), e.layout_id,
			COALESCE(e.google_maps_url, ''), e.published_at,
			COALESCE(sales.recent_sold, 0),
			v.id, COALESCE(v.name, ''), COALESCE(v.address, ''), COALESCE(v.city, ''), COALESCE(v.province, ''), COALESCE(v.total_capacity, 0),
			u.id, COALESCE(up.full_name, ''), COALESCE(up.avatar_pic, '')
		FROM events e
		LEFT JOIN venues v ON e.venue_id = v.id
		LEFT JOIN users u ON e.organizer_id = u.id
		LEFT JOIN user_profiles up ON u.id = up.user_id
		-- Same 7-day sales window as GetAll, so the detail page's "Selling Fast"
		-- badge is driven by the figure that ranked the event on the homepage.
		-- The two must not disagree.
		LEFT JOIN (
			SELECT event_id, SUM(quantity) AS recent_sold
			FROM orders
			WHERE status = 'paid'
			  AND paid_at >= now() - interval '7 days'
			GROUP BY event_id
		) sales ON sales.event_id = e.id
		-- Archived events are invisible to the public endpoint. The organizer
		-- console uses GetOrganizerEvent (authenticated, separate route) which
		-- is intentionally not gated on archived_at so the workspace still
		-- opens for event management after archiving.
		WHERE e.id = $1 AND e.archived_at IS NULL
	`, id).Scan(
		&e.ID, &e.VenueID, &e.OrganizerID, &e.EventName, &e.Description, &e.EventStart, &e.EventEnd,
		&e.EntertainmentTaxRate, &e.EntertainmentTaxPassedToBuyer, &e.Status, &e.CreatedAt, &e.UpdatedAt,
		&eventTypeID, &coverImageURL, &layoutID, &e.GoogleMapsURL, &publishedAt, &e.RecentSales,
		&vID, &vName, &vAddress, &vCity, &vProvince, &vCapacity,
		&oID, &oName, &oAvatar,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrEventNotFound
		}
		return nil, err
	}
	if eventTypeID.Valid {
		e.EventTypeID = int(eventTypeID.Int64)
	}
	if coverImageURL.Valid {
		e.CoverImageURL = coverImageURL.String
	}
	if layoutID.Valid {
		lid := int(layoutID.Int64)
		e.LayoutID = &lid
	}
	if publishedAt.Valid {
		t := publishedAt.Time
		e.PublishedAt = &t
	}

	if vID.Valid {
		e.Venue = &Venue{
			ID:            int(vID.Int64),
			Name:          vName.String,
			Address:       vAddress.String,
			City:          vCity.String,
			Province:      vProvince.String,
			TotalCapacity: int(vCapacity.Int64),
		}
	}

	if oID.Valid {
		e.Organizer = &Organizer{
			ID:        int(oID.Int64),
			Name:      oName.String,
			AvatarURL: oAvatar.String,
		}
	}

	return &e, nil
}

func (r *PostgresRepository) Create(event *Event) error {
	var eventTypeID *int
	if event.EventTypeID > 0 {
		eventTypeID = &event.EventTypeID
	}
	if event.Status == "" {
		event.Status = "draft"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// 1. Begin Database Transaction
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() // Rollback is ignored if transaction is committed
	// 2. Insert into events table
	eventQuery := `
		INSERT INTO events (
			venue_id, organizer_id, event_name, description, event_start, event_end,
			entertainment_tax_rate, entertainment_tax_passed_to_buyer, status,
			event_type_id, cover_image_url
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at, updated_at`
	err = tx.QueryRowContext(ctx, eventQuery,
		event.VenueID, event.OrganizerID, event.EventName, event.Description, event.EventStart, event.EventEnd,
		event.EntertainmentTaxRate, event.EntertainmentTaxPassedToBuyer, event.Status,
		eventTypeID, event.CoverImageURL,
	).Scan(&event.ID, &event.CreatedAt, &event.UpdatedAt)
	if err != nil {
		return err
	}
	// 3. Grant the creator the Event Organizer role (role_id = 3) scoped to this event
	roleQuery := `
		INSERT INTO user_roles (user_id, event_id, role_id)
		VALUES ($1, $2, 3)`
	_, err = tx.ExecContext(ctx, roleQuery, event.OrganizerID, event.ID)
	if err != nil {
		return err
	}
	// 4. Commit transaction
	return tx.Commit()
}

// Update edits an existing event's core details. Guarded at the SQL level so
// a pending_review event (awaiting an approve/reject decision) can't be
// edited out from under an auditor mid-review - the WHERE clause excludes it
// atomically rather than checking-then-updating, which would race against a
// concurrent status change.
func (r *PostgresRepository) Update(event *Event) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var eventTypeID *int
	if event.EventTypeID > 0 {
		eventTypeID = &event.EventTypeID
	}

	res, err := r.db.ExecContext(ctx, `
		UPDATE events SET
			event_name = $1, description = $2, event_start = $3, event_end = $4,
			entertainment_tax_rate = $5, entertainment_tax_passed_to_buyer = $6,
			event_type_id = $7, venue_id = $8, updated_at = now()
		WHERE id = $9 AND status != 'pending_review'
	`, event.EventName, event.Description, event.EventStart, event.EventEnd,
		event.EntertainmentTaxRate, event.EntertainmentTaxPassedToBuyer,
		eventTypeID, event.VenueID, event.ID)
	if err != nil {
		return err
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected > 0 {
		return nil
	}

	var status string
	if err := r.db.QueryRowContext(ctx, `SELECT status FROM events WHERE id = $1`, event.ID).Scan(&status); err != nil {
		if err == sql.ErrNoRows {
			return ErrEventNotFound
		}
		return err
	}
	if status == "pending_review" {
		return ErrEventLocked
	}
	return ErrEventNotFound
}

// SetEventLayout binds an event to a venue layout, or unbinds it when layoutID
// is nil. A non-nil layout must belong to the event's OWN venue; that check
// lives in the WHERE clause so it can't race a concurrent venue change. A zero
// RowsAffected means either the event is gone or the layout isn't in its venue,
// which we disambiguate with a follow-up existence check.
func (r *PostgresRepository) SetEventLayout(eventID int, layoutID *int) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	res, err := r.db.ExecContext(ctx, `
		UPDATE events e SET layout_id = $1, updated_at = now()
		WHERE e.id = $2
		  AND ($1::int IS NULL OR EXISTS (
			SELECT 1 FROM venue_layouts vl
			WHERE vl.id = $1 AND vl.venue_id = e.venue_id
		  ))
	`, layoutID, eventID)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected > 0 {
		return nil
	}

	var exists bool
	if err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM events WHERE id = $1)`, eventID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrEventNotFound
	}
	return ErrLayoutVenueMismatch
}

func (r *PostgresRepository) ListVenues() ([]*Venue, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, address, city, province, COALESCE(postal_code, ''), total_capacity
		FROM venues
		ORDER BY name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var venues []*Venue
	for rows.Next() {
		var v Venue
		if err := rows.Scan(&v.ID, &v.Name, &v.Address, &v.City, &v.Province, &v.PostalCode, &v.TotalCapacity); err != nil {
			return nil, err
		}
		venues = append(venues, &v)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return venues, nil
}

func (r *PostgresRepository) ListEventTypes() ([]*EventType, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, event_type
		FROM event_types
		ORDER BY id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var eventTypes []*EventType
	for rows.Next() {
		var t EventType
		if err := rows.Scan(&t.ID, &t.EventType); err != nil {
			return nil, err
		}
		eventTypes = append(eventTypes, &t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return eventTypes, nil
}
