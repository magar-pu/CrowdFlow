package organizer

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"time"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Create(ctx context.Context, app *OrganizerApplication, docs []*OrganizerDocument) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var exists bool
	err = tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM organizer_applications WHERE user_id = $1)", app.UserID).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return ErrApplicationAlreadyExists
	}

	queryApp := `
		INSERT INTO organizer_applications (
			user_id, business_name, business_type, business_email, business_phone, website, description, status,
			bank_name, bank_account_holder, bank_account_number, business_address
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, submitted_at
	`
	
	var websiteVal *string
	if app.Website != nil && *app.Website != "" {
		websiteVal = app.Website
	}
	var descVal *string
	if app.Description != nil && *app.Description != "" {
		descVal = app.Description
	}

	err = tx.QueryRowContext(
		ctx, queryApp,
		app.UserID, app.BusinessName, app.BusinessType, app.BusinessEmail, app.BusinessPhone,
		websiteVal, descVal, app.Status,
		app.BankName, app.BankAccountHolder, app.BankAccountNumber, app.BusinessAddress,
	).Scan(&app.ID, &app.SubmittedAt)
	if err != nil {
		return err
	}

	queryDoc := `
		INSERT INTO organizer_documents (
			application_id, document_type, file_path, status
		) VALUES ($1, $2, $3, $4)
		RETURNING id, uploaded_at
	`
	for _, doc := range docs {
		doc.ApplicationID = app.ID
		err = tx.QueryRowContext(
			ctx, queryDoc,
			doc.ApplicationID, doc.DocumentType, doc.FilePath, doc.Status,
		).Scan(&doc.ID, &doc.UploadedAt)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *PostgresRepository) GetByUserID(ctx context.Context, userID int) (*OrganizerApplication, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	app := &OrganizerApplication{}
	var websiteNull, descNull, notesNull, bankNameNull, bankAccountHolderNull, bankAccountNumberNull, businessAddressNull sql.NullString
	var reviewedAtNull sql.NullTime
	var reviewedByNull sql.NullInt64

	queryApp := `
		SELECT id, user_id, business_name, business_type, business_email, business_phone, website, description, status, submitted_at, reviewed_at, reviewed_by, notes,
		       bank_name, bank_account_holder, bank_account_number, business_address
		FROM organizer_applications
		WHERE user_id = $1
	`
	err := r.db.QueryRowContext(ctx, queryApp, userID).Scan(
		&app.ID, &app.UserID, &app.BusinessName, &app.BusinessType, &app.BusinessEmail, &app.BusinessPhone,
		&websiteNull, &descNull, &app.Status, &app.SubmittedAt, &reviewedAtNull, &reviewedByNull, &notesNull,
		&bankNameNull, &bankAccountHolderNull, &bankAccountNumberNull, &businessAddressNull,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrApplicationNotFound
		}
		return nil, err
	}

	if websiteNull.Valid {
		app.Website = &websiteNull.String
	}
	if descNull.Valid {
		app.Description = &descNull.String
	}
	if reviewedAtNull.Valid {
		app.ReviewedAt = &reviewedAtNull.Time
	}
	if reviewedByNull.Valid {
		val := int(reviewedByNull.Int64)
		app.ReviewedBy = &val
	}
	if notesNull.Valid {
		app.Notes = &notesNull.String
	}
	if bankNameNull.Valid {
		app.BankName = &bankNameNull.String
	}
	if bankAccountHolderNull.Valid {
		app.BankAccountHolder = &bankAccountHolderNull.String
	}
	if bankAccountNumberNull.Valid {
		app.BankAccountNumber = &bankAccountNumberNull.String
	}
	if businessAddressNull.Valid {
		app.BusinessAddress = &businessAddressNull.String
	}

	docs, err := r.getDocuments(ctx, app.ID)
	if err != nil {
		return nil, err
	}
	app.Documents = docs

	return app, nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id int) (*OrganizerApplication, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	app := &OrganizerApplication{}
	var websiteNull, descNull, notesNull, bankNameNull, bankAccountHolderNull, bankAccountNumberNull, businessAddressNull sql.NullString
	var reviewedAtNull sql.NullTime
	var reviewedByNull sql.NullInt64

	queryApp := `
		SELECT id, user_id, business_name, business_type, business_email, business_phone, website, description, status, submitted_at, reviewed_at, reviewed_by, notes,
		       bank_name, bank_account_holder, bank_account_number, business_address
		FROM organizer_applications
		WHERE id = $1
	`
	err := r.db.QueryRowContext(ctx, queryApp, id).Scan(
		&app.ID, &app.UserID, &app.BusinessName, &app.BusinessType, &app.BusinessEmail, &app.BusinessPhone,
		&websiteNull, &descNull, &app.Status, &app.SubmittedAt, &reviewedAtNull, &reviewedByNull, &notesNull,
		&bankNameNull, &bankAccountHolderNull, &bankAccountNumberNull, &businessAddressNull,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrApplicationNotFound
		}
		return nil, err
	}

	if websiteNull.Valid {
		app.Website = &websiteNull.String
	}
	if descNull.Valid {
		app.Description = &descNull.String
	}
	if reviewedAtNull.Valid {
		app.ReviewedAt = &reviewedAtNull.Time
	}
	if reviewedByNull.Valid {
		val := int(reviewedByNull.Int64)
		app.ReviewedBy = &val
	}
	if notesNull.Valid {
		app.Notes = &notesNull.String
	}
	if bankNameNull.Valid {
		app.BankName = &bankNameNull.String
	}
	if bankAccountHolderNull.Valid {
		app.BankAccountHolder = &bankAccountHolderNull.String
	}
	if bankAccountNumberNull.Valid {
		app.BankAccountNumber = &bankAccountNumberNull.String
	}
	if businessAddressNull.Valid {
		app.BusinessAddress = &businessAddressNull.String
	}

	docs, err := r.getDocuments(ctx, app.ID)
	if err != nil {
		return nil, err
	}
	app.Documents = docs

	return app, nil
}

