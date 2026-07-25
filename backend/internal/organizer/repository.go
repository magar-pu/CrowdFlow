package organizer

import (
	"context"
	"database/sql"
	"errors"
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
		SELECT e.id, e.event_name, et.event_type, e.event_start, e.event_end, e.status, COALESCE(e.cover_image_url, ''),
		       COALESCE(v.name, ''), COALESCE(v.city, ''),
		       COALESCE((SELECT SUM(allocation_limit) FROM ticket_tiers WHERE event_id = e.id), 0) as capacity,
		       COALESCE((SELECT SUM(tickets_sold) FROM ticket_tiers WHERE event_id = e.id), 0) as sold,
		       COALESCE((SELECT SUM(gross_amount) FROM orders WHERE event_id = e.id AND status = 'paid'), 0) as revenue
		FROM events e
		-- LEFT: a draft has no venue until the organizer picks one in the
		-- workspace, and it must still show up in the organizer's own lists.
		LEFT JOIN venues v ON e.venue_id = v.id
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
				// Location stays the bare city: the dashboard card composes it
				// as "{venueName}, {location}" itself, so prefixing the name
				// here rendered it twice.
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
		SELECT e.id, e.event_name, et.event_type, e.description, e.event_start, e.event_end, e.status, COALESCE(e.cover_image_url, ''),
		       COALESCE(v.id, 0), COALESCE(v.name, ''), COALESCE(v.address, ''), COALESCE(v.city, ''),
		       COALESCE((SELECT SUM(allocation_limit) FROM ticket_tiers WHERE event_id = e.id), 0) as capacity,
		       COALESCE((SELECT SUM(tickets_sold) FROM ticket_tiers WHERE event_id = e.id), 0) as sold,
		       COALESCE((SELECT SUM(gross_amount) FROM orders WHERE event_id = e.id AND status = 'paid'), 0) as revenue
		FROM events e
		-- LEFT: venue-less drafts must still be listed. VenueID comes back 0.
		LEFT JOIN venues v ON e.venue_id = v.id
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
		err = rows.Scan(&e.ID, &e.Name, &e.Category, &e.Description, &start, &end, &statusVal, &e.Image, &e.VenueID, &e.VenueName, &e.LocationAddress, &e.VenueCity, &e.Capacity, &e.Sold, &e.Revenue)
		if err == nil {
			e.StartDate = start.Format("2006-01-02")
			e.StartTime = start.Format("15:04:05")
			e.EndDate = end.Format("2006-01-02")
			e.EndTime = end.Format("15:04:05")
			e.Date = start.Format("Jan 02, 2006")
			e.Location = composeLocation(e.VenueName, e.VenueCity)
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
		SELECT e.id, e.event_name, et.event_type, e.description, e.event_start, e.event_end, e.status, COALESCE(e.cover_image_url, ''),
		       COALESCE(v.id, 0), COALESCE(v.name, ''), COALESCE(v.address, ''), COALESCE(v.city, ''),
		       COALESCE((SELECT SUM(allocation_limit) FROM ticket_tiers WHERE event_id = e.id), 0) as capacity,
		       COALESCE((SELECT SUM(tickets_sold) FROM ticket_tiers WHERE event_id = e.id), 0) as sold,
		       COALESCE((SELECT SUM(gross_amount) FROM orders WHERE event_id = e.id AND status = 'paid'), 0) as revenue
		FROM events e
		-- LEFT: the workspace opens on venue-less drafts; that is where the
		-- organizer goes to set the venue in the first place.
		LEFT JOIN venues v ON e.venue_id = v.id
		JOIN event_types et ON e.event_type_id = et.id
		WHERE e.id = $1 AND e.organizer_id = $2
	`, eventID, organizerID).Scan(&e.ID, &e.Name, &e.Category, &e.Description, &start, &end, &statusVal, &e.Image, &e.VenueID, &e.VenueName, &e.LocationAddress, &e.VenueCity, &e.Capacity, &e.Sold, &e.Revenue)
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
	e.Location = composeLocation(e.VenueName, e.VenueCity)
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

// The ticket type shown against an order is the distinct tier name(s) actually
// bought on it; an order spanning two tiers reads "VIP, General".
const orderSelect = `
	SELECT o.id, up.full_name, u.email, e.event_name, o.gross_amount, o.status, o.created_at, o.payment_type,
	       COALESCE((
	           SELECT string_agg(DISTINCT tt.name, ', ')
	           FROM tickets t
	           JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
	           WHERE t.order_id = o.id
	       ), '') AS ticket_type
	FROM orders o
	JOIN events e ON o.event_id = e.id
	JOIN users u ON o.purchaser_id = u.id
	JOIN user_profiles up ON u.id = up.user_id
`

func orderStatusLabel(statusVal string) string {
	switch statusVal {
	case "paid":
		return "Paid"
	case "pending":
		return "Pending"
	case "refunded":
		return "Refunded"
	default:
		return "Failed"
	}
}

func scanOrders(rows *sql.Rows) []*OrganizerOrder {
	orders := []*OrganizerOrder{}
	for rows.Next() {
		var o OrganizerOrder
		var createdAt time.Time
		var statusVal string
		var payType string
		if err := rows.Scan(&o.ID, &o.CustomerName, &o.CustomerEmail, &o.EventName, &o.Amount, &statusVal, &createdAt, &payType, &o.TicketType); err != nil {
			continue
		}
		o.Time = createdAt.Format("2006-01-02 15:04:05")
		o.Status = orderStatusLabel(statusVal)
		o.PaymentMethod = payType
		orders = append(orders, &o)
	}
	return orders
}

func (r *PostgresRepository) ListOrders(ctx context.Context, organizerID int) ([]*OrganizerOrder, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, orderSelect+`
		WHERE e.organizer_id = $1
		ORDER BY o.created_at DESC
	`, organizerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanOrders(rows), nil
}

// ListEventOrders is the workspace's Recent Transactions table: the same rows as
// ListOrders, narrowed to one event the caller owns.
func (r *PostgresRepository) ListEventOrders(ctx context.Context, eventID int, organizerID int) ([]*OrganizerOrder, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, orderSelect+`
		WHERE e.organizer_id = $1 AND o.event_id = $2
		ORDER BY o.created_at DESC
		LIMIT 100
	`, organizerID, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanOrders(rows), nil
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

// nullableVenue turns the repository's "0 means no venue" convention into the
// NULL that events.venue_id actually stores (migration 0015).
func nullableVenue(venueID int) sql.NullInt64 {
	if venueID <= 0 {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: int64(venueID), Valid: true}
}

// composeLocation builds the "Venue Name, City" display string the console
// renders. A draft can have no venue yet, so both halves may be empty — return
// an empty string rather than a bare ", ".
func composeLocation(venueName, venueCity string) string {
	switch {
	case venueName == "" && venueCity == "":
		return ""
	case venueCity == "":
		return venueName
	case venueName == "":
		return venueCity
	default:
		return venueName + ", " + venueCity
	}
}

// resolveVenue maps the venue fields on an incoming OrganizerEvent to a venues
// row id, inside the caller's transaction. Shared by create and update, which
// previously carried character-for-character identical copies of this logic.
//
// Returns (0, nil) when the payload carries no venue information whatsoever —
// that is not an error here, because a partial update legitimately omits it.
// The caller decides what to do: create rejects it, update keeps the existing
// binding.
//
// Resolution order:
//  1. VenueID          — the picker's normal path; verified to exist.
//  2. NewVenue         — inline creation, deduped on name+city.
//  3. VenueName        — legacy fallback for older clients that only ever sent
//     a name. Kept so the console keeps working until the
//     frontend picker ships.
func (r *PostgresRepository) resolveVenue(ctx context.Context, tx *sql.Tx, event *OrganizerEvent) (int, error) {
	// 1. Explicit id from the venue picker.
	if event.VenueID > 0 {
		var id int
		err := tx.QueryRowContext(ctx, "SELECT id FROM venues WHERE id = $1", event.VenueID).Scan(&id)
		if err == sql.ErrNoRows {
			return 0, fmt.Errorf("venue %d does not exist", event.VenueID)
		} else if err != nil {
			return 0, err
		}
		return id, nil
	}

	// 2. Inline creation from the wizard.
	if nv := event.NewVenue; nv != nil && strings.TrimSpace(nv.Name) != "" {
		name := strings.TrimSpace(nv.Name)
		// Reuse a row the organizer already created rather than adding a near
		// duplicate. Name plus city, not name alone: venues legitimately share
		// a name across cities.
		var id int
		err := tx.QueryRowContext(ctx,
			"SELECT id FROM venues WHERE lower(name) = lower($1) AND lower(city) = lower($2)",
			name, nv.City).Scan(&id)
		if err == nil {
			return id, nil
		} else if err != sql.ErrNoRows {
			return 0, err
		}

		err = tx.QueryRowContext(ctx, `
			INSERT INTO venues (name, address, city, province, postal_code, total_capacity)
			VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6)
			RETURNING id
		`, name, nv.Address, nv.City, nv.Province, nv.PostalCode, nv.TotalCapacity).Scan(&id)
		if err != nil {
			return 0, err
		}
		return id, nil
	}

	// 3. Legacy name-only clients.
	if name := strings.TrimSpace(event.VenueName); name != "" {
		var id int
		err := tx.QueryRowContext(ctx, "SELECT id FROM venues WHERE name = $1", name).Scan(&id)
		if err == nil {
			return id, nil
		} else if err != sql.ErrNoRows {
			return 0, err
		}
		// Older clients put the city in Location; newer ones use VenueCity.
		city := strings.TrimSpace(event.VenueCity)
		if city == "" {
			city = event.Location
		}
		err = tx.QueryRowContext(ctx, `
			INSERT INTO venues (name, address, city, province, total_capacity)
			VALUES ($1, $2, $3, '', $4)
			RETURNING id
		`, name, event.LocationAddress, city, event.Capacity).Scan(&id)
		if err != nil {
			return 0, err
		}
		return id, nil
	}

	return 0, nil
}

func (r *PostgresRepository) CreateOrganizerEvent(ctx context.Context, organizerID int, event *OrganizerEvent) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Resolve or create venue. Optional at creation: the wizard only captures
	// the event's identity and schedule, and the organizer picks the venue in
	// the workspace afterwards. NULL venue_id until they do.
	venueID, err := r.resolveVenue(ctx, tx, event)
	if err != nil {
		return err
	}
	venue := nullableVenue(venueID)

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
		venue, organizerID, event.Name, event.Description, eventStart, eventEnd,
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

	// 1. Resolve venue. A partial update (e.g. rename-only) carries no venue
	// fields at all; keep whatever the event is already bound to rather than
	// repointing it at a freshly minted blank venue. That existing binding may
	// itself be NULL on a draft whose venue hasn't been picked yet.
	venueID, err := r.resolveVenue(ctx, tx, event)
	if err != nil {
		return err
	}
	venue := nullableVenue(venueID)
	if venueID == 0 {
		if err = tx.QueryRowContext(ctx, "SELECT venue_id FROM events WHERE id = $1", eventID).Scan(&venue); err != nil {
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
		venue, eventTypeID, event.Image, eventID, organizerID,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// SetEventVenue binds an event to a venue from the workspace's Venue tab. This
// is the counterpart to dropping the venue out of the creation wizard: the
// event exists first, the venue is chosen here.
//
// Changing an already-set venue invalidates anything keyed off the old one. A
// bound layout belongs to the old venue's geometry, and the seat overlay
// (event_seats_matrix) points at that layout's seats, so both are cleared —
// unless seats have already been sold or held, in which case the change is
// refused rather than silently orphaning a buyer's seat.
func (r *PostgresRepository) SetEventVenue(ctx context.Context, eventID int, organizerID int, event *OrganizerEvent) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var currentStatus string
	var currentVenue sql.NullInt64
	var currentLayout sql.NullInt64
	err = tx.QueryRowContext(ctx,
		"SELECT status, venue_id, layout_id FROM events WHERE id = $1 AND organizer_id = $2",
		eventID, organizerID).Scan(&currentStatus, &currentVenue, &currentLayout)
	if err == sql.ErrNoRows {
		return fmt.Errorf("event not found or unauthorized")
	} else if err != nil {
		return err
	}

	if currentStatus == "pending_review" {
		return fmt.Errorf("%w: cannot change the venue while the event is under review", ErrValidation)
	}

	venueID, err := r.resolveVenue(ctx, tx, event)
	if err != nil {
		return err
	}
	if venueID == 0 {
		return fmt.Errorf("%w: a venue is required", ErrValidation)
	}

	// Same venue: nothing to invalidate, and re-running the clears below would
	// throw away a perfectly good layout binding.
	if currentVenue.Valid && int(currentVenue.Int64) == venueID {
		return tx.Commit()
	}

	if currentLayout.Valid {
		var committed int
		if err := tx.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM event_seats_matrix
			WHERE event_id = $1 AND current_state <> 'available'
		`, eventID).Scan(&committed); err != nil {
			return err
		}
		if committed > 0 {
			return fmt.Errorf("%w: %d seat(s) are already sold or blocked on the current layout", ErrValidation, committed)
		}
		if _, err := tx.ExecContext(ctx, "DELETE FROM event_seats_matrix WHERE event_id = $1", eventID); err != nil {
			return err
		}
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE events SET venue_id = $1, layout_id = NULL, updated_at = now()
		WHERE id = $2 AND organizer_id = $3
	`, venueID, eventID, organizerID); err != nil {
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

	// Venue gate: drafts are created without a venue (it is picked in the
	// workspace), but an event cannot go to an auditor — let alone to the public
	// catalogue — without one. Every read path outside the organizer console
	// still inner-joins venues, so this is what keeps a NULL venue_id contained
	// to drafts.
	var venueID sql.NullInt64
	if err := tx.QueryRowContext(ctx, `SELECT venue_id FROM events WHERE id = $1`, eventID).Scan(&venueID); err != nil {
		return err
	}
	if !venueID.Valid {
		return fmt.Errorf("%w: set the venue in the Venue tab before submitting", ErrVenueRequired)
	}

	// Seating gate: a seated event (one with a bound layout) can only be
	// submitted once EVERY seat in that layout has been painted with a ticket
	// tier (i.e. has an event_seats_matrix row).
	//
	// This deliberately covers every seat. The previous rule skipped seats with
	// no section, which meant an organizer could ship a layout where a chunk of
	// seats was silently unsellable while the gate reported the event complete.
	var layoutID sql.NullInt64
	if err := tx.QueryRowContext(ctx, `SELECT layout_id FROM events WHERE id = $1`, eventID).Scan(&layoutID); err != nil {
		return err
	}
	if layoutID.Valid {
		var untiered int
		if err := tx.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM seats s
			WHERE s.layout_id = $1
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

	// Document gate: an auditor cannot evaluate an event without its proposal,
	// crowd permit and PIC identification. A rejected document does NOT satisfy
	// the gate — it has to be replaced before the event can go back for review.
	rows, err := tx.QueryContext(ctx, `
		SELECT document_type FROM event_documents
		WHERE event_id = $1 AND status <> 'rejected'
	`, eventID)
	if err != nil {
		return err
	}
	present := map[string]bool{}
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			rows.Close()
			return err
		}
		present[t] = true
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	var missing []string
	for _, t := range RequiredEventDocumentTypes {
		if !present[t] {
			missing = append(missing, EventDocumentLabel(t))
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("%w: upload %s in the Documents tab before submitting", ErrDocumentsIncomplete, strings.Join(missing, ", "))
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

	// An event with no paid orders returns no points on purpose: the console
	// renders an empty state for that. This used to synthesise a plausible sales
	// curve, which was indistinguishable from real data.
	return &OrganizerAnalytics{Points: points}, nil
}

// GetEventCheckInStats reads the live gate figures for one event: how many
// tickets have been scanned, per gate and per hour, plus the mean scanner
// response time. Every number comes from ticket_checkins / scanner_logs.
func (r *PostgresRepository) GetEventCheckInStats(ctx context.Context, eventID int, organizerID int) (*EventCheckInStats, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	// Ownership is enforced by middleware, but scope the aggregates to the
	// organizer's own event anyway so a mismatch returns zeroes, not someone
	// else's gate traffic.
	var owned bool
	if err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS (SELECT 1 FROM events WHERE id = $1 AND organizer_id = $2)`,
		eventID, organizerID).Scan(&owned); err != nil {
		return nil, err
	}
	if !owned {
		return nil, sql.ErrNoRows
	}

	stats := &EventCheckInStats{
		Gates:   []GateCheckInStat{},
		Devices: []DeviceCheckInStat{},
		Hourly:  []HourlyCheckInPoint{},
	}

	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM ticket_checkins WHERE event_id = $1 AND status = 'VALID'`,
		eventID).Scan(&stats.TotalCheckedIn); err != nil {
		return nil, err
	}

	// Issued tickets, i.e. the denominator of the attendance rate. Cancelled
	// tickets can never be scanned, so they are not part of it.
	if err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM tickets t
		JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
		WHERE tt.event_id = $1 AND t.ticket_status <> 'cancelled'
	`, eventID).Scan(&stats.TotalTickets); err != nil {
		return nil, err
	}

	var avgMs sql.NullFloat64
	if err := r.db.QueryRowContext(ctx, `
		SELECT AVG(response_time_ms)
		FROM scanner_logs
		WHERE event_id = $1 AND response_time_ms IS NOT NULL
	`, eventID).Scan(&avgMs); err != nil {
		return nil, err
	}
	if avgMs.Valid {
		stats.AvgScanMs = int(avgMs.Float64)
	}

	gateRows, err := r.db.QueryContext(ctx, `
		SELECT eg.id, eg.name, eg.status,
		       COALESCE(c.scans, 0) AS scans,
		       COALESCE(d.devices, 0) AS devices
		FROM event_gates eg
		LEFT JOIN (
			SELECT gate_id, COUNT(*) AS scans
			FROM ticket_checkins
			WHERE event_id = $1 AND status = 'VALID'
			GROUP BY gate_id
		) c ON c.gate_id = eg.id
		LEFT JOIN (
			SELECT gate_id, COUNT(*) AS devices
			FROM scanner_devices
			WHERE event_id = $1
			GROUP BY gate_id
		) d ON d.gate_id = eg.id
		WHERE eg.event_id = $1
		ORDER BY eg.id
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer gateRows.Close()
	for gateRows.Next() {
		var g GateCheckInStat
		if err := gateRows.Scan(&g.GateID, &g.GateName, &g.Status, &g.Scans, &g.DeviceCount); err == nil {
			stats.Gates = append(stats.Gates, g)
		}
	}

	deviceRows, err := r.db.QueryContext(ctx, `
		SELECT scanner_device_id, COUNT(*)
		FROM ticket_checkins
		WHERE event_id = $1 AND status = 'VALID' AND scanner_device_id IS NOT NULL
		GROUP BY scanner_device_id
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer deviceRows.Close()
	for deviceRows.Next() {
		var d DeviceCheckInStat
		if err := deviceRows.Scan(&d.DeviceID, &d.Scans); err == nil {
			stats.Devices = append(stats.Devices, d)
		}
	}

	hourRows, err := r.db.QueryContext(ctx, `
		SELECT date_trunc('hour', checked_in_at) AS bucket, COUNT(*)
		FROM ticket_checkins
		WHERE event_id = $1 AND status = 'VALID'
		GROUP BY bucket
		ORDER BY bucket ASC
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer hourRows.Close()
	for hourRows.Next() {
		var bucket time.Time
		var count int
		if err := hourRows.Scan(&bucket, &count); err == nil {
			stats.Hourly = append(stats.Hourly, HourlyCheckInPoint{
				Hour:  bucket.Format("15:04"),
				Scans: count,
			})
		}
	}

	return stats, nil
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

	// Record it in the same log the scanner app writes to, so the workspace's
	// attendance figures count a console check-in too. No gate or device here —
	// this path is the organizer admitting someone by hand.
	_, err = tx.ExecContext(ctx, `
		INSERT INTO ticket_checkins (ticket_id, event_id, status)
		VALUES ($1, $2, 'VALID')
	`, tID, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to record check-in: %w", err)
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
				`, auditorID, fmt.Sprintf("📩 Revision Response: %s", eventName), fmt.Sprintf("The organizer uploaded a fix for revision #%d.", revID), strconv.Itoa(eventID))
			}
		}
	}

	return nil
}

