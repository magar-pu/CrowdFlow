package organizer

import (
	"context"
	"database/sql"
	"encoding/json"
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
		       (e.published_at IS NOT NULL),
		       COALESCE(v.name, ''), COALESCE(v.city, ''),
		       COALESCE((SELECT SUM(allocation_limit) FROM ticket_tiers WHERE event_id = e.id), 0) as capacity,
		       COALESCE((SELECT SUM(tickets_sold) FROM ticket_tiers WHERE event_id = e.id), 0) as sold,
		       COALESCE((SELECT SUM(gross_amount) FROM orders WHERE event_id = e.id AND status = 'paid'), 0) as revenue
		FROM events e
		-- LEFT: a draft has no venue until the organizer picks one in the
		-- workspace, and it must still show up in the organizer's own lists.
		LEFT JOIN venues v ON e.venue_id = v.id
		JOIN event_types et ON e.event_type_id = et.id
		WHERE e.organizer_id = $1 AND e.archived_at IS NULL
		ORDER BY e.created_at DESC
		LIMIT 5
	`, organizerID)
	if err == nil {
		defer rowsEvents.Close()
		for rowsEvents.Next() {
			var e RecentEvent
			var start, end time.Time
			var statusVal string
			err = rowsEvents.Scan(&e.ID, &e.Name, &e.Category, &start, &end, &statusVal, &e.Image, &e.Published, &e.VenueName, &e.Location, &e.Capacity, &e.Sold, &e.Revenue)
			if err == nil {
				// Location stays the bare city: the dashboard card composes it
				// as "{venueName}, {location}" itself, so prefixing the name
				// here rendered it twice.
				if statusVal == "approved" {
					// Same distinction the events list makes: approved is the
					// auditor's verdict, Live means actually on sale.
					if e.Published {
						e.Status = "Live"
					} else {
						e.Status = "Approved"
					}
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

func (r *PostgresRepository) ListOrganizerEvents(ctx context.Context, organizerID int, archived bool) ([]*OrganizerEvent, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT e.id, e.event_name, et.event_type, e.description, e.event_start, e.event_end, e.status, COALESCE(e.cover_image_url, ''), (e.published_at IS NOT NULL),
		       COALESCE(v.id, 0), COALESCE(v.name, ''), COALESCE(v.address, ''), COALESCE(v.city, ''),
		       COALESCE((SELECT SUM(allocation_limit) FROM ticket_tiers WHERE event_id = e.id), 0) as capacity,
		       COALESCE((SELECT SUM(tickets_sold) FROM ticket_tiers WHERE event_id = e.id), 0) as sold,
		       COALESCE((SELECT SUM(gross_amount) FROM orders WHERE event_id = e.id AND status = 'paid'), 0) as revenue,
		       (e.archived_at IS NOT NULL) as is_archived
		FROM events e
		-- LEFT: venue-less drafts must still be listed. VenueID comes back 0.
		LEFT JOIN venues v ON e.venue_id = v.id
		JOIN event_types et ON e.event_type_id = et.id
		-- One list, two views: active by default, archived on request. There is
		-- no "everything" mode on purpose — an archived event showing up beside
		-- live ones is exactly what archiving exists to prevent.
		-- GetOrganizerEvent deliberately does NOT filter, so a direct link to an
		-- archived event's workspace still opens and can un-archive it.
		WHERE e.organizer_id = $1
		  AND ($2::boolean = (e.archived_at IS NOT NULL))
		ORDER BY e.created_at DESC
	`, organizerID, archived)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := []*OrganizerEvent{}
	for rows.Next() {
		var e OrganizerEvent
		var start, end time.Time
		var statusVal string
		var isArchived bool
		err = rows.Scan(&e.ID, &e.Name, &e.Category, &e.Description, &start, &end, &statusVal, &e.Image, &e.Published, &e.VenueID, &e.VenueName, &e.LocationAddress, &e.VenueCity, &e.Capacity, &e.Sold, &e.Revenue, &isArchived)
		if err == nil {
			e.StartDate = start.Format("2006-01-02")
			e.StartTime = start.Format("15:04:05")
			e.EndDate = end.Format("2006-01-02")
			e.EndTime = end.Format("15:04:05")
			e.Date = start.Format("Jan 02, 2006")
			e.Location = composeLocation(e.VenueName, e.VenueCity)
			// Archived events keep their underlying DB status but surface as
			// "Archived" so the organizer sees what they filed away, not a
			// misleading "Draft" or "Approved" label.
			if isArchived {
				e.Status = "Archived"
			} else if statusVal == "approved" {
				// Approved is the auditor's verdict; only a published event is
				// actually visible to buyers.
				if e.Published {
					e.Status = "Live"
				} else {
					e.Status = "Approved"
				}
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
	var isArchived bool
	err := r.db.QueryRowContext(ctx, `
		SELECT e.id, e.event_name, et.event_type, e.description, e.event_start, e.event_end, e.status, COALESCE(e.cover_image_url, ''), (e.published_at IS NOT NULL),
		       COALESCE(v.id, 0), COALESCE(v.name, ''), COALESCE(v.address, ''), COALESCE(v.city, ''),
		       COALESCE((SELECT SUM(allocation_limit) FROM ticket_tiers WHERE event_id = e.id), 0) as capacity,
		       COALESCE((SELECT SUM(tickets_sold) FROM ticket_tiers WHERE event_id = e.id), 0) as sold,
		       COALESCE((SELECT SUM(gross_amount) FROM orders WHERE event_id = e.id AND status = 'paid'), 0) as revenue,
		       (e.archived_at IS NOT NULL) as is_archived
		FROM events e
		-- LEFT: the workspace opens on venue-less drafts; that is where the
		-- organizer goes to set the venue in the first place.
		LEFT JOIN venues v ON e.venue_id = v.id
		JOIN event_types et ON e.event_type_id = et.id
		WHERE e.id = $1 AND e.organizer_id = $2
	`, eventID, organizerID).Scan(&e.ID, &e.Name, &e.Category, &e.Description, &start, &end, &statusVal, &e.Image, &e.Published, &e.VenueID, &e.VenueName, &e.LocationAddress, &e.VenueCity, &e.Capacity, &e.Sold, &e.Revenue, &isArchived)
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
	if isArchived {
		e.Status = "Archived"
	} else if statusVal == "approved" {
		if e.Published {
			e.Status = "Live"
		} else {
			e.Status = "Approved"
		}
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

// DeleteOrganizerEvent removes a draft outright. Deliberately restricted to
// drafts: auditor_event_reviews, event_approval_log and event_status_log all
// cascade from events, so deleting a reviewed event would erase the audit trail
// of that review. Terminal events are archived instead (see ArchiveEvent).
//
// Returns sql.ErrNoRows when nothing matched. Without that check the guard is
// invisible to the caller — a non-draft event yields 0 affected rows and a nil
// error, which the handler used to report as a successful deletion.
func (r *PostgresRepository) DeleteOrganizerEvent(ctx context.Context, eventID int, organizerID int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	res, err := r.db.ExecContext(ctx, `
		DELETE FROM events WHERE id = $1 AND organizer_id = $2 AND status = 'draft'
	`, eventID, organizerID)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// WithdrawEventFromReview returns a pending_review event to draft. Runs in a
// transaction with SELECT ... FOR UPDATE so an auditor claiming the event
// concurrently either loses the race or blocks it — without the lock, a
// withdrawal and a claim can interleave and leave a draft that the auditor
// console still shows as assigned to them.
func (r *PostgresRepository) WithdrawEventFromReview(ctx context.Context, eventID int, organizerID int) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var status string
	err = tx.QueryRowContext(ctx, `
		SELECT status FROM events WHERE id = $1 AND organizer_id = $2 FOR UPDATE
	`, eventID, organizerID).Scan(&status)
	if err == sql.ErrNoRows {
		return ErrEventNotFound
	}
	if err != nil {
		return err
	}
	if status != "pending_review" {
		return ErrNotUnderReview
	}

	// "Claimed" means an auditor has taken ownership (reviewer_id) or moved the
	// review past its initial stage. A bare 'Submitted' row with no reviewer is
	// just the queue entry created on submission, so it does not block.
	var claimed bool
	err = tx.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM auditor_event_reviews
			WHERE event_id = $1 AND (reviewer_id IS NOT NULL OR stage <> 'Submitted')
		)
	`, eventID).Scan(&claimed)
	if err != nil {
		return err
	}
	if claimed {
		return ErrReviewInProgress
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE events SET status = 'draft', updated_at = now()
		WHERE id = $1 AND organizer_id = $2
	`, eventID, organizerID); err != nil {
		return err
	}

	// Drop the queue entry too, or the event reappears in the auditor's list
	// while sitting in the organizer's drafts.
	if _, err := tx.ExecContext(ctx, `
		DELETE FROM auditor_event_reviews WHERE event_id = $1
	`, eventID); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO event_status_log (event_id, actor_id, from_status, to_status, notes)
		VALUES ($1, $2, 'pending_review', 'draft', 'Withdrawn from review by organizer')
	`, eventID, organizerID); err != nil {
		return err
	}

	return tx.Commit()
}

// SetEventListed is the organizer's final call on going public. The auditor's
// approval is a precondition, not the trigger: an approved event stays invisible
// until published_at is set here, and withdrawing clears it without disturbing
// the status, so re-publishing needs no second approval.
func (r *PostgresRepository) SetEventListed(ctx context.Context, eventID int, organizerID int, listed bool) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var status string
	var archived bool
	err := r.db.QueryRowContext(ctx, `
		SELECT status, archived_at IS NOT NULL FROM events
		WHERE id = $1 AND organizer_id = $2
	`, eventID, organizerID).Scan(&status, &archived)
	if err == sql.ErrNoRows {
		return ErrEventNotFound
	}
	if err != nil {
		return err
	}

	if status != "approved" {
		return ErrNotApproved
	}
	// Publishing an archived event would put it on the public site while the
	// organizer's own list still hides it. Withdrawing stays allowed either way.
	if listed && archived {
		return ErrEventArchived
	}

	if listed {
		_, err = r.db.ExecContext(ctx, `
			UPDATE events SET published_at = now(), updated_at = now()
			WHERE id = $1 AND organizer_id = $2 AND published_at IS NULL
		`, eventID, organizerID)
	} else {
		_, err = r.db.ExecContext(ctx, `
			UPDATE events SET published_at = NULL, updated_at = now()
			WHERE id = $1 AND organizer_id = $2 AND published_at IS NOT NULL
		`, eventID, organizerID)
	}
	return err
}

// SetEventArchived flips archived_at. Status is untouched on purpose: a
// rejected event stays rejected, so the auditor's verdict and the review trail
// survive archiving and un-archiving.
func (r *PostgresRepository) SetEventArchived(ctx context.Context, eventID int, organizerID int, archived bool) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var status string
	err := r.db.QueryRowContext(ctx, `
		SELECT status FROM events WHERE id = $1 AND organizer_id = $2
	`, eventID, organizerID).Scan(&status)
	if err == sql.ErrNoRows {
		return ErrEventNotFound
	}
	if err != nil {
		return err
	}

	// Only terminal events may be archived. An approved event may still be
	// selling or yet to happen, and one in review is the auditor's to finish —
	// archiving either would hide something that still needs attention.
	// Un-archiving is always allowed, so nothing can get permanently stuck.
	if archived && status != "rejected" && status != "draft" {
		return ErrCannotArchive
	}

	var res sql.Result
	if archived {
		res, err = r.db.ExecContext(ctx, `
			UPDATE events SET archived_at = now(), updated_at = now()
			WHERE id = $1 AND organizer_id = $2 AND archived_at IS NULL
		`, eventID, organizerID)
	} else {
		res, err = r.db.ExecContext(ctx, `
			UPDATE events SET archived_at = NULL, updated_at = now()
			WHERE id = $1 AND organizer_id = $2 AND archived_at IS NOT NULL
		`, eventID, organizerID)
	}
	if err != nil {
		return err
	}

	// 0 rows means it was already in the requested state. Treat that as success
	// rather than an error: the caller's intent is satisfied either way.
	if _, err := res.RowsAffected(); err != nil {
		return err
	}
	return nil
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
			t.Status = tierStatus(t.Sold, t.Capacity, start, end, time.Now())
			tiers = append(tiers, &t)
		}
	}
	return tiers, nil
}

// tierStatus describes a tier the way the organizer needs to see it. The sales
// WINDOW is checked before the capacity: a tier whose window has closed is not
// buyable no matter how much stock is left, and reporting it as "On Sale"
// (which this did) meant the organizer console showed tiers as live that the
// public listing had already dropped — with nothing to explain the difference.
func tierStatus(sold, capacity int, start, end, now time.Time) string {
	switch {
	case now.Before(start):
		return "Scheduled"
	case now.After(end):
		return "Expired"
	case sold >= capacity:
		return "Sold Out"
	case capacity-sold < 30:
		return "Selling Fast"
	default:
		return "On Sale"
	}
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

	start, err := parseSalesStart(tier.SalesStart)
	if err != nil {
		return err
	}
	end, err := parseSalesEnd(tier.SalesEnd)
	if err != nil {
		return err
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

	// An omitted date means "leave that endpoint of the sales window alone",
	// the same partial-update rule maxPerOrder follows below. NULL is the signal
	// for that; it is never written to the columns, which are NOT NULL.
	var start, end sql.NullTime
	if strings.TrimSpace(tier.SalesStart) != "" {
		t, err := parseSalesStart(tier.SalesStart)
		if err != nil {
			return err
		}
		start = sql.NullTime{Time: t, Valid: true}
	}
	if strings.TrimSpace(tier.SalesEnd) != "" {
		t, err := parseSalesEnd(tier.SalesEnd)
		if err != nil {
			return err
		}
		end = sql.NullTime{Time: t, Valid: true}
	}

	// Callers may send a partial tier that omits maxPerOrder, which arrives as 0.
	// Treat that as "leave the existing cap alone" rather than writing 0, which
	// the booking service reads as uncapped.
	query := `
		UPDATE ticket_tiers
		SET name = $1, description = $2, price = $3, allocation_limit = $4,
		    sales_start = COALESCE($5, sales_start),
		    sales_end = COALESCE($6, sales_end),
		    max_ticket_per_user = CASE WHEN $7 > 0 THEN $7 ELSE max_ticket_per_user END
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

// SetEventCoverImage writes the resolved public URL of a freshly uploaded cover
// onto the event. Deliberately a targeted UPDATE rather than a round-trip
// through UpdateOrganizerEvent, which writes every column it receives and would
// blank anything the caller left out of the payload.
func (r *PostgresRepository) SetEventCoverImage(ctx context.Context, eventID int, organizerID int, url string) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	res, err := r.db.ExecContext(ctx, `
		UPDATE events SET cover_image_url = $1, updated_at = now()
		WHERE id = $2 AND organizer_id = $3
	`, url, eventID, organizerID)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// payoutDetailsLockReason reports why an organizer's bank details are locked,
// or "" when they are still editable.
//
// The account is a redirect target for money, so it freezes as soon as it is
// committed to something a change would silently affect: an event an auditor is
// currently assessing, or a payout that is queued or already paid. Both checks
// span ALL of the organizer's events, because the account is shared by all of
// them — locking per-event would let a second event's draft state unlock the
// destination of a payout in flight for the first.
//
// CALLERS MUST SKIP THIS when no account is on file yet. Locking an empty
// account is not protection, it is a dead end: organizers who were granted the
// Event Organizer role directly (bypassing the application wizard) already have
// approved events and pending payouts with no bank details, and would be unable
// to ever supply them. Setting an account for the first time redirects nothing.
func payoutDetailsLockReason(ctx context.Context, q queryRower, organizerID int) (string, error) {
	var underReview int
	if err := q.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM events
		WHERE organizer_id = $1 AND status IN ('pending_review', 'approved')
	`, organizerID).Scan(&underReview); err != nil {
		return "", err
	}
	if underReview > 0 {
		return fmt.Sprintf("%d event(s) are submitted for review or approved. Withdraw them to change payout details.", underReview), nil
	}

	var payouts int
	if err := q.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM payouts p
		JOIN events e ON e.id = p.event_id
		WHERE e.organizer_id = $1 AND p.status IN ('pending', 'processed')
	`, organizerID).Scan(&payouts); err != nil {
		return "", err
	}
	if payouts > 0 {
		return fmt.Sprintf("%d payout request(s) are pending or already paid. Contact support to change payout details.", payouts), nil
	}

	return "", nil
}

// queryRower is the subset of *sql.DB / *sql.Tx the lock check needs, so it can
// run inside the publish transaction as well as standalone.
type queryRower interface {
	QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row
}

func (r *PostgresRepository) GetPayoutDetails(ctx context.Context, organizerID int) (*PayoutDetails, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var d PayoutDetails
	var name, holder, number sql.NullString
	var status sql.NullString
	var updatedAt sql.NullTime

	err := r.db.QueryRowContext(ctx, `
		SELECT bank_name, bank_account_holder, bank_account_number,
		       bank_verification_status, bank_details_updated_at
		FROM organizer_applications
		WHERE user_id = $1
	`, organizerID).Scan(&name, &holder, &number, &status, &updatedAt)
	if err == sql.ErrNoRows {
		// No application row: the organizer has nothing on file yet. An empty,
		// editable form is the correct answer, not a 404.
		return &PayoutDetails{VerificationStatus: "unverified", Editable: true}, nil
	}
	if err != nil {
		return nil, err
	}

	d.BankName = strings.TrimSpace(name.String)
	d.BankAccountHolder = strings.TrimSpace(holder.String)
	d.BankAccountNumber = strings.TrimSpace(number.String)
	d.Complete = d.BankName != "" && d.BankAccountHolder != "" && d.BankAccountNumber != ""
	d.VerificationStatus = status.String
	if d.VerificationStatus == "" {
		d.VerificationStatus = "unverified"
	}
	if updatedAt.Valid {
		d.UpdatedAt = updatedAt.Time.Format(time.RFC3339)
	}

	// Nothing on file yet: always editable, whatever else is in flight.
	if !d.Complete {
		d.Editable = true
		return &d, nil
	}

	reason, err := payoutDetailsLockReason(ctx, r.db, organizerID)
	if err != nil {
		return nil, err
	}
	d.Editable = reason == ""
	d.LockReason = reason

	return &d, nil
}

// UpdatePayoutDetails writes the organizer's bank account, re-checking the lock
// inside the transaction so a concurrent event submission cannot slip past the
// check the console did when it rendered the form.
//
// Any change resets verification to 'unverified': the auditor confirmed a
// specific account, and that confirmation does not carry over to a new one.
func (r *PostgresRepository) UpdatePayoutDetails(ctx context.Context, organizerID int, req UpdatePayoutDetailsRequest) (*PayoutDetails, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Re-read inside the transaction: the lock only applies to CHANGING an
	// account that already exists, and this is also what stops a form rendered
	// before an event was submitted from writing after it.
	var curName, curHolder, curNumber sql.NullString
	err = tx.QueryRowContext(ctx, `
		SELECT bank_name, bank_account_holder, bank_account_number
		FROM organizer_applications WHERE user_id = $1
	`, organizerID).Scan(&curName, &curHolder, &curNumber)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	alreadyOnFile := strings.TrimSpace(curName.String) != "" &&
		strings.TrimSpace(curHolder.String) != "" &&
		strings.TrimSpace(curNumber.String) != ""

	if alreadyOnFile {
		reason, err := payoutDetailsLockReason(ctx, tx, organizerID)
		if err != nil {
			return nil, err
		}
		if reason != "" {
			return nil, fmt.Errorf("%w: %s", ErrPayoutDetailsLocked, reason)
		}
	}

	res, err := tx.ExecContext(ctx, `
		UPDATE organizer_applications
		SET bank_name = $1,
		    bank_account_holder = $2,
		    bank_account_number = $3,
		    bank_verification_status = 'unverified',
		    bank_details_updated_at = now()
		WHERE user_id = $4
	`, req.BankName, req.BankAccountHolder, req.BankAccountNumber, organizerID)
	if err != nil {
		return nil, err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if affected == 0 {
		// No application row. This is NOT necessarily an organizer who skipped the
		// wizard: an admin can grant the Event Organizer role directly from the
		// Users screen, which bypasses organizer_applications entirely. Those
		// organizers can create and run events but have nowhere to put bank
		// details, so refusing here would leave them permanently unable to be
		// paid.
		//
		// The row is created from data that actually exists — the user's own
		// profile name and login email. business_type and business_phone are NOT
		// NULL with no honest value available, so they are left empty and render
		// as "Not provided" rather than being invented.
		//
		// status is 'approved' because it already is: the role grant WAS the
		// approval. reviewed_by stays NULL — no auditor reviewed an application
		// that was never submitted, and naming one would fabricate an audit trail.
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO organizer_applications (
				user_id, business_name, business_type, business_email, business_phone,
				status, bank_name, bank_account_holder, bank_account_number,
				bank_verification_status, bank_details_updated_at
			)
			SELECT
				u.id,
				COALESCE(NULLIF(TRIM(up.full_name), ''), u.email),
				'',
				u.email,
				'',
				'approved',
				$2, $3, $4,
				'unverified',
				now()
			FROM users u
			LEFT JOIN user_profiles up ON up.user_id = u.id
			WHERE u.id = $1
		`, organizerID, req.BankName, req.BankAccountHolder, req.BankAccountNumber); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.GetPayoutDetails(ctx, organizerID)
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

	// Payout gate: an event must not reach an auditor until there is an account
	// for its revenue to be paid into. Checked first because it is the cheapest
	// to fix and, unlike the others, is fixed OUTSIDE this event's workspace —
	// telling the organizer about it before the venue/seating/document work
	// avoids sending them back to Settings after they think they are done.
	//
	// This is also the point of no return for the account: submitting locks it
	// (see payoutDetailsLockReason), so the details must be right now.
	var bankName, bankHolder, bankNumber sql.NullString
	err = tx.QueryRowContext(ctx, `
		SELECT bank_name, bank_account_holder, bank_account_number
		FROM organizer_applications WHERE user_id = $1
	`, organizerID).Scan(&bankName, &bankHolder, &bankNumber)
	if err == sql.ErrNoRows {
		return fmt.Errorf("%w: add your payout bank details in Settings before submitting", ErrPayoutDetailsRequired)
	} else if err != nil {
		return err
	}
	if strings.TrimSpace(bankName.String) == "" ||
		strings.TrimSpace(bankHolder.String) == "" ||
		strings.TrimSpace(bankNumber.String) == "" {
		return fmt.Errorf("%w: add your payout bank details in Settings before submitting", ErrPayoutDetailsRequired)
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
		       COALESCE(organizer_comment, ''), COALESCE(organizer_action_taken, ''), COALESCE(responded_at::text, ''),
		       COALESCE(organizer_documents_changed, '[]'::jsonb)::text
		FROM auditor_revisions
		WHERE event_id = $1
		ORDER BY created_at DESC
	`, eventID)
	if err == nil {
		defer revRows.Close()
		feedback.Revisions = []*AuditorRevisionItem{}
		for revRows.Next() {
			var rev AuditorRevisionItem
			var changedJSON string
			if err := revRows.Scan(
				&rev.ID, &rev.Category, &rev.Title, &rev.Description, &rev.RequiredAction, &rev.Priority, &rev.Status, &rev.CreatedAt,
				&rev.OrganizerComment, &rev.OrganizerActionTaken, &rev.RespondedAt, &changedJSON,
			); err == nil {
				rev.DocumentsChanged = []RevisionDocumentChange{}
				_ = json.Unmarshal([]byte(changedJSON), &rev.DocumentsChanged)
				feedback.Revisions = append(feedback.Revisions, &rev)
			}
		}

		// For points the organizer hasn't answered yet, show which documents
		// they have already replaced — so the form states what will be reported
		// rather than asking them to describe it from memory.
		for _, rev := range feedback.Revisions {
			if rev.RespondedAt != "" {
				continue
			}
			if pending, err := r.revisionDocumentChanges(ctx, eventID, rev.ID); err == nil {
				rev.PendingDocumentChanges = pending
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

// revisionDocumentChanges lists the event documents re-uploaded after the given
// revision was raised. Never returns nil, so the value marshals to [] and not
// null (a JSON null here would read as "unknown" rather than "nothing changed").
func (r *PostgresRepository) revisionDocumentChanges(ctx context.Context, eventID, revID int) ([]RevisionDocumentChange, error) {
	changes := []RevisionDocumentChange{}

	rows, err := r.db.QueryContext(ctx, `
		SELECT ed.document_type, ed.uploaded_at
		FROM event_documents ed
		WHERE ed.event_id = $1
		  AND ed.uploaded_at > (SELECT created_at FROM auditor_revisions WHERE id = $2)
		ORDER BY ed.uploaded_at ASC
	`, eventID, revID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var c RevisionDocumentChange
		var uploadedAt time.Time
		if err := rows.Scan(&c.DocumentType, &uploadedAt); err != nil {
			return nil, err
		}
		c.Label = EventDocumentLabel(c.DocumentType)
		c.UploadedAt = uploadedAt.Format("2006-01-02 15:04")
		changes = append(changes, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return changes, nil
}

func (r *PostgresRepository) RespondToEventRevision(ctx context.Context, eventID, revID, organizerID int, req RespondRevisionRequest) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var exists bool
	err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM events WHERE id = $1 AND organizer_id = $2)`, eventID, organizerID).Scan(&exists)
	if err != nil || !exists {
		return fmt.Errorf("event not found or unauthorized")
	}

	// A response is final. Once the point is Resubmitted the ball is with the
	// auditor, and once it is Resolved/Verified it is settled — allowing another
	// write would let the organizer overwrite an answer (and its document
	// changelog) the auditor may already have read. The UI hides the form for
	// these states; this is the rule that actually holds.
	var currentStatus string
	if err := r.db.QueryRowContext(ctx,
		`SELECT status FROM auditor_revisions WHERE id = $1 AND event_id = $2`,
		revID, eventID,
	).Scan(&currentStatus); err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("revision item not found")
		}
		return err
	}
	switch currentStatus {
	case "Resubmitted", "In Review":
		return fmt.Errorf("%w: this revision has already been sent to the auditor", ErrValidation)
	case "Resolved", "Verified":
		return fmt.Errorf("%w: this revision has already been accepted", ErrValidation)
	}

	// Snapshot the documents re-uploaded since this revision was raised. Taken
	// now rather than derived on read: event_documents is UNIQUE per type, so a
	// later replacement would overwrite uploaded_at and silently rewrite the
	// trail.
	changed, err := r.revisionDocumentChanges(ctx, eventID, revID)
	if err != nil {
		return err
	}
	changedJSON, err := json.Marshal(changed)
	if err != nil {
		return err
	}

	res, err := r.db.ExecContext(ctx, `
		UPDATE auditor_revisions
		SET status = 'Resubmitted',
			organizer_comment = $1,
			organizer_action_taken = $2,
			organizer_documents_changed = $3::jsonb,
			responded_at = now(),
			updated_at = now()
		WHERE id = $4 AND event_id = $5
	`, req.Comment, req.ActionTaken, string(changedJSON), revID, eventID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("revision item not found")
	}

	// Only hand the event back to the auditor once every revision point has an
	// answer. Re-queueing on the first response pulled the auditor into a
	// half-finished submission and made the queue lie about what was ready.
	//
	// 'Rejected' counts as open: the auditor turned down the organizer's fix, so
	// that point needs another answer. This must stay in step with the set the
	// UI lets the organizer respond to.
	var stillOpen int
	if err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM auditor_revisions
		WHERE event_id = $1
		  AND status IN ('Draft', 'Sent', 'Viewed', 'In Progress', 'Rejected', 'Expired')
	`, eventID).Scan(&stillOpen); err != nil {
		return err
	}
	if stillOpen == 0 {
		_, _ = r.db.ExecContext(ctx, `UPDATE events SET status = 'pending_review', updated_at = now() WHERE id = $1`, eventID)
	}

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