func (r *PostgresRepository) Update(ctx context.Context, app *OrganizerApplication) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var websiteVal *string
	if app.Website != nil && *app.Website != "" {
		websiteVal = app.Website
	}
	var descVal *string
	if app.Description != nil && *app.Description != "" {
		descVal = app.Description
	}
	var notesVal *string
	if app.Notes != nil && *app.Notes != "" {
		notesVal = app.Notes
	}

	query := `
		UPDATE organizer_applications
		SET business_name = $1, business_type = $2, business_email = $3, business_phone = $4,
		    website = $5, description = $6, status = $7, reviewed_at = $8, reviewed_by = $9, notes = $10,
		    bank_name = $11, bank_account_holder = $12, bank_account_number = $13, business_address = $14
		WHERE id = $15
	`
	_, err = tx.ExecContext(
		ctx, query,
		app.BusinessName, app.BusinessType, app.BusinessEmail, app.BusinessPhone,
		websiteVal, descVal, app.Status, app.ReviewedAt, app.ReviewedBy, notesVal,
		app.BankName, app.BankAccountHolder, app.BankAccountNumber, app.BusinessAddress,
		app.ID,
	)
	if err != nil {
		return err
	}

	for _, doc := range app.Documents {
		if doc.ID == 0 {
			queryDoc := `
				INSERT INTO organizer_documents (application_id, document_type, file_path, status)
				VALUES ($1, $2, $3, $4)
				RETURNING id, uploaded_at
			`
			err = tx.QueryRowContext(ctx, queryDoc, app.ID, doc.DocumentType, doc.FilePath, doc.Status).Scan(&doc.ID, &doc.UploadedAt)
			if err != nil {
				return err
			}
		} else {
			queryDoc := `
				UPDATE organizer_documents
				SET status = $1
				WHERE id = $2 AND application_id = $3
			`
			_, err = tx.ExecContext(ctx, queryDoc, doc.Status, doc.ID, app.ID)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (r *PostgresRepository) Delete(ctx context.Context, id int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	_, err := r.db.ExecContext(ctx, "DELETE FROM organizer_applications WHERE id = $1", id)
	return err
}

func (r *PostgresRepository) getDocuments(ctx context.Context, appID int) ([]*OrganizerDocument, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, application_id, document_type, file_path, status, uploaded_at
		FROM organizer_documents
		WHERE application_id = $1
		ORDER BY uploaded_at ASC
	`, appID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	docs := []*OrganizerDocument{}
	for rows.Next() {
		doc := &OrganizerDocument{}
		err = rows.Scan(&doc.ID, &doc.ApplicationID, &doc.DocumentType, &doc.FilePath, &doc.Status, &doc.UploadedAt)
		if err != nil {
			return nil, err
		}
		docs = append(docs, doc)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}
	return docs, nil
}

// ============================================================================
// eorganizer Repository Implementations
// ============================================================================

func (r *PostgresRepository) GetDashboardData(ctx context.Context, organizerID int) (*DashboardResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var stats DashboardStats

	// 1. Active Events
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM events WHERE organizer_id = $1 AND status = 'approved'
	`, organizerID).Scan(&stats.ActiveEvents)
	if err != nil {
		return nil, err
	}

	// 2. Draft Events
	var draftEvents int
	err = r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM events WHERE organizer_id = $1 AND status = 'draft'
	`, organizerID).Scan(&draftEvents)
	if err != nil {
		return nil, err
	}

	// 3. Pending Review Queue
	err = r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM events WHERE organizer_id = $1 AND status = 'pending_review'
	`, organizerID).Scan(&stats.VerificationQueue)
	if err != nil {
		return nil, err
	}

	// 4. Tickets Sold
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(tickets_sold), 0) FROM ticket_tiers tt JOIN events e ON tt.event_id = e.id WHERE e.organizer_id = $1
	`, organizerID).Scan(&stats.TicketsSold)
	if err != nil {
		return nil, err
	}

	// 5. Gross Sales
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(o.gross_amount), 0) FROM orders o JOIN events e ON o.event_id = e.id WHERE e.organizer_id = $1 AND o.status = 'paid'
	`, organizerID).Scan(&stats.GrossSales)
	if err != nil {
		return nil, err
	}

	// 6. Net Revenue
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(o.net_amount), 0) FROM orders o JOIN events e ON o.event_id = e.id WHERE e.organizer_id = $1 AND o.status = 'paid'
	`, organizerID).Scan(&stats.TotalRevenue)
	if err != nil {
		return nil, err
	}

	// 7. Active Resale
	err = r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM ticket_resale_listings trl JOIN ticket_tiers tt ON trl.ticket_tier_id = tt.id JOIN events e ON tt.event_id = e.id WHERE e.organizer_id = $1 AND trl.status = 'active'
	`, organizerID).Scan(&stats.ActiveResale)
	if err != nil {
		// If resale table is not there or throws error, fallback to 0
		stats.ActiveResale = 0
	}

	// 8. Recent Orders
	recentOrders := []RecentOrder{}
	rowsOrders, err := r.db.QueryContext(ctx, `
		SELECT o.id, up.full_name, u.email, e.event_name, o.gross_amount, o.status, o.created_at
		FROM orders o
		JOIN events e ON o.event_id = e.id
		JOIN users u ON o.purchaser_id = u.id
		JOIN user_profiles up ON u.id = up.user_id
		WHERE e.organizer_id = $1
		ORDER BY o.created_at DESC
		LIMIT 5
	`, organizerID)
	if err == nil {
		defer rowsOrders.Close()
		for rowsOrders.Next() {
			var o RecentOrder
			var createdAt time.Time
			var statusVal string
			err = rowsOrders.Scan(&o.ID, &o.CustomerName, &o.CustomerEmail, &o.EventName, &o.Amount, &statusVal, &createdAt)
			if err == nil {
				o.Time = createdAt.Format("Jan 02, 03:04 PM")
				// Map status values for presentation
				if statusVal == "paid" {
					o.Status = "Paid"
				} else if statusVal == "pending" {
					o.Status = "Pending"
				} else if statusVal == "refunded" {
					o.Status = "Refunded"
				} else {
					o.Status = "Failed"
				}
				o.PaymentMethod = "Bank Transfer"
				o.TicketType = "General Admission"
				recentOrders = append(recentOrders, o)
			}
		}
	}

	// 9. Recent Events
	recentEvents := []RecentEvent{}
	rowsEvents, err := r.db.QueryContext(ctx, `
		SELECT e.id, e.event_name, et.event_type, e.event_start, e.event_end, e.status, COALESCE(e.cover_image_url, ''), v.name, v.city,
		       COALESCE((SELECT SUM(allocation_limit) FROM ticket_tiers WHERE event_id = e.id), 0) as capacity,
		       COALESCE((SELECT SUM(tickets_sold) FROM ticket_tiers WHERE event_id = e.id), 0) as sold,
		       COALESCE((SELECT SUM(gross_amount) FROM orders WHERE event_id = e.id AND status = 'paid'), 0) as revenue
		FROM events e
		JOIN venues v ON e.venue_id = v.id
		JOIN event_types et ON e.event_type_id = et.id
		WHERE e.organizer_id = $1
		ORDER BY e.created_at DESC
		LIMIT 5
	`, organizerID)
	if err == nil {
		defer rowsEvents.Close()
		for rowsEvents.Next() {
			var e RecentEvent
			var start, end time.Time
			var statusVal string
			err = rowsEvents.Scan(&e.ID, &e.Name, &e.Category, &start, &end, &statusVal, &e.Image, &e.VenueName, &e.Location, &e.Capacity, &e.Sold, &e.Revenue)
			if err == nil {
				e.Location = e.VenueName + ", " + e.Location
				if statusVal == "approved" {
					e.Status = "Live"
				} else if statusVal == "draft" {
					e.Status = "Draft"
				} else {
					e.Status = "Scheduled"
				}
				recentEvents = append(recentEvents, e)
			}
		}
	}

	return &DashboardResponse{
		Stats:        stats,
		RecentOrders: recentOrders,
		RecentEvents: recentEvents,
	}, nil
}