// ============================================================================
// Per-event documents
// ============================================================================

const eventDocumentSelect = `
	SELECT id, event_id, document_type, file_path, file_name, file_size,
	       content_type, status, review_notes, uploaded_at
	FROM event_documents`

func scanEventDocument(s interface{ Scan(...any) error }) (*EventDocument, error) {
	doc := &EventDocument{}
	err := s.Scan(
		&doc.ID, &doc.EventID, &doc.DocumentType, &doc.FilePath, &doc.FileName,
		&doc.FileSize, &doc.ContentType, &doc.Status, &doc.ReviewNotes, &doc.UploadedAt,
	)
	if err != nil {
		return nil, err
	}
	return doc, nil
}

func (r *PostgresRepository) ListEventDocuments(ctx context.Context, eventID int) ([]*EventDocument, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, eventDocumentSelect+`
		WHERE event_id = $1
		ORDER BY uploaded_at DESC`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Non-nil so an event with no documents serialises as [] rather than null.
	docs := []*EventDocument{}
	for rows.Next() {
		doc, err := scanEventDocument(rows)
		if err != nil {
			return nil, err
		}
		docs = append(docs, doc)
	}
	return docs, rows.Err()
}

func (r *PostgresRepository) GetEventDocument(ctx context.Context, eventID int, docID int) (*EventDocument, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// event_id is part of the predicate, not just the id: the route's ownership
	// middleware guards the EVENT, so a document id from another event must not
	// resolve here.
	doc, err := scanEventDocument(r.db.QueryRowContext(ctx, eventDocumentSelect+`
		WHERE id = $1 AND event_id = $2`, docID, eventID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrDocumentNotFound
	}
	return doc, err
}

// UpsertEventDocument writes the row for (event_id, document_type), replacing any
// existing one. It returns the object key of the file it displaced, if any, so the
// caller can delete the orphan from the private bucket.
//
// Re-uploading also resets status to 'pending_verification' and clears the auditor's
// review notes — a replaced file has not been reviewed, and leaving a stale
// 'verified' would let an organizer swap an approved document after the fact.
func (r *PostgresRepository) UpsertEventDocument(ctx context.Context, doc *EventDocument, uploadedBy int) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var replaced sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT file_path FROM event_documents WHERE event_id = $1 AND document_type = $2
	`, doc.EventID, doc.DocumentType).Scan(&replaced)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return "", err
	}

	err = r.db.QueryRowContext(ctx, `
		INSERT INTO event_documents
			(event_id, document_type, file_path, file_name, file_size, content_type, uploaded_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (event_id, document_type) DO UPDATE SET
			file_path    = EXCLUDED.file_path,
			file_name    = EXCLUDED.file_name,
			file_size    = EXCLUDED.file_size,
			content_type = EXCLUDED.content_type,
			uploaded_by  = EXCLUDED.uploaded_by,
			uploaded_at  = CURRENT_TIMESTAMP,
			status       = 'pending_verification',
			review_notes = NULL,
			reviewed_at  = NULL,
			reviewed_by  = NULL
		RETURNING id, status, uploaded_at
	`,
		doc.EventID, doc.DocumentType, doc.FilePath, doc.FileName,
		doc.FileSize, doc.ContentType, uploadedBy,
	).Scan(&doc.ID, &doc.Status, &doc.UploadedAt)
	if err != nil {
		return "", err
	}

	if replaced.Valid && replaced.String != doc.FilePath {
		return replaced.String, nil
	}
	return "", nil
}

// DeleteEventDocument removes the row and returns the object key to purge.
func (r *PostgresRepository) DeleteEventDocument(ctx context.Context, eventID int, docID int) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var filePath string
	err := r.db.QueryRowContext(ctx, `
		DELETE FROM event_documents WHERE id = $1 AND event_id = $2 RETURNING file_path
	`, docID, eventID).Scan(&filePath)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrDocumentNotFound
	}
	return filePath, err
}