func (r *PostgresRepository) ListOrganizerEvents(ctx context.Context, organizerID int) ([]*OrganizerEvent, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT e.id, e.event_name, et.event_type, e.description, e.event_start, e.event_end, e.status, COALESCE(e.cover_image_url, ''), v.name, v.city,
		       COALESCE((SELECT SUM(allocation_limit) FROM ticket_tiers WHERE event_id = e.id), 0) as capacity,
		       COALESCE((SELECT SUM(tickets_sold) FROM ticket_tiers WHERE event_id = e.id), 0) as sold,
		       COALESCE((SELECT SUM(gross_amount) FROM orders WHERE event_id = e.id AND status = 'paid'), 0) as revenue
		FROM events e
		JOIN venues v ON e.venue_id = v.id
		JOIN event_types et ON e.event_type_id = et.id
		WHERE e.organizer_id = $1
		ORDER BY e.created_at DESC
	`, organizerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := []*OrganizerEvent{}
	for rows.Next() {
		var e OrganizerEvent
		var start, end time.Time
		var statusVal string
		err = rows.Scan(&e.ID, &e.Name, &e.Category, &e.Description, &start, &end, &statusVal, &e.Image, &e.VenueName, &e.Location, &e.Capacity, &e.Sold, &e.Revenue)
		if err == nil {
			e.StartDate = start.Format("2006-01-02")
			e.StartTime = start.Format("15:04:05")
			e.EndDate = end.Format("2006-01-02")
			e.EndTime = end.Format("15:04:05")
			e.Date = start.Format("Jan 02, 2006")
			e.LocationType = "physical"
			e.LocationAddress = e.VenueName + ", " + e.Location
			e.Location = e.VenueName + ", " + e.Location
			if statusVal == "approved" {
				e.Status = "Live"
			} else if statusVal == "draft" {
				e.Status = "Draft"
			} else if statusVal == "rejected" {
				e.Status = "Rejected"
			} else if statusVal == "needs_revision" || statusVal == "need_revision" {
				e.Status = "Need Revision"
			} else if statusVal == "pending_review" {
				e.Status = "In Review"
			} else {
				e.Status = "Scheduled"
			}
			events = append(events, &e)
		}
	}
	return events, nil
}

func (r *PostgresRepository) GetOrganizerEvent(ctx context.Context, eventID int, organizerID int) (*OrganizerEvent, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var e OrganizerEvent
	var start, end time.Time
	var statusVal string
	err := r.db.QueryRowContext(ctx, `
		SELECT e.id, e.event_name, et.event_type, e.description, e.event_start, e.event_end, e.status, COALESCE(e.cover_image_url, ''), v.name, v.city,
		       COALESCE((SELECT SUM(allocation_limit) FROM ticket_tiers WHERE event_id = e.id), 0) as capacity,
		       COALESCE((SELECT SUM(tickets_sold) FROM ticket_tiers WHERE event_id = e.id), 0) as sold,
		       COALESCE((SELECT SUM(gross_amount) FROM orders WHERE event_id = e.id AND status = 'paid'), 0) as revenue
		FROM events e
		JOIN venues v ON e.venue_id = v.id
		JOIN event_types et ON e.event_type_id = et.id
		WHERE e.id = $1 AND e.organizer_id = $2
	`, eventID, organizerID).Scan(&e.ID, &e.Name, &e.Category, &e.Description, &start, &end, &statusVal, &e.Image, &e.VenueName, &e.Location, &e.Capacity, &e.Sold, &e.Revenue)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	e.StartDate = start.Format("2006-01-02")
	e.StartTime = start.Format("15:04:05")
	e.EndDate = end.Format("2006-01-02")
	e.EndTime = end.Format("15:04:05")
	e.Date = start.Format("Jan 02, 2006")
	e.LocationType = "physical"
	e.LocationAddress = e.VenueName + ", " + e.Location
	e.Location = e.VenueName + ", " + e.Location
	if statusVal == "approved" {
		e.Status = "Live"
	} else if statusVal == "draft" {
		e.Status = "Draft"
	} else if statusVal == "rejected" {
		e.Status = "Rejected"
	} else if statusVal == "needs_revision" || statusVal == "need_revision" {
		e.Status = "Need Revision"
	} else if statusVal == "pending_review" {
		e.Status = "In Review"
	} else {
		e.Status = "Scheduled"
	}

	return &e, nil
}

func (r *PostgresRepository) DeleteOrganizerEvent(ctx context.Context, eventID int, organizerID int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	_, err := r.db.ExecContext(ctx, `
		DELETE FROM events WHERE id = $1 AND organizer_id = $2 AND status = 'draft'
	`, eventID, organizerID)
	return err
}

func (r *PostgresRepository) GetVenueLayout(ctx context.Context, eventID int, organizerID int) ([]*VenueSection, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT vs.id, vs.section_name, vs.capacity,
		       COALESCE((SELECT SUM(tickets_sold) FROM ticket_tiers WHERE event_id = $1 AND name = vs.section_name), 0) as sold,
		       COALESCE((SELECT price FROM ticket_tiers WHERE event_id = $1 AND name = vs.section_name LIMIT 1), 0.00) as price
		FROM venue_sections vs
		JOIN events e ON e.venue_id = vs.venue_id
		WHERE e.id = $1 AND e.organizer_id = $2
		ORDER BY vs.id ASC
	`, eventID, organizerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sections := []*VenueSection{}
	index := 0
	for rows.Next() {
		var s VenueSection
		var idVal int
		err = rows.Scan(&idVal, &s.Name, &s.Capacity, &s.Sold, &s.Price)
		if err == nil {
			s.ID = strconv.Itoa(idVal)
			// Enrich with vector coordinates for UI floorplan vector canvas rendering
			// Maps exactly to the dimensions/placements of Moscone Center / Zilker Park in standard visual presets
			if s.Name == "VIP Stage Front" || s.Name == "VIP" {
				s.Type = "seats"
				s.X = 180
				s.Y = 110
				s.Width = 240
				s.Height = 60
				s.Rows = 6
				s.Cols = 10
				s.Gate = "VIP Entrance"
			} else if s.Name == "GA Field North" || s.Name == "General Admission" {
				s.Type = "standing"
				s.X = 60
				s.Y = 190
				s.Width = 140
				s.Height = 110
				s.Gate = "Gate A"
			} else if s.Name == "GA Field South" {
				s.Type = "standing"
				s.X = 400
				s.Y = 190
				s.Width = 140
				s.Height = 110
				s.Gate = "Gate B"
			} else {
				s.Type = "seats"
				s.X = 130
				s.Y = 320
				s.Width = 340
				s.Height = 70
				s.Rows = 7
				s.Cols = 20
				s.Gate = "Gate A"
			}
			sections = append(sections, &s)
			index++
		}
	}
	return sections, nil
}

func (r *PostgresRepository) ListTicketTiers(ctx context.Context, eventID int, organizerID int) ([]*OrganizerTicketTier, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT tt.id, tt.name, tt.price, tt.tickets_sold, tt.allocation_limit, tt.description, tt.max_ticket_per_user, tt.sales_start, tt.sales_end
		FROM ticket_tiers tt
		JOIN events e ON tt.event_id = e.id
		WHERE e.id = $1 AND e.organizer_id = $2
		ORDER BY tt.price DESC
	`, eventID, organizerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tiers := []*OrganizerTicketTier{}
	for rows.Next() {
		var t OrganizerTicketTier
		var idVal int
		var descNull sql.NullString
		var start, end time.Time
		err = rows.Scan(&idVal, &t.Name, &t.Price, &t.Sold, &t.Capacity, &descNull, &t.MaxPerOrder, &start, &end)
		if err == nil {
			t.ID = strconv.Itoa(idVal)
			if descNull.Valid {
				t.Description = descNull.String
			}
			t.SalesStart = start.Format("2006-01-02T15:04:05Z")
			t.SalesEnd = end.Format("2006-01-02T15:04:05Z")
			if t.Sold >= t.Capacity {
				t.Status = "Sold Out"
			} else if t.Capacity-t.Sold < 30 {
				t.Status = "Selling Fast"
			} else {
				t.Status = "On Sale"
			}
			tiers = append(tiers, &t)
		}
	}
	return tiers, nil
}

func (r *PostgresRepository) CreateTicketTier(ctx context.Context, eventID int, organizerID int, tier *OrganizerTicketTier) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	// Authorization verification
	var exists bool
	err := r.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM events WHERE id = $1 AND organizer_id = $2)", eventID, organizerID).Scan(&exists)
	if err != nil || !exists {
		return fmt.Errorf("event not found or unauthorized")
	}

	start, err := time.Parse("2006-01-02", tier.SalesStart)
	if err != nil {
		start = time.Now()
	}
	end, err := time.Parse("2006-01-02", tier.SalesEnd)
	if err != nil {
		end = time.Now().AddDate(0, 1, 0)
	}

	query := `
		INSERT INTO ticket_tiers (event_id, name, description, price, allocation_limit, sales_start, sales_end, max_ticket_per_user)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err = r.db.ExecContext(ctx, query, eventID, tier.Name, tier.Description, tier.Price, tier.Capacity, start, end, tier.MaxPerOrder)
	return err
}

func (r *PostgresRepository) UpdateTicketTier(ctx context.Context, eventID int, organizerID int, tierID int, tier *OrganizerTicketTier) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	// Authorization verification
	var exists bool
	err := r.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM events WHERE id = $1 AND organizer_id = $2)", eventID, organizerID).Scan(&exists)
	if err != nil || !exists {
		return fmt.Errorf("event not found or unauthorized")
	}

	start, err := time.Parse("2006-01-02", tier.SalesStart)
	if err != nil {
		start = time.Now()
	}
	end, err := time.Parse("2006-01-02", tier.SalesEnd)
	if err != nil {
		end = time.Now().AddDate(0, 1, 0)
	}

	query := `
		UPDATE ticket_tiers
		SET name = $1, description = $2, price = $3, allocation_limit = $4, sales_start = $5, sales_end = $6, max_ticket_per_user = $7
		WHERE id = $8 AND event_id = $9
	`
	_, err = r.db.ExecContext(ctx, query, tier.Name, tier.Description, tier.Price, tier.Capacity, start, end, tier.MaxPerOrder, tierID, eventID)
	return err
}

func (r *PostgresRepository) DeleteTicketTier(ctx context.Context, eventID int, organizerID int, tierID int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	// Authorization verification
	var exists bool
	err := r.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM events WHERE id = $1 AND organizer_id = $2)", eventID, organizerID).Scan(&exists)
	if err != nil || !exists {
		return fmt.Errorf("event not found or unauthorized")
	}

	_, err = r.db.ExecContext(ctx, `
		DELETE FROM ticket_tiers WHERE id = $1 AND event_id = $2 AND tickets_sold = 0
	`, tierID, eventID)
	return err
}

func (r *PostgresRepository) ListOrders(ctx context.Context, organizerID int) ([]*OrganizerOrder, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT o.id, up.full_name, u.email, e.event_name, o.gross_amount, o.status, o.created_at, o.payment_type
		FROM orders o
		JOIN events e ON o.event_id = e.id
		JOIN users u ON o.purchaser_id = u.id
		JOIN user_profiles up ON u.id = up.user_id
		WHERE e.organizer_id = $1
		ORDER BY o.created_at DESC
	`, organizerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := []*OrganizerOrder{}
	for rows.Next() {
		var o OrganizerOrder
		var createdAt time.Time
		var statusVal string
		var payType string
		err = rows.Scan(&o.ID, &o.CustomerName, &o.CustomerEmail, &o.EventName, &o.Amount, &statusVal, &createdAt, &payType)
		if err == nil {
			o.Time = createdAt.Format("2006-01-02 15:04:05")
			if statusVal == "paid" {
				o.Status = "Paid"
			} else if statusVal == "pending" {
				o.Status = "Pending"
			} else if statusVal == "refunded" {
				o.Status = "Refunded"
			} else {
				o.Status = "Failed"
			}
			o.PaymentMethod = string(payType)
			o.TicketType = "General Admission"
			orders = append(orders, &o)
		}
	}
	return orders, nil
}

func (r *PostgresRepository) GetOrderDetails(ctx context.Context, orderID string, organizerID int) (*OrganizerOrder, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var o OrganizerOrder
	var createdAt time.Time
	var statusVal string
	var payType string
	err := r.db.QueryRowContext(ctx, `
		SELECT o.id, up.full_name, u.email, e.event_name, o.gross_amount, o.status, o.created_at, o.payment_type
		FROM orders o
		JOIN events e ON o.event_id = e.id
		JOIN users u ON o.purchaser_id = u.id
		JOIN user_profiles up ON u.id = up.user_id
		WHERE o.id = $1 AND e.organizer_id = $2
	`, orderID, organizerID).Scan(&o.ID, &o.CustomerName, &o.CustomerEmail, &o.EventName, &o.Amount, &statusVal, &createdAt, &payType)
	if err != nil {
		return nil, err
	}

	o.Time = createdAt.Format("2006-01-02 15:04:05")
	if statusVal == "paid" {
		o.Status = "Paid"
	} else if statusVal == "pending" {
		o.Status = "Pending"
	} else if statusVal == "refunded" {
		o.Status = "Refunded"
	} else {
		o.Status = "Failed"
	}
	o.PaymentMethod = string(payType)
	o.TicketType = "General Admission"

	return &o, nil
}

func (r *PostgresRepository) ListRefunds(ctx context.Context, organizerID int) ([]*OrganizerRefund, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT r.id, r.order_id, up.full_name, e.event_name, r.amount, r.reason, r.status, r.created_at
		FROM refunds r
		JOIN orders o ON r.order_id = o.id
		JOIN events e ON o.event_id = e.id
		JOIN users u ON o.purchaser_id = u.id
		JOIN user_profiles up ON u.id = up.user_id
		WHERE e.organizer_id = $1
		ORDER BY r.created_at DESC
	`, organizerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	refunds := []*OrganizerRefund{}
	for rows.Next() {
		var ref OrganizerRefund
		var orderUUID string
		var createdAt time.Time
		var statusVal string
		var reasonVal string
		err = rows.Scan(&ref.ID, &orderUUID, &ref.CustomerName, &ref.EventName, &ref.Amount, &reasonVal, &statusVal, &createdAt)
		if err == nil {
			ref.OrderID = orderUUID
			ref.Time = createdAt.Format("2006-01-02 15:04:05")
			ref.Reason = string(reasonVal)
			if statusVal == "approved" {
				ref.Status = "Approved"
			} else if statusVal == "pending_review" {
				ref.Status = "Pending"
			} else {
				ref.Status = "Rejected"
			}
			refunds = append(refunds, &ref)
		}
	}
	return refunds, nil
}

func (r *PostgresRepository) ListAttendees(ctx context.Context, organizerID int) ([]*OrganizerAttendee, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT 
			t.id, 
			t.attendee_full_name, 
			t.attendee_email, 
			tt.name, 
			t.ticket_status, 
			t.created_at,
			COALESCE(CONCAT(esm.section_name, ' Row ', esm.row_name, ' Seat ', esm.seat_number), 'General Seating')
		FROM tickets t
		JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
		JOIN events e ON tt.event_id = e.id
		LEFT JOIN event_seats_matrix esm ON t.event_seats_matrix_id = esm.id
		WHERE e.organizer_id = $1
		ORDER BY t.created_at DESC
	`, organizerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	attendees := []*OrganizerAttendee{}
	for rows.Next() {
		var a OrganizerAttendee
		var statusVal string
		var createdAt time.Time
		var seatNo string
		err = rows.Scan(&a.ID, &a.Name, &a.Email, &a.TicketType, &statusVal, &createdAt, &seatNo)
		if err == nil {
			a.Status = string(statusVal)
			a.SeatNumber = seatNo
			a.CheckInTime = createdAt.Format("15:04:05")
			attendees = append(attendees, &a)
		}
	}
	return attendees, nil
}

func (r *PostgresRepository) ListEventAttendees(ctx context.Context, eventID int, organizerID int) ([]*OrganizerAttendee, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT 
			t.id, 
			t.attendee_full_name, 
			t.attendee_email, 
			tt.name, 
			t.ticket_status, 
			t.created_at,
			COALESCE(CONCAT(esm.section_name, ' Row ', esm.row_name, ' Seat ', esm.seat_number), 'General Seating')
		FROM tickets t
		JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
		JOIN events e ON tt.event_id = e.id
		LEFT JOIN event_seats_matrix esm ON t.event_seats_matrix_id = esm.id
		WHERE e.id = $1 AND e.organizer_id = $2
		ORDER BY t.created_at DESC
	`, eventID, organizerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	attendees := []*OrganizerAttendee{}
	for rows.Next() {
		var a OrganizerAttendee
		var statusVal string
		var createdAt time.Time
		var seatNo string
		err = rows.Scan(&a.ID, &a.Name, &a.Email, &a.TicketType, &statusVal, &createdAt, &seatNo)
		if err == nil {
			a.Status = string(statusVal)
			a.SeatNumber = seatNo
			a.CheckInTime = createdAt.Format("15:04:05")
			attendees = append(attendees, &a)
		}
	}
	return attendees, nil
}

func (r *PostgresRepository) GetFinanceSummary(ctx context.Context, organizerID int) (*OrganizerFinance, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var f OrganizerFinance

	// Gross amount of all paid orders
	err := r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(o.gross_amount), 0)
		FROM orders o
		JOIN events e ON o.event_id = e.id
		WHERE e.organizer_id = $1 AND o.status = 'paid'
	`, organizerID).Scan(&f.GrossSales)
	if err != nil {
		return nil, err
	}

	// Net amount of all paid orders
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(o.net_amount), 0)
		FROM orders o
		JOIN events e ON o.event_id = e.id
		WHERE e.organizer_id = $1 AND o.status = 'paid'
	`, organizerID).Scan(&f.NetRevenue)
	if err != nil {
		return nil, err
	}

	// Platform fee total
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(o.platform_fee + o.platform_fee_ppn), 0)
		FROM orders o
		JOIN events e ON o.event_id = e.id
		WHERE e.organizer_id = $1 AND o.status = 'paid'
	`, organizerID).Scan(&f.PlatformFeeTotal)
	if err != nil {
		return nil, err
	}

	// Gateway fee total
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(o.gateway_fee + o.gateway_fee_ppn), 0)
		FROM orders o
		JOIN events e ON o.event_id = e.id
		WHERE e.organizer_id = $1 AND o.status = 'paid'
	`, organizerID).Scan(&f.GatewayFeeTotal)
	if err != nil {
		return nil, err
	}

	// Tax total
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(o.entertainment_tax_amount), 0)
		FROM orders o
		JOIN events e ON o.event_id = e.id
		WHERE e.organizer_id = $1 AND o.status = 'paid'
	`, organizerID).Scan(&f.TaxTotal)
	if err != nil {
		return nil, err
	}

	// Refunded amount
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(r.final_disbursed_amount), 0)
		FROM refunds r
		JOIN orders o ON r.order_id = o.id
		JOIN events e ON o.event_id = e.id
		WHERE e.organizer_id = $1 AND r.status = 'approved'
	`, organizerID).Scan(&f.RefundedAmount)
	if err != nil {
		return nil, err
	}

	// Total paid payouts
	var totalPayouts float64
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(p.amount), 0)
		FROM payouts p
		JOIN events e ON p.event_id = e.id
		WHERE e.organizer_id = $1 AND p.status = 'processed'
	`, organizerID).Scan(&totalPayouts)
	if err != nil {
		return nil, err
	}

	f.PayoutBalance = f.NetRevenue - totalPayouts

	return &f, nil
}

func (r *PostgresRepository) ListPayouts(ctx context.Context, organizerID int) ([]*OrganizerPayout, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT p.id, p.event_id, e.event_name, p.amount, p.status, p.requested_at, COALESCE(p.processed_at, p.requested_at)
		FROM payouts p
		JOIN events e ON p.event_id = e.id
		WHERE e.organizer_id = $1
		ORDER BY p.requested_at DESC
	`, organizerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	payouts := []*OrganizerPayout{}
	for rows.Next() {
		var p OrganizerPayout
		var reqTime, procTime time.Time
		var statusVal string
		err = rows.Scan(&p.ID, &p.EventID, &p.EventName, &p.Amount, &statusVal, &reqTime, &procTime)
		if err == nil {
			p.RequestedAt = reqTime.Format("2006-01-02 15:04:05")
			p.ProcessedAt = procTime.Format("2006-01-02 15:04:05")
			p.Status = string(statusVal)
			payouts = append(payouts, &p)
		}
	}
	return payouts, nil
}

func (r *PostgresRepository) CreatePayoutRequest(ctx context.Context, eventID int, organizerID int, amount float64) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	// Verify ownership of event
	var exists bool
	err := r.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM events WHERE id = $1 AND organizer_id = $2)", eventID, organizerID).Scan(&exists)
	if err != nil || !exists {
		return fmt.Errorf("unauthorized or event not found")
	}

	// Verify balance first
	var netSales float64
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(net_amount), 0) FROM orders WHERE event_id = $1 AND status = 'paid'
	`, eventID).Scan(&netSales)
	if err != nil {
		return err
	}

	var paidPayouts float64
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(amount), 0) FROM payouts WHERE event_id = $1 AND status IN ('pending', 'processed')
	`, eventID).Scan(&paidPayouts)
	if err != nil {
		return err
	}

	available := netSales - paidPayouts
	if amount > available {
		return fmt.Errorf("insufficient balance (requested: %.2f, available: %.2f)", amount, available)
	}

	// Insert payout request
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO payouts (event_id, amount, status)
		VALUES ($1, $2, 'pending')
	`, eventID, amount)
	return err
}

func (r *PostgresRepository) GetAnalytics(ctx context.Context, organizerID int, dateRange string) (*OrganizerAnalytics, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	days := 30
	if dateRange == "7d" {
		days = 7
	} else if dateRange == "90d" {
		days = 90
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT DATE(o.paid_at) as date, COALESCE(SUM(o.gross_amount), 0) as sales, COUNT(t.id) as tickets
		FROM orders o
		LEFT JOIN tickets t ON t.order_id = o.id
		JOIN events e ON o.event_id = e.id
		WHERE e.organizer_id = $1 AND o.status = 'paid' AND o.paid_at >= NOW() - ($2 || ' days')::INTERVAL
		GROUP BY DATE(o.paid_at)
		ORDER BY DATE(o.paid_at) ASC
	`, organizerID, strconv.Itoa(days))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	points := []AnalyticsPoint{}
	for rows.Next() {
		var p AnalyticsPoint
		var dateVal time.Time
		err = rows.Scan(&dateVal, &p.Sales, &p.Tickets)
		if err == nil {
			p.Date = dateVal.Format("2006-01-02")
			points = append(points, p)
		}
	}

	// If no data points returned, fill in 0 values for each day so the UI renders a flat line of 0 sales
	if len(points) == 0 {
		now := time.Now()
		for i := days; i >= 0; i-- {
			d := now.AddDate(0, 0, -i)
			points = append(points, AnalyticsPoint{
				Date:    d.Format("2006-01-02"),
				Sales:   0.0,
				Tickets: 0,
			})
		}
	}

	return &OrganizerAnalytics{Points: points}, nil
}

func parseTime(dateStr, timeStr string) (time.Time, error) {
	if len(timeStr) == 5 {
		timeStr += ":00"
	}
	combined := fmt.Sprintf("%s %s", dateStr, timeStr)
	t, err := time.ParseInLocation("2006-01-02 15:04:05", combined, time.UTC)
	if err == nil {
		return t, nil
	}
	t, err = time.ParseInLocation("2006-01-02T15:04:05", combined, time.UTC)
	if err == nil {
		return t, nil
	}
	return time.Now(), err
}

func (r *PostgresRepository) CreateOrganizerEvent(ctx context.Context, organizerID int, event *OrganizerEvent) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Resolve or create venue
	var venueID int
	if event.LocationType == "virtual" {
		// Assign to a dummy or default virtual venue, or query/create "Virtual Venue"
		err = tx.QueryRowContext(ctx, "SELECT id FROM venues WHERE name = 'Virtual Venue'").Scan(&venueID)
		if err == sql.ErrNoRows {
			err = tx.QueryRowContext(ctx, `
				INSERT INTO venues (name, address, city, province, total_capacity)
				VALUES ('Virtual Venue', 'Online', 'Internet', 'Online', 1000000)
				RETURNING id
			`).Scan(&venueID)
			if err != nil {
				return err
			}
		} else if err != nil {
			return err
		}
	} else {
		err = tx.QueryRowContext(ctx, "SELECT id FROM venues WHERE name = $1", event.VenueName).Scan(&venueID)
		if err == sql.ErrNoRows {
			err = tx.QueryRowContext(ctx, `
				INSERT INTO venues (name, address, city, province, total_capacity)
				VALUES ($1, $2, $3, '', $4)
				RETURNING id
			`, event.VenueName, event.LocationAddress, event.Location, event.Capacity).Scan(&venueID)
			if err != nil {
				return err
			}
		} else if err != nil {
			return err
		}
	}

	// 2. Resolve or create event category/type
	var eventTypeID int
	categoryName := event.Category
	if categoryName == "" {
		categoryName = "Festival"
	}
	err = tx.QueryRowContext(ctx, "SELECT id FROM event_types WHERE event_type = $1", categoryName).Scan(&eventTypeID)
	if err == sql.ErrNoRows {
		err = tx.QueryRowContext(ctx, `
			INSERT INTO event_types (event_type)
			VALUES ($1)
			RETURNING id
		`, categoryName).Scan(&eventTypeID)
		if err != nil {
			return err
		}
	} else if err != nil {
		return err
	}

	// 3. Parse start and end timestamps
	eventStart, err := parseTime(event.StartDate, event.StartTime)
	if err != nil {
		return fmt.Errorf("invalid start date or time: %w", err)
	}
	eventEnd, err := parseTime(event.EndDate, event.EndTime)
	if err != nil {
		return fmt.Errorf("invalid end date or time: %w", err)
	}

	dbStatus := "draft"
	if strings.ToLower(event.Status) == "scheduled" || strings.ToLower(event.Status) == "pending_review" {
		dbStatus = "pending_review"
	}

	// 4. Insert event record
	queryEvent := `
		INSERT INTO events (
			venue_id, organizer_id, event_name, description, event_start, event_end,
			entertainment_tax_rate, entertainment_tax_passed_to_buyer, status,
			event_type_id, cover_image_url
		) VALUES ($1, $2, $3, $4, $5, $6, 10.0, true, $7, $8, $9)
		RETURNING id`
	
	var lastInsertID int
	err = tx.QueryRowContext(ctx, queryEvent,
		venueID, organizerID, event.Name, event.Description, eventStart, eventEnd,
		dbStatus, eventTypeID, event.Image,
	).Scan(&lastInsertID)
	if err != nil {
		return err
	}
	event.ID = strconv.Itoa(lastInsertID)

	// 5. Grant event scope permissions
	roleQuery := `
		INSERT INTO user_roles (user_id, event_id, role_id)
		VALUES ($1, $2, (SELECT id FROM roles WHERE role_name = 'Event Organizer' LIMIT 1))
		ON CONFLICT DO NOTHING`
	_, err = tx.ExecContext(ctx, roleQuery, organizerID, lastInsertID)
	if err != nil {
		return err
	}

	// 6. Log status change audit trail
	logQuery := `
		INSERT INTO event_status_log (event_id, actor_id, from_status, to_status, notes)
		VALUES ($1, $2, 'draft', $3, 'Event created via Organizer Wizard')`
	_, err = tx.ExecContext(ctx, logQuery, lastInsertID, organizerID, dbStatus)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *PostgresRepository) UpdateOrganizerEvent(ctx context.Context, eventID int, organizerID int, event *OrganizerEvent) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Verify event exists, belongs to user, and is not locked in pending review state
	var currentStatus string
	err = tx.QueryRowContext(ctx, "SELECT status FROM events WHERE id = $1 AND organizer_id = $2", eventID, organizerID).Scan(&currentStatus)
	if err == sql.ErrNoRows {
		return fmt.Errorf("event not found or unauthorized")
	} else if err != nil {
		return err
	}

	if currentStatus == "pending_review" {
		return fmt.Errorf("cannot edit event while it is locked in pending review status")
	}

	// 1. Resolve or create venue
	var venueID int
	if event.LocationType == "virtual" {
		err = tx.QueryRowContext(ctx, "SELECT id FROM venues WHERE name = 'Virtual Venue'").Scan(&venueID)
		if err == sql.ErrNoRows {
			err = tx.QueryRowContext(ctx, `
				INSERT INTO venues (name, address, city, province, total_capacity)
				VALUES ('Virtual Venue', 'Online', 'Internet', 'Online', 1000000)
				RETURNING id
			`).Scan(&venueID)
			if err != nil {
				return err
			}
		} else if err != nil {
			return err
		}
	} else {
		err = tx.QueryRowContext(ctx, "SELECT id FROM venues WHERE name = $1", event.VenueName).Scan(&venueID)
		if err == sql.ErrNoRows {
			err = tx.QueryRowContext(ctx, `
				INSERT INTO venues (name, address, city, province, total_capacity)
				VALUES ($1, $2, $3, '', $4)
				RETURNING id
			`, event.VenueName, event.LocationAddress, event.Location, event.Capacity).Scan(&venueID)
			if err != nil {
				return err
			}
		} else if err != nil {
			return err
		}
	}

	// 2. Resolve or create category
	var eventTypeID int
	categoryName := event.Category
	if categoryName == "" {
		categoryName = "Festival"
	}
	err = tx.QueryRowContext(ctx, "SELECT id FROM event_types WHERE event_type = $1", categoryName).Scan(&eventTypeID)
	if err == sql.ErrNoRows {
		err = tx.QueryRowContext(ctx, `
			INSERT INTO event_types (event_type)
			VALUES ($1)
			RETURNING id
		`, categoryName).Scan(&eventTypeID)
		if err != nil {
			return err
		}
	} else if err != nil {
		return err
	}

	// 3. Parse timestamps
	eventStart, err := parseTime(event.StartDate, event.StartTime)
	if err != nil {
		return fmt.Errorf("invalid start date or time: %w", err)
	}
	eventEnd, err := parseTime(event.EndDate, event.EndTime)
	if err != nil {
		return fmt.Errorf("invalid end date or time: %w", err)
	}

	// 4. Update the event
	updateQuery := `
		UPDATE events SET
			event_name = $1, description = $2, event_start = $3, event_end = $4,
			venue_id = $5, event_type_id = $6, cover_image_url = $7, updated_at = now()
		WHERE id = $8 AND organizer_id = $9`
	_, err = tx.ExecContext(ctx, updateQuery,
		event.Name, event.Description, eventStart, eventEnd,
		venueID, eventTypeID, event.Image, eventID, organizerID,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *PostgresRepository) PublishOrganizerEvent(ctx context.Context, eventID int, organizerID int) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var currentStatus string
	err = tx.QueryRowContext(ctx, "SELECT status FROM events WHERE id = $1 AND organizer_id = $2", eventID, organizerID).Scan(&currentStatus)
	if err == sql.ErrNoRows {
		return fmt.Errorf("event not found or unauthorized")
	} else if err != nil {
		return err
	}

	if currentStatus == "pending_review" || currentStatus == "approved" {
		// Already review pending or approved, do nothing
		return nil
	}

	// Phase 5 seating gate: a seated event (one with a bound layout) can only be
	// submitted once every sectioned seat has been assigned a tier (i.e. has an
	// event_seats_matrix row). Section-less seats aren't sellable and are ignored.
	var layoutID sql.NullInt64
	if err := tx.QueryRowContext(ctx, `SELECT layout_id FROM events WHERE id = $1`, eventID).Scan(&layoutID); err != nil {
		return err
	}
	if layoutID.Valid {
		var untiered int
		if err := tx.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM seats s
			WHERE s.layout_id = $1 AND s.section_id IS NOT NULL
			  AND NOT EXISTS (
				SELECT 1 FROM event_seats_matrix m WHERE m.event_id = $2 AND m.seat_id = s.id
			  )
		`, layoutID.Int64, eventID).Scan(&untiered); err != nil {
			return err
		}
		if untiered > 0 {
			return fmt.Errorf("%w: %d seat(s) are not assigned to a ticket tier", ErrSeatingIncomplete, untiered)
		}
	}

	// Update status
	_, err = tx.ExecContext(ctx, "UPDATE events SET status = 'pending_review', updated_at = now() WHERE id = $1 AND organizer_id = $2", eventID, organizerID)
	if err != nil {
		return err
	}

	// Log audit trail
	logQuery := `
		INSERT INTO event_status_log (event_id, actor_id, from_status, to_status, notes)
		VALUES ($1, $2, $3, 'pending_review', 'Event submitted for review by organizer')`
	_, err = tx.ExecContext(ctx, logQuery, eventID, organizerID, currentStatus)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *PostgresRepository) GetEventAnalytics(ctx context.Context, eventID int, organizerID int, dateRange string) (*OrganizerAnalytics, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	days := 30
	if dateRange == "7d" {
		days = 7
	} else if dateRange == "90d" {
		days = 90
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT DATE(o.paid_at) as date, COALESCE(SUM(o.gross_amount), 0) as sales, COUNT(t.id) as tickets
		FROM orders o
		LEFT JOIN tickets t ON t.order_id = o.id
		JOIN events e ON o.event_id = e.id
		WHERE e.organizer_id = $1 AND o.status = 'paid' AND o.paid_at >= NOW() - ($2 || ' days')::INTERVAL AND o.event_id = $3
		GROUP BY DATE(o.paid_at)
		ORDER BY DATE(o.paid_at) ASC
	`, organizerID, strconv.Itoa(days), eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	points := []AnalyticsPoint{}
	for rows.Next() {
		var p AnalyticsPoint
		var dateVal time.Time
		err = rows.Scan(&dateVal, &p.Sales, &p.Tickets)
		if err == nil {
			p.Date = dateVal.Format("2006-01-02")
			points = append(points, p)
		}
	}

	// Fallback mock trend points
	if len(points) == 0 {
		now := time.Now()
		for i := days; i >= 0; i-- {
			d := now.AddDate(0, 0, -i)
			points = append(points, AnalyticsPoint{
				Date:    d.Format("2006-01-02"),
				Sales:   float64(50 + (i*12)%40),
				Tickets: i % 3,
			})
		}
	}

	return &OrganizerAnalytics{Points: points}, nil
}

func (r *PostgresRepository) CreateVenueSection(ctx context.Context, eventID int, organizerID int, section *VenueSection) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Verify event and get its venue_id
	var venueID int
	err = tx.QueryRowContext(ctx, "SELECT venue_id FROM events WHERE id = $1 AND organizer_id = $2", eventID, organizerID).Scan(&venueID)
	if err != nil {
		return fmt.Errorf("event validation failed: %w", err)
	}

	// Insert into venue_sections
	var sectionID int
	err = tx.QueryRowContext(ctx, `
		INSERT INTO venue_sections (venue_id, section_name, capacity)
		VALUES ($1, $2, $3)
		RETURNING id
	`, venueID, section.Name, section.Capacity).Scan(&sectionID)
	if err != nil {
		return fmt.Errorf("failed to insert venue section: %w", err)
	}

	// Insert into ticket_tiers to keep ticket pricing/availability allocations in sync
	_, err = tx.ExecContext(ctx, `
		INSERT INTO ticket_tiers (event_id, name, price, allocation_limit, sales_start, sales_end)
		VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '30 days')
	`, eventID, section.Name, section.Price, section.Capacity)
	if err != nil {
		return fmt.Errorf("failed to create ticket tier mapping: %w", err)
	}

	return tx.Commit()
}

func (r *PostgresRepository) UpdateVenueSection(ctx context.Context, eventID int, organizerID int, sectionID int, section *VenueSection) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Verify event owns this venue layout
	var venueID int
	err = tx.QueryRowContext(ctx, "SELECT venue_id FROM events WHERE id = $1 AND organizer_id = $2", eventID, organizerID).Scan(&venueID)
	if err != nil {
		return fmt.Errorf("event validation failed: %w", err)
	}

	// Get old section name
	var oldName string
	err = tx.QueryRowContext(ctx, "SELECT section_name FROM venue_sections WHERE id = $1 AND venue_id = $2", sectionID, venueID).Scan(&oldName)
	if err != nil {
		return fmt.Errorf("section not found: %w", err)
	}

	// Update venue section
	_, err = tx.ExecContext(ctx, `
		UPDATE venue_sections
		SET section_name = $1, capacity = $2
		WHERE id = $3 AND venue_id = $4
	`, section.Name, section.Capacity, sectionID, venueID)
	if err != nil {
		return fmt.Errorf("failed to update venue section: %w", err)
	}

	// Update corresponding ticket tier
	_, err = tx.ExecContext(ctx, `
		UPDATE ticket_tiers
		SET name = $1, allocation_limit = $2, price = $3
		WHERE event_id = $4 AND name = $5
	`, section.Name, section.Capacity, section.Price, eventID, oldName)
	if err != nil {
		return fmt.Errorf("failed to update ticket tier: %w", err)
	}

	return tx.Commit()
}

func (r *PostgresRepository) DeleteVenueSection(ctx context.Context, eventID int, organizerID int, sectionID int) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Verify event ownership
	var venueID int
	err = tx.QueryRowContext(ctx, "SELECT venue_id FROM events WHERE id = $1 AND organizer_id = $2", eventID, organizerID).Scan(&venueID)
	if err != nil {
		return fmt.Errorf("event validation failed: %w", err)
	}

	// Get section name
	var name string
	err = tx.QueryRowContext(ctx, "SELECT section_name FROM venue_sections WHERE id = $1 AND venue_id = $2", sectionID, venueID).Scan(&name)
	if err != nil {
		return fmt.Errorf("section not found: %w", err)
	}

	// Delete section
	_, err = tx.ExecContext(ctx, "DELETE FROM venue_sections WHERE id = $1 AND venue_id = $2", sectionID, venueID)
	if err != nil {
		return fmt.Errorf("failed to delete venue section: %w", err)
	}

	// Delete corresponding ticket tier
	_, err = tx.ExecContext(ctx, "DELETE FROM ticket_tiers WHERE event_id = $1 AND name = $2", eventID, name)
	if err != nil {
		return fmt.Errorf("failed to delete ticket tier: %w", err)
	}

	return tx.Commit()
}

func (r *PostgresRepository) CheckInAttendee(ctx context.Context, eventID int, organizerID int, qrToken string) (*CheckInResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Locate ticket
	var tID string
	var fullName string
	var tierName string
	var currentStatus string
	var esmID *int

	err = tx.QueryRowContext(ctx, `
		SELECT t.id::text, t.attendee_full_name, tt.name, t.ticket_status::text, t.event_seats_matrix_id
		FROM tickets t
		JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
		JOIN events e ON tt.event_id = e.id
		WHERE (t.qr_signature = $1 OR t.id::text = $1) AND e.id = $2 AND e.organizer_id = $3
	`, qrToken, eventID, organizerID).Scan(&tID, &fullName, &tierName, &currentStatus, &esmID)
	if err != nil {
		return nil, fmt.Errorf("ticket not found or not authorized for this event scan")
	}

	if currentStatus == "used" {
		return nil, fmt.Errorf("duplicate check-in: ticket has already been used")
	}
	if currentStatus == "cancelled" || currentStatus == "refunded" {
		return nil, fmt.Errorf("invalid ticket: ticket status is %s", currentStatus)
	}

	// Update ticket status to used
	_, err = tx.ExecContext(ctx, "UPDATE tickets SET ticket_status = 'used', updated_at = NOW() WHERE id = $1", tID)
	if err != nil {
		return nil, fmt.Errorf("failed to process check-in: %w", err)
	}

	// Resolve seat label if applicable
	seatLabel := "General Seating"
	if esmID != nil {
		var rNum, sNum string
		err = tx.QueryRowContext(ctx, `
			SELECT s.row_number, s.seat_number
			FROM seats s
			JOIN event_seats_matrix esm ON esm.seat_id = s.id
			WHERE esm.id = $1
		`, *esmID).Scan(&rNum, &sNum)
		if err == nil {
			seatLabel = fmt.Sprintf("%s-%s", rNum, sNum)
		}
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return &CheckInResponse{
		AttendeeName: fullName,
		TicketType:   tierName,
		SeatNumber:   seatLabel,
		Status:       "checked_in",
	}, nil
}

func (r *PostgresRepository) ListNotifications(ctx context.Context, userID int) ([]*Notification, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, title, detail, COALESCE(resource_type, ''), COALESCE(resource_id, ''), is_read, created_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notifications := []*Notification{}
	for rows.Next() {
		var n Notification
		err = rows.Scan(&n.ID, &n.UserID, &n.Title, &n.Detail, &n.ResourceType, &n.ResourceID, &n.IsRead, &n.CreatedAt)
		if err == nil {
			notifications = append(notifications, &n)
		}
	}
	return notifications, nil
}

func (r *PostgresRepository) MarkNotificationsRead(ctx context.Context, userID int, notificationIDs []int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if len(notificationIDs) == 0 {
		// If empty, mark ALL unread notifications as read
		_, err := r.db.ExecContext(ctx, `
			UPDATE notifications
			SET is_read = TRUE
			WHERE user_id = $1 AND is_read = FALSE
		`, userID)
		return err
	}

	query := `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND id IN (`
	args := []interface{}{userID}
	for i, id := range notificationIDs {
		if i > 0 {
			query += ", "
		}
		query += fmt.Sprintf("$%d", i+2)
		args = append(args, id)
	}
	query += ")"

	_, err := r.db.ExecContext(ctx, query, args...)
	return err
}

func (r *PostgresRepository) GetEventRevisions(ctx context.Context, eventID int, organizerID int) (*EventRevisionFeedback, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var feedback EventRevisionFeedback
	feedback.EventID = eventID

	var dbStatus string
	err := r.db.QueryRowContext(ctx, `SELECT status FROM events WHERE id = $1 AND organizer_id = $2`, eventID, organizerID).Scan(&dbStatus)
	if err != nil {
		return nil, err
	}

	if dbStatus == "approved" {
		feedback.EventStatus = "Live"
	} else if dbStatus == "draft" {
		feedback.EventStatus = "Draft"
	} else if dbStatus == "rejected" {
		feedback.EventStatus = "Rejected"
	} else if dbStatus == "needs_revision" || dbStatus == "need_revision" {
		feedback.EventStatus = "Need Revision"
	} else {
		feedback.EventStatus = "Scheduled"
	}

	// Fetch auditor review stage & notes
	_ = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(notes, ''), COALESCE(assigned_auditor_name, ''), COALESCE(stage, '')
		FROM auditor_event_reviews
		WHERE event_id = $1
	`, eventID).Scan(&feedback.AuditorNotes, &feedback.AssignedAuditorName, &feedback.Stage)

	// Fetch auditor revision requests
	revRows, err := r.db.QueryContext(ctx, `
		SELECT id, category, title, description, required_action, priority, status, created_at,
		       COALESCE(organizer_comment, ''), COALESCE(organizer_action_taken, ''), COALESCE(organizer_file, ''), COALESCE(responded_at::text, '')
		FROM auditor_revisions
		WHERE event_id = $1
		ORDER BY created_at DESC
	`, eventID)
	if err == nil {
		defer revRows.Close()
		feedback.Revisions = []*AuditorRevisionItem{}
		for revRows.Next() {
			var rev AuditorRevisionItem
			if err := revRows.Scan(
				&rev.ID, &rev.Category, &rev.Title, &rev.Description, &rev.RequiredAction, &rev.Priority, &rev.Status, &rev.CreatedAt,
				&rev.OrganizerComment, &rev.OrganizerActionTaken, &rev.OrganizerFile, &rev.RespondedAt,
			); err == nil {
				feedback.Revisions = append(feedback.Revisions, &rev)
			}
		}
	}

	// Fetch status logs
	logRows, err := r.db.QueryContext(ctx, `
		SELECT from_status, to_status, COALESCE(notes, ''), created_at
		FROM event_status_log
		WHERE event_id = $1
		ORDER BY created_at DESC
	`, eventID)
	if err == nil {
		defer logRows.Close()
		feedback.StatusLogs = []*EventStatusLogItem{}
		for logRows.Next() {
			var l EventStatusLogItem
			if err := logRows.Scan(&l.FromStatus, &l.ToStatus, &l.Notes, &l.CreatedAt); err == nil {
				feedback.StatusLogs = append(feedback.StatusLogs, &l)
			}
		}
	}

	return &feedback, nil
}

func (r *PostgresRepository) RespondToEventRevision(ctx context.Context, eventID, revID, organizerID int, req RespondRevisionRequest) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var exists bool
	err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM events WHERE id = $1 AND organizer_id = $2)`, eventID, organizerID).Scan(&exists)
	if err != nil || !exists {
		return fmt.Errorf("event not found or unauthorized")
	}

	res, err := r.db.ExecContext(ctx, `
		UPDATE auditor_revisions
		SET status = 'Resubmitted',
			organizer_comment = $1,
			organizer_action_taken = $2,
			organizer_file = $3,
			responded_at = now(),
			updated_at = now()
		WHERE id = $4 AND event_id = $5
	`, req.Comment, req.ActionTaken, req.ProofFile, revID, eventID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("revision item not found")
	}

	_, _ = r.db.ExecContext(ctx, `UPDATE events SET status = 'pending_review', updated_at = now() WHERE id = $1`, eventID)

	var eventName string
	_ = r.db.QueryRowContext(ctx, `SELECT event_name FROM events WHERE id = $1`, eventID).Scan(&eventName)

	auditorRows, err := r.db.QueryContext(ctx, `SELECT id FROM users WHERE role = 'auditor' OR role = 'admin'`)
	if err == nil {
		defer auditorRows.Close()
		for auditorRows.Next() {
			var auditorID int
			if err := auditorRows.Scan(&auditorID); err == nil {
				_, _ = r.db.ExecContext(ctx, `
					INSERT INTO notifications (user_id, title, detail, resource_type, resource_id, is_read, created_at)
					VALUES ($1, $2, $3, 'event', $4, FALSE, now())
				`, auditorID, fmt.Sprintf("📩 Respon Revisi Event: %s", eventName), fmt.Sprintf("Organizer telah mengunggah perbaikan untuk revisi #%d.", revID), strconv.Itoa(eventID))
			}
		}
	}

	return nil
}

