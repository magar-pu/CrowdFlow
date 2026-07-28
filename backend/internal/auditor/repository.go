package auditor

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// PostgresAuditorRepository implements Repository using PostgreSQL.
type PostgresAuditorRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresAuditorRepository {
	return &PostgresAuditorRepository{db: db}
}

// ---- Dashboard ----

func (r *PostgresAuditorRepository) GetDashboardStats(ctx context.Context) (*DashboardStats, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var stats DashboardStats

	// 1. Event reviews count (pending_review, approved, rejected)
	queryEvents := `
		SELECT 
			COALESCE(COUNT(*) FILTER (WHERE status = 'pending_review'), 0),
			COALESCE(COUNT(*) FILTER (WHERE status = 'approved'), 0),
			COALESCE(COUNT(*) FILTER (WHERE status = 'rejected'), 0)
		FROM events
	`
	err := r.db.QueryRowContext(ctx, queryEvents).Scan(&stats.PendingReviews, &stats.Approved, &stats.Rejected)
	if err != nil {
		return nil, err
	}

	// 2. Pending organizers applications
	queryOrganizers := `
		SELECT COALESCE(COUNT(*), 0)
		FROM organizer_applications
		WHERE status IN ('pending', 'in_review')
	`
	err = r.db.QueryRowContext(ctx, queryOrganizers).Scan(&stats.PendingOrganizers)
	if err != nil {
		return nil, err
	}

	// 3. Documents waiting review
	queryDocs := `
		SELECT COALESCE(COUNT(*), 0)
		FROM organizer_documents
		WHERE status = 'pending_verification'
	`
	err = r.db.QueryRowContext(ctx, queryDocs).Scan(&stats.DocumentsWaiting)
	if err != nil {
		return nil, err
	}

	// 4. Pending payouts and total amount
	queryPayouts := `
		SELECT 
			COALESCE(COUNT(*), 0),
			COALESCE(SUM(amount), 0.0)
		FROM payouts
		WHERE status = 'pending'
	`
	err = r.db.QueryRowContext(ctx, queryPayouts).Scan(&stats.PendingPayouts, &stats.PendingPayoutAmount)
	if err != nil {
		return nil, err
	}

	// 5. Fraud alerts (default to 0 for now as there's no fraud alert table)
	stats.FraudAlerts = 0

	// 6. Avg review time in hours (from pending_review to approved/rejected in event_status_log)
	queryAvgTime := `
		SELECT COALESCE(
			AVG(EXTRACT(EPOCH FROM (l2.created_at - l1.created_at)) / 3600),
			0.0
		)
		FROM event_status_log l1
		JOIN event_status_log l2 ON l1.event_id = l2.event_id
		WHERE l1.to_status = 'pending_review'
		  AND l2.to_status IN ('approved', 'rejected')
		  AND l2.created_at > l1.created_at
	`
	err = r.db.QueryRowContext(ctx, queryAvgTime).Scan(&stats.AvgReviewTimeHours)
	if err != nil {
		return nil, err
	}

	return &stats, nil
}

func (r *PostgresAuditorRepository) ListRecentActivity(ctx context.Context, limit int) ([]*Activity, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if limit <= 0 {
		limit = 10
	}

	query := `
		SELECT al.id, COALESCE(up.full_name, 'System'), al.action, al.detail, al.created_at
		FROM activity_log al
		LEFT JOIN user_profiles up ON up.user_id = al.actor_id
		ORDER BY al.created_at DESC
		LIMIT $1
	`
	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Non-nil so an empty queue serialises as [] rather than null: clients
	// guard on truthiness and a null would look like a failed request.
	activities := make([]*Activity, 0)
	for rows.Next() {
		var act Activity
		var createdAt time.Time
		err = rows.Scan(&act.ID, &act.ActorName, &act.Action, &act.Detail, &createdAt)
		if err != nil {
			return nil, err
		}
		act.CreatedAt = formatTime(createdAt)
		activities = append(activities, &act)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return activities, nil
}

func (r *PostgresAuditorRepository) ListReviewQueue(ctx context.Context, limit int) ([]*EventReview, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if limit <= 0 {
		limit = 4
	}

	query := `
		SELECT
			e.id,
			e.event_name,
			COALESCE(up.full_name, 'Unknown Organizer'),
			COALESCE(up.avatar_pic, ''),
			COALESCE(e.cover_image_url, ''),
			COALESCE(et.event_type, 'Other'),
			COALESCE(
				(SELECT MIN(created_at) FROM event_status_log WHERE event_id = e.id AND to_status = 'pending_review'),
				e.updated_at
			) AS submitted_at,
			e.updated_at,
			COALESCE(ear.stage, 'Submitted'),
			e.status,
			COALESCE(
				(SELECT COUNT(*) FROM organizer_documents od
				 JOIN organizer_applications oa ON oa.id = od.application_id
				 WHERE oa.user_id = e.organizer_id AND od.status = 'pending_verification'),
				0
			) AS missing_docs,
			COALESCE(
				(SELECT CASE
					WHEN COUNT(*) = 0 THEN 100
					ELSE (COUNT(*) FILTER (WHERE od.status = 'verified') * 100) / COUNT(*)
				 END
				 FROM organizer_documents od
				 JOIN organizer_applications oa ON oa.id = od.application_id
				 WHERE oa.user_id = e.organizer_id),
				100
			) AS compliance_score
		FROM events e
		LEFT JOIN user_profiles up ON up.user_id = e.organizer_id
		LEFT JOIN event_types et ON et.id = e.event_type_id
		LEFT JOIN auditor_event_reviews ear ON ear.event_id = e.id
		WHERE e.status = 'pending_review'
		ORDER BY e.created_at DESC
		LIMIT $1
	`
	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	reviews := make([]*EventReview, 0)
	for rows.Next() {
		var rev EventReview
		var submittedAt, lastUpdated time.Time
		var dbStatus string
		var stageStr string

		err = rows.Scan(
			&rev.ID,
			&rev.EventName,
			&rev.OrganizerName,
			&rev.OrganizerAvatar,
			&rev.BannerURL,
			&rev.Category,
			&submittedAt,
			&lastUpdated,
			&stageStr,
			&dbStatus,
			&rev.MissingDocs,
			&rev.ComplianceScore,
		)
		if err != nil {
			return nil, err
		}

		rev.SubmittedAt = formatTime(submittedAt)
		rev.LastUpdated = formatTime(lastUpdated)
		rev.Stage = ReviewStage(stageStr)
		rev.Status = mapEventReviewStatus(dbStatus)
		rev.BannerURL = formatBannerURL(rev.BannerURL)

		reviews = append(reviews, &rev)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return reviews, nil
}

// ---- Event Reviews ----

func (r *PostgresAuditorRepository) ListEventReviews(ctx context.Context, filters EventReviewFilters) ([]*EventReview, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if filters.Limit <= 0 {
		filters.Limit = 20
	}
	if filters.Page <= 0 {
		filters.Page = 1
	}
	offset := (filters.Page - 1) * filters.Limit

	query := `
		SELECT
			e.id,
			e.event_name,
			COALESCE(up.full_name, 'Unknown Organizer'),
			COALESCE(up.avatar_pic, ''),
			COALESCE(e.cover_image_url, ''),
			COALESCE(et.event_type, 'Other'),
			COALESCE(
				(SELECT MIN(created_at) FROM event_status_log WHERE event_id = e.id AND to_status = 'pending_review'),
				e.updated_at
			) AS submitted_at,
			e.updated_at,
			COALESCE(ear.stage, 'Submitted'),
			e.status,
			COALESCE(
				(SELECT COUNT(*) FROM organizer_documents od
				 JOIN organizer_applications oa ON oa.id = od.application_id
				 WHERE oa.user_id = e.organizer_id AND od.status = 'pending_verification'),
				0
			) AS missing_docs,
			COALESCE(
				(SELECT CASE
					WHEN COUNT(*) = 0 THEN 100
					ELSE (COUNT(*) FILTER (WHERE od.status = 'verified') * 100) / COUNT(*)
				 END
				 FROM organizer_documents od
				 JOIN organizer_applications oa ON oa.id = od.application_id
				 WHERE oa.user_id = e.organizer_id),
				100
			) AS compliance_score
		FROM events e
		LEFT JOIN user_profiles up ON up.user_id = e.organizer_id
		LEFT JOIN event_types et ON et.id = e.event_type_id
		LEFT JOIN auditor_event_reviews ear ON ear.event_id = e.id
		WHERE e.status IN ('pending_review', 'approved', 'rejected', 'needs_revision')
	`

	args := []interface{}{}
	argIndex := 1

	if filters.Status != "" {
		dbStatus := "pending_review"
		sLower := strings.ToLower(filters.Status)
		if sLower == "approved" {
			dbStatus = "approved"
		} else if sLower == "rejected" {
			dbStatus = "rejected"
		} else if sLower == "changes requested" || sLower == "needs_revision" {
			dbStatus = "needs_revision"
		}
		query += fmt.Sprintf(" AND e.status = $%d", argIndex)
		args = append(args, dbStatus)
		argIndex++
	}

	if filters.Search != "" {
		query += fmt.Sprintf(" AND (e.event_name ILIKE $%d OR up.full_name ILIKE $%d)", argIndex, argIndex)
		args = append(args, "%"+filters.Search+"%")
		argIndex++
	}

	query += fmt.Sprintf(" ORDER BY e.created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, filters.Limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	reviews := make([]*EventReview, 0)
	for rows.Next() {
		var rev EventReview
		var submittedAt, lastUpdated time.Time
		var dbStatus string
		var stageStr string

		err = rows.Scan(
			&rev.ID,
			&rev.EventName,
			&rev.OrganizerName,
			&rev.OrganizerAvatar,
			&rev.BannerURL,
			&rev.Category,
			&submittedAt,
			&lastUpdated,
			&stageStr,
			&dbStatus,
			&rev.MissingDocs,
			&rev.ComplianceScore,
		)
		if err != nil {
			return nil, err
		}

		rev.SubmittedAt = formatTime(submittedAt)
		rev.LastUpdated = formatTime(lastUpdated)
		rev.Stage = ReviewStage(stageStr)
		rev.Status = mapEventReviewStatus(dbStatus)
		rev.BannerURL = formatBannerURL(rev.BannerURL)

		reviews = append(reviews, &rev)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return reviews, nil
}

func (r *PostgresAuditorRepository) GetEventReview(ctx context.Context, eventID int) (*EventReview, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var rev EventReview

	// 1. Fetch main event info & organizer/venue/stage info
	queryEvent := `
		SELECT
			e.id,
			e.event_name,
			COALESCE(up.full_name, 'Unknown Organizer'),
			COALESCE(up.avatar_pic, ''),
			COALESCE(e.cover_image_url, ''),
			COALESCE(et.event_type, 'Other'),
			COALESCE(
				(SELECT MIN(created_at) FROM event_status_log WHERE event_id = e.id AND to_status = 'pending_review'),
				e.updated_at
			) AS submitted_at,
			e.updated_at,
			COALESCE(ear.stage, 'Submitted'),
			e.status,
			COALESCE(ear.notes, ''),
			COALESCE(ear.assigned_auditor_name, ''),
			COALESCE(v.name, 'No Venue'),
			e.event_start,
			COALESCE(v.address || ', ' || v.city || ', ' || v.province, ''),
			COALESCE(v.total_capacity, 0),
			e.entertainment_tax_rate,
			e.organizer_id,
			COALESCE(oa.id, 0),
			COALESCE(oa.business_name, ''),
			COALESCE(oa.business_email, ''),
			COALESCE(oa.business_phone, ''),
			COALESCE(oa.business_address, ''),
			COALESCE(oa.status::text, ''),
			COALESCE(e.description, ''),
			e.layout_id,
			e.venue_id
		FROM events e
		LEFT JOIN user_profiles up ON up.user_id = e.organizer_id
		LEFT JOIN event_types et ON et.id = e.event_type_id
		LEFT JOIN venues v ON v.id = e.venue_id
		LEFT JOIN auditor_event_reviews ear ON ear.event_id = e.id
		LEFT JOIN organizer_applications oa ON oa.user_id = e.organizer_id
		WHERE e.id = $1
	`
	var submittedAt, lastUpdated, eventStart time.Time
	var dbStatus, stageStr string
	var taxRate float64
	var organizerID int
	var applicationStatus, description string
	var layoutID, venueID sql.NullInt64

	err := r.db.QueryRowContext(ctx, queryEvent, eventID).Scan(
		&rev.ID,
		&rev.EventName,
		&rev.OrganizerName,
		&rev.OrganizerAvatar,
		&rev.BannerURL,
		&rev.Category,
		&submittedAt,
		&lastUpdated,
		&stageStr,
		&dbStatus,
		&rev.Notes,
		&rev.AssignedAuditor,
		&rev.Venue,
		&eventStart,
		&rev.VenueAddress,
		&rev.Capacity,
		&taxRate,
		&organizerID,
		&rev.OrganizerDetail.ApplicationID,
		&rev.OrganizerDetail.CompanyName,
		&rev.OrganizerDetail.Email,
		&rev.OrganizerDetail.Phone,
		&rev.OrganizerDetail.Address,
		&applicationStatus,
		&description,
		&layoutID,
		&venueID,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	rev.SubmittedAt = formatTime(submittedAt)
	rev.LastUpdated = formatTime(lastUpdated)
	rev.Date = eventStart.Format("2006-01-02 15:04")
	rev.Stage = ReviewStage(stageStr)
	rev.Status = mapEventReviewStatus(dbStatus)
	rev.BannerURL = formatBannerURL(rev.BannerURL)
	// The PIC is the person who owns the account; the company name comes from
	// their application. Fall back to the account name when no application row
	// exists so the card never renders blank.
	rev.OrganizerDetail.Pic = rev.OrganizerName
	if rev.OrganizerDetail.CompanyName == "" {
		rev.OrganizerDetail.CompanyName = rev.OrganizerName
	}

	// 2. Fetch the documents backing this review, from BOTH sources:
	//   - organizer_documents: the organizer's account-level paperwork (KTP, NPWP,
	//     NIB), submitted once when they applied and reused for every event.
	//   - event_documents: submitted for THIS event specifically (proposal, crowd
	//     permit, PIC id, venue permit).
	//
	// The two tables have independent SERIAL sequences, so `source` is carried
	// through to the client — an id on its own does not identify a document, and
	// verify/reject route on the pair.
	queryDocs := `
		SELECT
			od.id,
			'` + DocSourceOrganizer + `' AS source,
			od.document_type,
			od.file_path,
			od.status::text,
			od.uploaded_at,
			NULL::text AS review_notes
		FROM organizer_documents od
		JOIN organizer_applications oa ON oa.id = od.application_id
		JOIN events e ON e.organizer_id = oa.user_id
		WHERE e.id = $1

		UNION ALL

		SELECT
			ed.id,
			'` + DocSourceEvent + `' AS source,
			ed.document_type,
			ed.file_path,
			ed.status::text,
			ed.uploaded_at,
			ed.review_notes
		FROM event_documents ed
		WHERE ed.event_id = $1

		ORDER BY source DESC, uploaded_at DESC
	`
	rowsDocs, err := r.db.QueryContext(ctx, queryDocs, eventID)
	if err != nil {
		return nil, err
	}
	defer rowsDocs.Close()

	rev.Documents = []ReviewDoc{}
	var missingCount int
	var verifiedCount int
	var totalDocs int
	var licenseStatus string
	// Which required per-event documents actually arrived, so a genuinely absent
	// one can be reported rather than silently omitted.
	presentEventDocs := map[string]bool{}

	for rowsDocs.Next() {
		var doc ReviewDoc
		var docStatus string
		var uploadedAt time.Time
		var reviewNotes sql.NullString
		err = rowsDocs.Scan(&doc.ID, &doc.Source, &doc.DocumentType, &doc.FileURL, &docStatus, &uploadedAt, &reviewNotes)
		if err != nil {
			return nil, err
		}
		doc.Status = mapVerificationStatus(docStatus)
		doc.UploadedAt = formatTime(uploadedAt)
		if reviewNotes.Valid {
			doc.ReviewNotes = reviewNotes.String
		}

		if doc.Source == DocSourceEvent {
			presentEventDocs[doc.DocumentType] = true
			doc.Category = eventDocCategory(doc.DocumentType)
			doc.DocumentType = eventDocLabel(doc.DocumentType)
		} else {
			// Map category dynamically
			switch strings.ToUpper(doc.DocumentType) {
			case "KTP", "NPWP", "SIUP", "NIB":
				doc.Category = "Permits & Licenses"
			default:
				doc.Category = "Supporting Documents"
			}
			// There is no licence-number column anywhere in the schema. The
			// closest real signal is whether the organizer's registration
			// document has been verified, so report that instead of a number.
			if t := strings.ToUpper(doc.DocumentType); t == "NIB" || t == "SIUP" {
				// A verified licence wins over a pending one when the organizer
				// uploaded both NIB and SIUP.
				if licenseStatus == "" || doc.Status == "verified" {
					licenseStatus = t + " — " + licenseStatusLabel(doc.Status)
				}
			}
		}

		if doc.Status == "pending" {
			missingCount++
		} else if doc.Status == "verified" {
			verifiedCount++
		}
		totalDocs++
		rev.Documents = append(rev.Documents, doc)
	}
	if err = rowsDocs.Err(); err != nil {
		return nil, err
	}

	// A required event document that was never uploaded is a MISSING row rather
	// than an absence. Without this the auditor sees three documents and no
	// indication that a fourth was required — the publish gate blocks this in
	// normal flow, but an event submitted before the gate existed can reach here.
	for _, t := range requiredEventDocTypes {
		if presentEventDocs[t] {
			continue
		}
		rev.Documents = append(rev.Documents, ReviewDoc{
			Source:       DocSourceEvent,
			DocumentType: eventDocLabel(t),
			Category:     eventDocCategory(t),
			Status:       "missing",
		})
		missingCount++
		totalDocs++
	}
	rev.MissingDocs = missingCount
	if totalDocs == 0 {
		rev.ComplianceScore = 100
	} else {
		rev.ComplianceScore = (verifiedCount * 100) / totalDocs
	}

	if licenseStatus == "" {
		licenseStatus = "No NIB/SIUP on file"
	}
	rev.OrganizerDetail.BusinessLicense = licenseStatus

	// 3. Fetch Ticket Tiers & Financial metrics.
	//
	// A tier's real capacity depends on how it sells. Once seats are painted
	// with a tier, stock comes from event_seats_matrix and allocation_limit is
	// never consulted again — so pricing a seated event off allocation_limit
	// produced a projected revenue derived from a number the booking system
	// ignores (and 0 whenever the organizer left the field alone).
	queryTiers := `
		SELECT
			t.name,
			t.price,
			t.allocation_limit,
			t.tickets_sold,
			COALESCE((
				SELECT COUNT(*) FROM event_seats_matrix m
				WHERE m.event_id = $1 AND m.ticket_tier_id = t.id
			), 0) AS seat_count
		FROM ticket_tiers t
		WHERE t.event_id = $1
	`
	rowsTiers, err := r.db.QueryContext(ctx, queryTiers, eventID)
	if err != nil {
		return nil, err
	}
	defer rowsTiers.Close()

	tiers := []ReviewTicketTier{}
	var projectedRev float64
	var totalSold int
	for rowsTiers.Next() {
		var tier ReviewTicketTier
		var name string
		var price float64
		var capLimit int
		var sold int
		var seatCount int

		err = rowsTiers.Scan(&name, &price, &capLimit, &sold, &seatCount)
		if err != nil {
			return nil, err
		}

		// Seats painted with this tier win over allocation_limit; that is the
		// rule booking/service.go applies via IsAssignedSeating.
		capacity := capLimit
		tier.AssignedSeating = seatCount > 0
		if tier.AssignedSeating {
			capacity = seatCount
		}

		tier.Category = name
		tier.Price = price
		tier.Seats = capacity
		tier.Sold = sold
		if capacity > 0 && sold >= capacity {
			tier.Status = "Sold Out"
		} else {
			tier.Status = "Available"
		}
		projectedRev += price * float64(capacity)
		totalSold += sold
		tiers = append(tiers, tier)
	}
	rev.TicketSold = totalSold

	platformFee := projectedRev * 0.05
	gatewayFee := projectedRev * 0.02
	taxAmount := projectedRev * (taxRate / 100)
	netPayout := projectedRev - platformFee - gatewayFee - taxAmount

	// The organizer's real payout destination. user_bank_accounts is preferred
	// because it is the only source carrying a verification flag; the bank
	// columns on organizer_applications (migration 0006) are the fallback for
	// organizers who only ever filled in their application.
	payout := ReviewPayout{EstimatedPayout: netPayout}
	var bankName, bankNumber, bankHolder sql.NullString
	var bankVerified sql.NullBool
	err = r.db.QueryRowContext(ctx, `
		SELECT
			COALESCE(uba.bank_name, oa.bank_name),
			COALESCE(uba.account_number, oa.bank_account_number),
			COALESCE(uba.account_holder_name, oa.bank_account_holder),
			uba.is_verified
		FROM events e
		LEFT JOIN organizer_applications oa ON oa.user_id = e.organizer_id
		LEFT JOIN LATERAL (
			SELECT bank_name, account_number, account_holder_name, is_verified
			FROM user_bank_accounts
			WHERE user_id = e.organizer_id
			ORDER BY is_verified DESC, created_at DESC
			LIMIT 1
		) uba ON TRUE
		WHERE e.id = $1
	`, eventID).Scan(&bankName, &bankNumber, &bankHolder, &bankVerified)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	if bankName.Valid || bankNumber.Valid {
		payout.HasAccount = true
		payout.Bank = bankName.String
		payout.AccountNumber = bankNumber.String
		payout.AccountName = bankHolder.String
		// Only user_bank_accounts can attest verification. An account known
		// solely from the application row is unverified by definition.
		payout.Verified = bankVerified.Valid && bankVerified.Bool
	}

	rev.Finance = ReviewFinance{
		ProjectedRevenue: projectedRev,
		PlatformFee:      platformFee,
		GatewayFee:       gatewayFee,
		TaxAmount:        taxAmount,
		NetPayout:        netPayout,
		TaxRate:          taxRate,
		TicketTiers:      tiers,
		Payout:           payout,
	}

	// 4. Fetch status history
	queryHistory := `
		SELECT COALESCE(up.full_name, 'System'), from_status, to_status, COALESCE(notes, ''), created_at
		FROM event_status_log esl
		LEFT JOIN user_profiles up ON up.user_id = esl.actor_id
		WHERE esl.event_id = $1
		ORDER BY esl.created_at DESC
	`
	rowsHistory, err := r.db.QueryContext(ctx, queryHistory, eventID)
	if err != nil {
		return nil, err
	}
	defer rowsHistory.Close()

	rev.History = []StatusEntry{}
	for rowsHistory.Next() {
		var h StatusEntry
		var actor, fromStatus, toStatus, notes string
		var createdAt time.Time

		err = rowsHistory.Scan(&actor, &fromStatus, &toStatus, &notes, &createdAt)
		if err != nil {
			return nil, err
		}

		h.ActorName = actor
		h.FromStatus = fromStatus
		h.ToStatus = toStatus
		h.Notes = notes
		h.CreatedAt = formatTime(createdAt)
		rev.History = append(rev.History, h)
	}

	// 5. Fetch revisions list
	queryRevisions := `
		SELECT id, category, title, description, required_action, status, created_at,
		       COALESCE(priority, 'Medium'),
		       COALESCE(organizer_comment, ''),
		       COALESCE(organizer_action_taken, ''),
		       COALESCE(organizer_documents_changed, '[]'::jsonb)::text,
		       COALESCE(responded_at::text, '')
		FROM auditor_revisions
		WHERE event_id = $1
		ORDER BY created_at DESC
	`
	rowsRevisions, err := r.db.QueryContext(ctx, queryRevisions, eventID)
	if err != nil {
		return nil, err
	}
	defer rowsRevisions.Close()

	rev.Revisions = []Revision{}
	for rowsRevisions.Next() {
		var revItem Revision
		var createdAt time.Time
		var respondedAtStr string
		var changedJSON string
		err = rowsRevisions.Scan(
			&revItem.ID,
			&revItem.Category,
			&revItem.Title,
			&revItem.Description,
			&revItem.RequiredAction,
			&revItem.Status,
			&createdAt,
			&revItem.Priority,
			&revItem.OrganizerComment,
			&revItem.OrganizerActionTaken,
			&changedJSON,
			&respondedAtStr,
		)
		if err != nil {
			return nil, err
		}
		revItem.DocumentsChanged = []RevisionDocumentChange{}
		_ = json.Unmarshal([]byte(changedJSON), &revItem.DocumentsChanged)
		if respondedAtStr != "" {
			if tResp, errParse := time.Parse(time.RFC3339, respondedAtStr); errParse == nil {
				revItem.RespondedAt = formatTime(tResp)
			} else {
				revItem.RespondedAt = respondedAtStr
			}
		}
		revItem.Deadline = "3 Days"
		revItem.CreatedAt = formatTime(createdAt)
		rev.Revisions = append(rev.Revisions, revItem)
	}

	// 6. Verification checklist — every item is derived from real state. These
	// mirror the organizer's own publish gates, so a green checklist means the
	// submission genuinely cleared them rather than that nobody looked.
	//
	// Seating is only a gate for events with a bound layout: a general-admission
	// event has no seats to price and must not be marked incomplete for it.
	seatingComplete := true
	if layoutID.Valid {
		var untiered int
		err = r.db.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM seats s
			WHERE s.layout_id = $1
			  AND NOT EXISTS (
				SELECT 1 FROM event_seats_matrix m WHERE m.event_id = $2 AND m.seat_id = s.id
			  )
		`, layoutID.Int64, eventID).Scan(&untiered)
		if err != nil {
			return nil, err
		}
		seatingComplete = untiered == 0
	}

	rev.Checklist = []ChecklistItem{
		{Label: "Event Info", Done: rev.EventName != "" && description != "" && !eventStart.IsZero()},
		{Label: "Venue & Seating", Done: venueID.Valid && seatingComplete},
		{Label: "Organizer Profile", Done: applicationStatus == "approved"},
		{Label: "Ticket Configuration", Done: len(tiers) > 0},
	}

	// 7. Compliance history — the organizer's record across their OTHER events.
	// The current event is excluded everywhere so an auditor is never shown this
	// submission as evidence about itself.
	err = r.db.QueryRowContext(ctx, `
		SELECT
			(SELECT COUNT(DISTINCT esl.event_id)
			   FROM event_status_log esl
			   JOIN events pe ON pe.id = esl.event_id
			  WHERE pe.organizer_id = $1 AND pe.id <> $2
			    AND esl.to_status = 'pending_review'),
			(SELECT COUNT(*) FROM events
			  WHERE organizer_id = $1 AND id <> $2 AND status = 'rejected'),
			(SELECT COUNT(*)
			   FROM auditor_revisions ar
			   JOIN events pe ON pe.id = ar.event_id
			  WHERE pe.organizer_id = $1 AND pe.id <> $2),
			(SELECT COUNT(*) FROM events
			  WHERE organizer_id = $1 AND id <> $2 AND status = 'approved')
	`, organizerID, eventID).Scan(
		&rev.ComplianceHistory.PreviousAudits,
		&rev.ComplianceHistory.PreviousViolations,
		&rev.ComplianceHistory.PreviousRevisions,
		&rev.ComplianceHistory.PreviousApprovedEvents,
	)
	if err != nil {
		return nil, err
	}

	return &rev, nil
}

// licenseStatusLabel renders a document verification status for display next to
// a licence type. Statuses arrive lowercase from mapVerificationStatus.
func licenseStatusLabel(status string) string {
	switch status {
	case "verified":
		return "Verified"
	case "rejected":
		return "Rejected"
	case "missing":
		return "Not uploaded"
	default:
		return "Pending review"
	}
}

// organizerLicenceStatus reports the verification state of an organizer's
// business-registration document (NIB or SIUP). The schema stores no licence
// NUMBER, so the auditor-facing "Business License" field carries this status
// string instead.
//
// A verified licence wins over a pending one when the organizer uploaded both.
// Errors are folded into the "no licence" result on purpose: this is one
// display field on a payout, and failing the whole payout load because a
// secondary lookup broke would hide the payout entirely.
func (r *PostgresAuditorRepository) organizerLicenceStatus(ctx context.Context, organizerID int) string {
	const q = `
		SELECT od.document_type, od.status::text
		FROM organizer_documents od
		JOIN organizer_applications oa ON oa.id = od.application_id
		WHERE oa.user_id = $1
		  AND UPPER(od.document_type) IN ('NIB', 'SIUP')
	`
	rows, err := r.db.QueryContext(ctx, q, organizerID)
	if err != nil {
		return "No NIB/SIUP on file"
	}
	defer rows.Close()

	var status string
	for rows.Next() {
		var docType, dbStatus string
		if err := rows.Scan(&docType, &dbStatus); err != nil {
			return "No NIB/SIUP on file"
		}
		mapped := mapVerificationStatus(dbStatus)
		if status == "" || mapped == "verified" {
			status = strings.ToUpper(docType) + " — " + licenseStatusLabel(mapped)
		}
	}
	if err := rows.Err(); err != nil || status == "" {
		return "No NIB/SIUP on file"
	}
	return status
}

func (r *PostgresAuditorRepository) ApproveEventReview(ctx context.Context, eventID, actorID int, notes string) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// get current status
	var fromStatus string
	if err := tx.QueryRowContext(ctx, `SELECT status FROM events WHERE id = $1 FOR UPDATE`, eventID).Scan(&fromStatus); err != nil {
		return err
	}

	var eventName string
	err = tx.QueryRowContext(ctx, `
		UPDATE events SET status = 'approved', updated_at = now()
		WHERE id = $1 AND status != 'approved'
		RETURNING event_name
	`, eventID).Scan(&eventName)
	if err != nil {
		return err
	}

	// Logs
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO event_approval_log (event_id, auditor_id, decision, notes)
		VALUES ($1, $2, 'approved', NULLIF($3, ''))
	`, eventID, actorID, notes); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO event_status_log (event_id, actor_id, from_status, to_status, notes)
		VALUES ($1, $2, $3::event_status, 'approved', NULLIF($4, ''))
	`, eventID, actorID, fromStatus, notes); err != nil {
		return err
	}

	// Update auditor_event_reviews stage to Final Approval
	var actorName string
	_ = tx.QueryRowContext(ctx, `SELECT full_name FROM user_profiles WHERE user_id = $1`, actorID).Scan(&actorName)

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO auditor_event_reviews (event_id, stage, notes, assigned_auditor_name, updated_at)
		VALUES ($1, 'Final Approval', $2, $3, now())
		ON CONFLICT (event_id) 
		DO UPDATE SET stage = 'Final Approval', notes = $2, assigned_auditor_name = $3, updated_at = now()
	`, eventID, notes, actorName); err != nil {
		return err
	}

	detail := fmt.Sprintf("Approved event %q. Notes: %s", eventName, notes)
	if _, err := tx.ExecContext(ctx, `INSERT INTO activity_log (actor_id, action, detail) VALUES ($1, 'Approve Event', $2)`, actorID, detail); err != nil {
		return err
	}

	var organizerUserID int
	_ = tx.QueryRowContext(ctx, `SELECT organizer_id FROM events WHERE id = $1`, eventID).Scan(&organizerUserID)

	err = tx.Commit()
	if err != nil {
		return err
	}

	// Notify AFTER the commit, never inside it. A failed statement aborts the
	// whole Postgres transaction, so an ignored error here (`_, _ =`) could not
	// do what it looked like it did - it silently poisoned the tx and the
	// approval came back as "commit unexpectedly resulted in rollback".
	go func() {
		msg := fmt.Sprintf("Event %q has been approved by an auditor.", eventName)
		if organizerUserID > 0 {
			_ = r.CreateNotification(context.Background(), organizerUserID, "✅ Event Approved!", msg, "event", strconv.Itoa(eventID))
		}
		_ = r.CreateNotificationForAuditors(context.Background(), "✅ Event Approved", msg, "event", strconv.Itoa(eventID))
	}()

	return nil
}

func (r *PostgresAuditorRepository) RejectEventReview(ctx context.Context, eventID, actorID int, reason, notes string) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var fromStatus string
	if err := tx.QueryRowContext(ctx, `SELECT status FROM events WHERE id = $1 FOR UPDATE`, eventID).Scan(&fromStatus); err != nil {
		return err
	}

	var eventName string
	err = tx.QueryRowContext(ctx, `
		UPDATE events SET status = 'rejected', updated_at = now()
		WHERE id = $1 AND status != 'rejected'
		RETURNING event_name
	`, eventID).Scan(&eventName)
	if err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO event_approval_log (event_id, auditor_id, decision, notes)
		VALUES ($1, $2, 'rejected', NULLIF($3, ''))
	`, eventID, actorID, reason+" | "+notes); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO event_status_log (event_id, actor_id, from_status, to_status, notes)
		VALUES ($1, $2, $3::event_status, 'rejected', NULLIF($4, ''))
	`, eventID, actorID, fromStatus, reason+" | "+notes); err != nil {
		return err
	}

	detail := fmt.Sprintf("Rejected event %q. Reason: %s. Notes: %s", eventName, reason, notes)
	if _, err := tx.ExecContext(ctx, `INSERT INTO activity_log (actor_id, action, detail) VALUES ($1, 'Reject Event', $2)`, actorID, detail); err != nil {
		return err
	}

	var organizerUserID int
	_ = tx.QueryRowContext(ctx, `SELECT organizer_id FROM events WHERE id = $1`, eventID).Scan(&organizerUserID)

	err = tx.Commit()
	if err != nil {
		return err
	}

	// After the commit - see the note in ApproveEventReview.
	go func() {
		if organizerUserID > 0 {
			_ = r.CreateNotification(context.Background(), organizerUserID, "❌ Event Rejected",
				fmt.Sprintf("Event %q was rejected by an auditor. Reason: %s. Notes: %s", eventName, reason, notes), "event", strconv.Itoa(eventID))
		}
		_ = r.CreateNotificationForAuditors(context.Background(), "❌ Event Rejected", fmt.Sprintf("Event %q has been rejected. Reason: %s", eventName, reason), "event", strconv.Itoa(eventID))
	}()

	return nil
}

func (r *PostgresAuditorRepository) RequestEventChanges(ctx context.Context, eventID, actorID int, notes string) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var fromStatus string
	if err := tx.QueryRowContext(ctx, `SELECT status FROM events WHERE id = $1 FOR UPDATE`, eventID).Scan(&fromStatus); err != nil {
		return err
	}

	var eventName string
	_ = tx.QueryRowContext(ctx, `SELECT event_name FROM events WHERE id = $1`, eventID).Scan(&eventName)

	// Update events status to needs_revision
	if _, err := tx.ExecContext(ctx, `UPDATE events SET status = 'needs_revision', updated_at = now() WHERE id = $1`, eventID); err != nil {
		return err
	}

	// Log to event_status_log representing changes requested
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO event_status_log (event_id, actor_id, from_status, to_status, notes)
		VALUES ($1, $2, $3::event_status, 'needs_revision'::event_status, NULLIF($4, ''))
	`, eventID, actorID, fromStatus, "Changes Requested: "+notes); err != nil {
		return err
	}

	var actorName string
	_ = tx.QueryRowContext(ctx, `SELECT full_name FROM user_profiles WHERE user_id = $1`, actorID).Scan(&actorName)

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO auditor_event_reviews (event_id, stage, notes, assigned_auditor_name, updated_at)
		VALUES ($1, 'Document Verification', $2, $3, now())
		ON CONFLICT (event_id) 
		DO UPDATE SET notes = $2, assigned_auditor_name = $3, updated_at = now()
	`, eventID, notes, actorName); err != nil {
		return err
	}

	detail := fmt.Sprintf("Requested changes for event %q. Notes: %s", eventName, notes)
	if _, err := tx.ExecContext(ctx, `INSERT INTO activity_log (actor_id, action, detail) VALUES ($1, 'Request Changes', $2)`, actorID, detail); err != nil {
		return err
	}

	var organizerUserID int
	_ = tx.QueryRowContext(ctx, `SELECT organizer_id FROM events WHERE id = $1`, eventID).Scan(&organizerUserID)

	if err := tx.Commit(); err != nil {
		return err
	}

	// After the commit - see the note in ApproveEventReview.
	go func() {
		if organizerUserID > 0 {
			_ = r.CreateNotification(context.Background(), organizerUserID, "⚠️ Event Revision Required",
				fmt.Sprintf("Event %q requires revision. Auditor notes: %s", eventName, notes), "event", strconv.Itoa(eventID))
		}
	}()

	return nil
}

func (r *PostgresAuditorRepository) UpdateEventReviewStage(ctx context.Context, eventID, actorID int, stage ReviewStage) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var actorName string
	err := r.db.QueryRowContext(ctx, `SELECT full_name FROM user_profiles WHERE user_id = $1`, actorID).Scan(&actorName)
	if err != nil {
		actorName = "Auditor"
	}

	_, err = r.db.ExecContext(ctx, `
		INSERT INTO auditor_event_reviews (event_id, stage, assigned_auditor_name, updated_at)
		VALUES ($1, $2, $3, now())
		ON CONFLICT (event_id)
		DO UPDATE SET stage = $2, assigned_auditor_name = $3, updated_at = now()
	`, eventID, string(stage), actorName)
	return err
}

func (r *PostgresAuditorRepository) AddEventRevision(ctx context.Context, eventID, actorID int, req AddRevisionRequest) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var deadlineVal interface{} = nil
	if req.Deadline != "" {
		if t, err := time.Parse("2006-01-02", req.Deadline); err == nil {
			deadlineVal = t
		}
	}

	priorityVal := req.Priority
	if priorityVal == "" {
		priorityVal = "High"
	}

	categoryVal := req.Category
	if categoryVal == "" {
		categoryVal = "Documents"
	}

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO auditor_revisions (event_id, auditor_id, category, title, description, required_action, priority, status, deadline, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'Sent', $8, now())
	`, eventID, actorID, categoryVal, req.Title, req.Description, req.RequiredAction, priorityVal, deadlineVal)
	if err != nil {
		return err
	}

	// Update event status to needs_revision
	_, _ = r.db.ExecContext(ctx, `UPDATE events SET status = 'needs_revision', updated_at = now() WHERE id = $1`, eventID)

	var organizerUserID int
	var eventName string
	_ = r.db.QueryRowContext(ctx, `SELECT organizer_id, event_name FROM events WHERE id = $1`, eventID).Scan(&organizerUserID, &eventName)
	if organizerUserID > 0 {
		_, _ = r.db.ExecContext(ctx, `
			INSERT INTO notifications (user_id, title, detail, resource_type, resource_id, is_read, created_at)
			VALUES ($1, $2, $3, 'event', $4, FALSE, now())
		`, organizerUserID, fmt.Sprintf("⚠️ Revision Required: %s", req.Title), fmt.Sprintf("Event %q requires action: %s (%s)", eventName, req.RequiredAction, req.Description), strconv.Itoa(eventID))
	}

	return nil
}

func (r *PostgresAuditorRepository) UpdateRevisionStatus(ctx context.Context, revID, actorID int, status string) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var eventID int
	var title string
	err := r.db.QueryRowContext(ctx, `SELECT event_id, title FROM auditor_revisions WHERE id = $1`, revID).Scan(&eventID, &title)
	if err != nil {
		return fmt.Errorf("revision item not found")
	}

	_, err = r.db.ExecContext(ctx, `UPDATE auditor_revisions SET status = $1, updated_at = now() WHERE id = $2`, status, revID)
	if err != nil {
		return err
	}

	var organizerUserID int
	var eventName string
	_ = r.db.QueryRowContext(ctx, `SELECT organizer_id, event_name FROM events WHERE id = $1`, eventID).Scan(&organizerUserID, &eventName)

	if status == "Resolved" {
		var unresolvedCount int
		_ = r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM auditor_revisions WHERE event_id = $1 AND status != 'Resolved'`, eventID).Scan(&unresolvedCount)
		if unresolvedCount == 0 {
			_, _ = r.db.ExecContext(ctx, `UPDATE events SET status = 'approved', updated_at = now() WHERE id = $1`, eventID)
		}
		if organizerUserID > 0 {
			_, _ = r.db.ExecContext(ctx, `
				INSERT INTO notifications (user_id, title, detail, resource_type, resource_id, is_read, created_at)
				VALUES ($1, $2, $3, 'event', $4, FALSE, now())
			`, organizerUserID, fmt.Sprintf("✅ Revision Approved: %s", title), fmt.Sprintf("An auditor approved the revision fix for event %q.", eventName), strconv.Itoa(eventID))
		}
	} else if status == "Sent" || status == "Draft" {
		_, _ = r.db.ExecContext(ctx, `UPDATE events SET status = 'needs_revision', updated_at = now() WHERE id = $1`, eventID)
		if organizerUserID > 0 {
			_, _ = r.db.ExecContext(ctx, `
				INSERT INTO notifications (user_id, title, detail, resource_type, resource_id, is_read, created_at)
				VALUES ($1, $2, $3, 'event', $4, FALSE, now())
			`, organizerUserID, fmt.Sprintf("⚠️ Further Revision Required: %s", title), fmt.Sprintf("An auditor requested further changes for event %q.", eventName), strconv.Itoa(eventID))
		}
	} else if status == "Rejected" {
		_, _ = r.db.ExecContext(ctx, `UPDATE events SET status = 'rejected', updated_at = now() WHERE id = $1`, eventID)
		if organizerUserID > 0 {
			_, _ = r.db.ExecContext(ctx, `
				INSERT INTO notifications (user_id, title, detail, resource_type, resource_id, is_read, created_at)
				VALUES ($1, $2, $3, 'event', $4, FALSE, now())
			`, organizerUserID, fmt.Sprintf("❌ Revision Rejected: %s", title), fmt.Sprintf("An auditor rejected the submitted revision for event %q.", eventName), strconv.Itoa(eventID))
		}
	}

	return nil
}

func (r *PostgresAuditorRepository) VerifyReviewDocument(ctx context.Context, docID, actorID int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `
		UPDATE organizer_documents SET status = 'verified' WHERE id = $1
	`, docID)
	if err != nil {
		return err
	}

	var exists bool
	err = tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM auditor_document_reviews WHERE document_id = $1)", docID).Scan(&exists)
	if err != nil {
		return err
	}

	if exists {
		_, err = tx.ExecContext(ctx, `
			UPDATE auditor_document_reviews
			SET reviewer_id = $1, decision = 'verified', notes = 'Document verified successfully', reviewed_at = now()
			WHERE document_id = $2
		`, actorID, docID)
	} else {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO auditor_document_reviews (document_id, reviewer_id, decision, notes, reviewed_at)
			VALUES ($1, $2, 'verified', 'Document verified successfully', now())
		`, docID, actorID)
	}
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *PostgresAuditorRepository) RejectReviewDocument(ctx context.Context, docID, actorID int, reason string) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `
		UPDATE organizer_documents SET status = 'rejected' WHERE id = $1
	`, docID)
	if err != nil {
		return err
	}

	var exists bool
	err = tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM auditor_document_reviews WHERE document_id = $1)", docID).Scan(&exists)
	if err != nil {
		return err
	}

	if exists {
		_, err = tx.ExecContext(ctx, `
			UPDATE auditor_document_reviews
			SET reviewer_id = $1, decision = 'rejected', notes = $2, reviewed_at = now()
			WHERE document_id = $3
		`, actorID, reason, docID)
	} else {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO auditor_document_reviews (document_id, reviewer_id, decision, notes, reviewed_at)
			VALUES ($1, $2, 'rejected', $3, now())
		`, docID, actorID, reason)
	}
	if err != nil {
		return err
	}

	return tx.Commit()
}

// ---- Documents ----

func (r *PostgresAuditorRepository) ListDocuments(ctx context.Context, filters DocumentFilters) ([]*Document, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if filters.Limit <= 0 {
		filters.Limit = 20
	}
	if filters.Page <= 0 {
		filters.Page = 1
	}
	offset := (filters.Page - 1) * filters.Limit

	query := `
		SELECT
			od.id,
			od.application_id,
			od.document_type,
			od.file_path,
			od.status,
			od.uploaded_at,
			COALESCE(up.full_name, 'Unknown Organizer'),
			COALESCE(
				(SELECT event_name FROM events WHERE organizer_id = oa.user_id ORDER BY created_at DESC LIMIT 1),
				'Organizer Registration'
			) AS event_name
		FROM organizer_documents od
		JOIN organizer_applications oa ON oa.id = od.application_id
		LEFT JOIN user_profiles up ON up.user_id = oa.user_id
		WHERE od.document_type NOT IN ('KTP', 'NPWP', 'NIB', 'SIUP', 'ktp', 'npwp', 'nib', 'siup')
	`
	args := []interface{}{}
	argIndex := 1

	if filters.Status != "" {
		dbStatus := "pending_verification"
		sUpper := strings.ToUpper(filters.Status)
		if sUpper == "VERIFIED" {
			dbStatus = "verified"
		} else if sUpper == "REJECTED" {
			dbStatus = "rejected"
		}
		query += fmt.Sprintf(" AND od.status = $%d", argIndex)
		args = append(args, dbStatus)
		argIndex++
	}

	if filters.Search != "" {
		query += fmt.Sprintf(" AND (od.document_type ILIKE $%d OR up.full_name ILIKE $%d)", argIndex, argIndex)
		args = append(args, "%"+filters.Search+"%")
		argIndex++
	}

	query += fmt.Sprintf(" ORDER BY od.uploaded_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, filters.Limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	docs := make([]*Document, 0)
	for rows.Next() {
		var doc Document
		var dbStatus string
		var uploadedAt time.Time

		err = rows.Scan(
			&doc.ID,
			&doc.ApplicationID,
			&doc.DocumentType,
			&doc.FileURL,
			&dbStatus,
			&uploadedAt,
			&doc.OrganizerName,
			&doc.EventName,
		)
		if err != nil {
			return nil, err
		}

		doc.Status = strings.ToUpper(mapVerificationStatus(dbStatus))
		if doc.Status == "PENDING" {
			doc.Status = "WAITING REVIEW"
		}
		doc.UploadedAt = formatTime(uploadedAt)

		// Map category dynamically
		switch strings.ToUpper(doc.DocumentType) {
		case "KTP", "NPWP", "SIUP", "NIB":
			doc.Category = "Permits & Licenses"
		default:
			doc.Category = "Supporting Documents"
		}

		// Filter category client-side if category filter is specified
		if filters.Category != "" && doc.Category != filters.Category {
			continue
		}

		docs = append(docs, &doc)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return docs, nil
}

func (r *PostgresAuditorRepository) GetDocument(ctx context.Context, docID int) (*Document, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `
		SELECT
			od.id,
			od.application_id,
			od.document_type,
			od.file_path,
			od.status,
			od.uploaded_at,
			COALESCE(up.full_name, 'Unknown Organizer'),
			COALESCE(
				(SELECT event_name FROM events WHERE organizer_id = oa.user_id ORDER BY created_at DESC LIMIT 1),
				'Organizer Registration'
			) AS event_name
		FROM organizer_documents od
		JOIN organizer_applications oa ON oa.id = od.application_id
		LEFT JOIN user_profiles up ON up.user_id = oa.user_id
		WHERE od.id = $1
	`
	var doc Document
	var dbStatus string
	var uploadedAt time.Time

	err := r.db.QueryRowContext(ctx, query, docID).Scan(
		&doc.ID,
		&doc.ApplicationID,
		&doc.DocumentType,
		&doc.FileURL,
		&dbStatus,
		&uploadedAt,
		&doc.OrganizerName,
		&doc.EventName,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	doc.Status = strings.ToUpper(mapVerificationStatus(dbStatus))
	if doc.Status == "PENDING" {
		doc.Status = "WAITING REVIEW"
	}
	doc.UploadedAt = formatTime(uploadedAt)

	switch strings.ToUpper(doc.DocumentType) {
	case "KTP", "NPWP", "SIUP", "NIB":
		doc.Category = "Permits & Licenses"
	default:
		doc.Category = "Supporting Documents"
	}

	return &doc, nil
}

func (r *PostgresAuditorRepository) VerifyDocument(ctx context.Context, docID, actorID int) error {
	return r.VerifyReviewDocument(ctx, docID, actorID)
}

func (r *PostgresAuditorRepository) RejectDocument(ctx context.Context, docID, actorID int, reason string) error {
	return r.RejectReviewDocument(ctx, docID, actorID, reason)
}

// ---- Organizer Verification ----

// ---- Organizer Verification ----

func (r *PostgresAuditorRepository) ListOrganizers(ctx context.Context, filters OrganizerFilters) ([]*OrganizerVerification, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if filters.Limit <= 0 {
		filters.Limit = 20
	}
	if filters.Page <= 0 {
		filters.Page = 1
	}
	offset := (filters.Page - 1) * filters.Limit

	query := `
		SELECT
			oa.id,
			COALESCE(up.full_name, 'Unknown user'),
			oa.business_name,
			oa.status,
			oa.submitted_at,
			COALESCE(oa.reviewed_at, oa.submitted_at) AS last_activity,
			oa.business_type,
			oa.business_email,
			oa.business_phone,
			COALESCE(oa.website, ''),
			COALESCE(oa.description, ''),
			COALESCE(oa.notes, ''),
			COALESCE(
				(SELECT COUNT(*) FROM organizer_documents WHERE application_id = oa.id AND status = 'pending_verification'),
				0
			) AS pending_doc_count
		FROM organizer_applications oa
		LEFT JOIN user_profiles up ON up.user_id = oa.user_id
		WHERE 1=1
	`

	args := []interface{}{}
	argIndex := 1

	if filters.Status != "" {
		dbStatus := strings.ToLower(filters.Status)
		if dbStatus == "verified" {
			dbStatus = "approved"
		} else if dbStatus == "need revision" {
			dbStatus = "in_review"
		}
		query += fmt.Sprintf(" AND oa.status = $%d::application_status", argIndex)
		args = append(args, dbStatus)
		argIndex++
	}

	if filters.Search != "" {
		query += fmt.Sprintf(" AND (oa.business_name ILIKE $%d OR up.full_name ILIKE $%d)", argIndex, argIndex)
		args = append(args, "%"+filters.Search+"%")
		argIndex++
	}

	query += fmt.Sprintf(" ORDER BY oa.submitted_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, filters.Limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*OrganizerVerification, 0)
	for rows.Next() {
		var org OrganizerVerification
		var submittedAt, lastAct time.Time
		var dbStatus string

		err = rows.Scan(
			&org.ID,
			&org.Name,
			&org.CompanyName,
			&dbStatus,
			&submittedAt,
			&lastAct,
			&org.BusinessType,
			&org.PicEmail,
			&org.PicPhone,
			&org.Website,
			&org.Description,
			&org.InternalNotes,
			&org.PendingDocCount,
		)
		if err != nil {
			return nil, err
		}

		org.Status = mapOrganizerStatus(dbStatus)
		org.RegistrationDate = formatTime(submittedAt)
		org.LastActivity = formatTime(lastAct)
		org.Documents = []ReviewDoc{}
		org.History = []OrganizerHistoryEntry{}

		list = append(list, &org)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return list, nil
}

func (r *PostgresAuditorRepository) GetOrganizer(ctx context.Context, appID int) (*OrganizerVerification, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `
		SELECT
			oa.id,
			COALESCE(up.full_name, 'Unknown user'),
			oa.business_name,
			oa.status,
			oa.submitted_at,
			COALESCE(oa.reviewed_at, oa.submitted_at) AS last_activity,
			oa.business_type,
			oa.business_email,
			oa.business_phone,
			COALESCE(oa.website, ''),
			COALESCE(oa.description, ''),
			COALESCE(oa.notes, ''),
			COALESCE(oa.bank_name, ''),
			COALESCE(oa.bank_account_holder, ''),
			COALESCE(oa.bank_account_number, ''),
			COALESCE(oa.bank_verification_status, 'unverified'),
			COALESCE(vb.full_name, ''),
			COALESCE(to_char(oa.bank_verified_at, 'YYYY-MM-DD HH24:MI'), ''),
			COALESCE(oa.business_address, '')
		FROM organizer_applications oa
		LEFT JOIN user_profiles up ON up.user_id = oa.user_id
		LEFT JOIN user_profiles vb ON vb.user_id = oa.bank_verified_by
		WHERE oa.id = $1
	`
	var org OrganizerVerification
	var submittedAt, lastAct time.Time
	var dbStatus string

	err := r.db.QueryRowContext(ctx, query, appID).Scan(
		&org.ID,
		&org.Name,
		&org.CompanyName,
		&dbStatus,
		&submittedAt,
		&lastAct,
		&org.BusinessType,
		&org.PicEmail,
		&org.PicPhone,
		&org.Website,
		&org.Description,
		&org.InternalNotes,
		&org.BankName,
		&org.BankAccountHolder,
		&org.BankAccountNumber,
		&org.BankVerificationStatus,
		&org.BankVerifiedBy,
		&org.BankVerifiedAt,
		&org.Address,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	org.Status = mapOrganizerStatus(dbStatus)
	org.RegistrationDate = formatTime(submittedAt)
	org.LastActivity = formatTime(lastAct)

	// Fetch organizer documents
	queryDocs := `
		SELECT id, document_type, file_path, status, uploaded_at
		FROM organizer_documents
		WHERE application_id = $1
	`
	rows, err := r.db.QueryContext(ctx, queryDocs, appID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	org.Documents = []ReviewDoc{}
	var pendingDocsCount int
	for rows.Next() {
		var doc ReviewDoc
		var docStatus string
		var docUploadedAt time.Time

		err = rows.Scan(&doc.ID, &doc.DocumentType, &doc.FileURL, &docStatus, &docUploadedAt)
		if err != nil {
			return nil, err
		}

		doc.Status = mapVerificationStatus(docStatus)
		doc.UploadedAt = formatTime(docUploadedAt)

		// Map category dynamically
		switch strings.ToUpper(doc.DocumentType) {
		case "KTP", "NPWP", "SIUP", "NIB":
			doc.Category = "Permits & Licenses"
		default:
			doc.Category = "Supporting Documents"
		}

		if doc.Status == "pending" {
			pendingDocsCount++
		}

		org.Documents = append(org.Documents, doc)
	}
	org.PendingDocCount = pendingDocsCount

	// Fetch history from activity_log
	queryHistory := `
		SELECT action, COALESCE(up.full_name, 'System'), al.created_at, detail
		FROM activity_log al
		LEFT JOIN user_profiles up ON up.user_id = al.actor_id
		WHERE detail ILIKE $1 OR detail ILIKE $2
		ORDER BY al.created_at DESC
	`
	historySearchPattern1 := fmt.Sprintf("%%organizer %s%%", org.CompanyName)
	historySearchPattern2 := fmt.Sprintf("%%application %d%%", org.ID)
	rowsHist, err := r.db.QueryContext(ctx, queryHistory, historySearchPattern1, historySearchPattern2)
	if err == nil {
		defer rowsHist.Close()
		org.History = []OrganizerHistoryEntry{}
		for rowsHist.Next() {
			var hist OrganizerHistoryEntry
			var actTime time.Time
			err = rowsHist.Scan(&hist.Action, &hist.Actor, &actTime, &hist.Notes)
			if err == nil {
				hist.Timestamp = formatTime(actTime)
				org.History = append(org.History, hist)
			}
		}
	}

	return &org, nil
}

func (r *PostgresAuditorRepository) ApproveOrganizer(ctx context.Context, appID, actorID int, notes string) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Get the applicant's user_id & business_name
	var applicantUserID int
	var companyName string
	err = tx.QueryRowContext(ctx, `
		SELECT user_id, business_name FROM organizer_applications WHERE id = $1 FOR UPDATE
	`, appID).Scan(&applicantUserID, &companyName)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return err
	}

	// 2. Update status of organizer_applications to approved
	_, err = tx.ExecContext(ctx, `
		UPDATE organizer_applications
		SET status = 'approved', reviewed_at = now(), reviewed_by = $1, notes = NULLIF($2, '')
		WHERE id = $3
	`, actorID, notes, appID)
	if err != nil {
		return err
	}

	// 3. Delete old platform-level user roles (event_id IS NULL)
	_, err = tx.ExecContext(ctx, `
		DELETE FROM user_roles WHERE user_id = $1 AND event_id IS NULL
	`, applicantUserID)
	if err != nil {
		return err
	}

	// 4. Assign Event Organizer platform role
	_, err = tx.ExecContext(ctx, `
		INSERT INTO user_roles (user_id, role_id, event_id)
		VALUES ($1, (SELECT id FROM roles WHERE role_name = 'Event Organizer' LIMIT 1), NULL)
	`, applicantUserID)
	if err != nil {
		return err
	}

	// 5. Log activity
	detail := fmt.Sprintf("Approved organizer application for %q (ID %d). Notes: %s", companyName, appID, notes)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO activity_log (actor_id, action, detail)
		VALUES ($1, 'Approve Organizer', $2)
	`, actorID, detail)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *PostgresAuditorRepository) RejectOrganizer(ctx context.Context, appID, actorID int, reason, notes string) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var companyName string
	err = tx.QueryRowContext(ctx, `
		SELECT business_name FROM organizer_applications WHERE id = $1 FOR UPDATE
	`, appID).Scan(&companyName)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return err
	}

	fullNotes := reason
	if notes != "" {
		fullNotes += " | " + notes
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE organizer_applications
		SET status = 'rejected', reviewed_at = now(), reviewed_by = $1, notes = NULLIF($2, '')
		WHERE id = $3
	`, actorID, fullNotes, appID)
	if err != nil {
		return err
	}

	detail := fmt.Sprintf("Rejected organizer application for %q (ID %d). Reason: %s", companyName, appID, fullNotes)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO activity_log (actor_id, action, detail)
		VALUES ($1, 'Reject Organizer', $2)
	`, actorID, detail)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *PostgresAuditorRepository) UpdateOrganizerStatus(ctx context.Context, appID, actorID int, req UpdateOrganizerStatusRequest) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var companyName string
	err = tx.QueryRowContext(ctx, `
		SELECT business_name FROM organizer_applications WHERE id = $1 FOR UPDATE
	`, appID).Scan(&companyName)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return err
	}

	dbStatus := strings.ToLower(req.Status)
	if dbStatus == "verified" {
		dbStatus = "approved"
	} else if dbStatus == "need revision" || dbStatus == "need_revision" || dbStatus == "needs_revision" {
		dbStatus = "needs_revision"
	} else if dbStatus == "suspended" {
		dbStatus = "rejected"
	} else if dbStatus == "in review" {
		dbStatus = "in_review"
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE organizer_applications
		SET status = $1::application_status, reviewed_at = now(), reviewed_by = $2, notes = NULLIF($3, '')
		WHERE id = $4
	`, dbStatus, actorID, req.InternalNotes, appID)
	if err != nil {
		return err
	}

	detail := fmt.Sprintf("Updated organizer status for %q (ID %d) to %s. Notes: %s", companyName, appID, dbStatus, req.InternalNotes)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO activity_log (actor_id, action, detail)
		VALUES ($1, 'Update Organizer Status', $2)
	`, actorID, detail)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// ---- Payout Verification ----

// payoutStatusFilter maps a console filter label onto a payout_status value.
//
// The console's filter row carries labels the enum has never had ("Processing",
// "Paid", "Under Review"). Returning ok=false for those is deliberate: the
// alternative the previous code chose was to substitute 'pending', which
// answered a question nobody asked and looked like a real result.
func payoutStatusFilter(label string) (string, bool) {
	switch strings.ToLower(strings.ReplaceAll(label, " ", "_")) {
	case "pending":
		return "pending", true
	case "approved":
		return "approved", true
	case "rejected":
		return "rejected", true
	case "on_hold":
		return "on_hold", true
	case "need_revision":
		return "need_revision", true
	case "processed", "paid":
		return "processed", true
	case "failed":
		return "failed", true
	default:
		return "", false
	}
}

func (r *PostgresAuditorRepository) ListPayouts(ctx context.Context, filters PayoutFilters) ([]*AuditorPayout, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if filters.Limit <= 0 {
		filters.Limit = 20
	}
	if filters.Page <= 0 {
		filters.Page = 1
	}
	offset := (filters.Page - 1) * filters.Limit

	// Gross and net are selected here because the payouts TABLE shows both
	// columns. They previously came from nowhere, so the console read an absent
	// field and crashed on the first rendered row.
	//
	// The source is `orders`, matching payoutSales() — the two must not disagree
	// about the same payout. The old sub-select summed ticket_tiers.tickets_sold,
	// a counter nothing in the codebase writes, and then applied hardcoded 5%/2%
	// rates instead of the per-order rates actually charged.
	query := `
		SELECT
			p.id,
			p.amount,
			p.status,
			p.requested_at,
			e.event_name,
			e.event_start,
			COALESCE(up.full_name, 'Unknown Organizer'),
			COALESCE(oa.business_email, ''),
			COALESCE(sales.tickets_sold, 0) AS tickets_sold,
			COALESCE(sales.gross, 0)::float8 AS gross_revenue,
			(COALESCE(sales.net, 0)
				- COALESCE(sales.organizer_borne_tax, 0)
				- COALESCE(sales.refunded, 0))::float8 AS net_revenue
		FROM payouts p
		JOIN events e ON e.id = p.event_id
		LEFT JOIN organizer_applications oa ON oa.user_id = e.organizer_id
		LEFT JOIN user_profiles up ON up.user_id = e.organizer_id
		LEFT JOIN (
			SELECT event_id,
			       SUM(quantity)     FILTER (WHERE status = 'paid') AS tickets_sold,
			       SUM(gross_amount) FILTER (WHERE status = 'paid') AS gross,
			       SUM(net_amount)   FILTER (WHERE status = 'paid') AS net,
			       SUM(entertainment_tax_amount)
			         FILTER (WHERE status = 'paid' AND NOT entertainment_tax_passed_to_buyer)
			         AS organizer_borne_tax,
			       SUM(gross_amount) FILTER (WHERE status = 'refunded') AS refunded
			FROM orders
			GROUP BY event_id
		) sales ON sales.event_id = p.event_id
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	// The console offers more filter labels than the enum has values, and the
	// previous mapping sent everything it did not recognise to 'pending'. So
	// filtering by "Paid" or "Under Review" quietly returned the pending rows
	// instead — a wrong answer presented as a real one. An unmappable filter now
	// returns nothing, which is at least honest about matching no payout.
	if filters.Status != "" {
		dbStatus, ok := payoutStatusFilter(filters.Status)
		if !ok {
			return []*AuditorPayout{}, nil
		}
		query += fmt.Sprintf(" AND p.status = $%d::payout_status", argIndex)
		args = append(args, dbStatus)
		argIndex++
	}

	if filters.Search != "" {
		query += fmt.Sprintf(" AND (e.event_name ILIKE $%d OR up.full_name ILIKE $%d)", argIndex, argIndex)
		args = append(args, "%"+filters.Search+"%")
		argIndex++
	}

	query += fmt.Sprintf(" ORDER BY p.requested_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, filters.Limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*AuditorPayout, 0)
	for rows.Next() {
		var p AuditorPayout
		var reqTime, eventTime time.Time
		var dbStatus string

		var ticketsSold int
		var gross, net float64

		err = rows.Scan(
			&p.ID,
			&p.RequestedAmount,
			&dbStatus,
			&reqTime,
			&p.EventName,
			&eventTime,
			&p.OrganizerName,
			&p.OrganizerEmail,
			&ticketsSold,
			&gross,
			&net,
		)
		if err != nil {
			return nil, err
		}

		p.Status = string(dbStatus)
		p.RequestDate = formatTime(reqTime)
		p.EventDate = eventTime.Format("2006-01-02 15:04")
		// Only the figures this query actually computes. The rest of
		// PayoutSales is detail-only and stays zero rather than being guessed.
		p.SalesSummary = PayoutSales{
			TicketsSold:  ticketsSold,
			GrossRevenue: gross,
			NetRevenue:   net,
		}

		list = append(list, &p)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return list, nil
}

func (r *PostgresAuditorRepository) GetPayout(ctx context.Context, payoutID int) (*AuditorPayout, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	// Every column here is read by an auditor deciding whether to release money.
	// A COALESCE default would therefore be a fabricated bank account rendered as
	// fact — this query returns empty strings for absent data instead, and the
	// console shows "Not provided" so the auditor knows to withhold approval.
	// oa.business_license is deliberately absent: no such column exists (see the
	// licence-status query below).
	query := `
		SELECT
			p.id,
			p.amount,
			p.status,
			p.requested_at,
			e.id AS event_id,
			e.organizer_id,
			e.event_name,
			e.event_start,
			COALESCE(up.full_name, ''),
			COALESCE(oa.business_email, ''),
			-- Was COALESCE(oa.notes, ''), the ORGANIZER APPLICATION's review
			-- notes: the same text surfaced on every payout that organizer ever
			-- requested. These two belong to this payout.
			p.internal_notes,
			p.organizer_notes,
			e.entertainment_tax_rate,
			COALESCE(oa.bank_name, ''),
			COALESCE(oa.bank_account_number, ''),
			COALESCE(oa.bank_account_holder, ''),
			COALESCE(oa.business_phone, ''),
			COALESCE(oa.status::text, ''),
			COALESCE(oa.bank_verification_status, 'unverified'),
			COALESCE(vb.full_name, ''),
			COALESCE(to_char(oa.bank_verified_at, 'YYYY-MM-DD HH24:MI'), ''),
			COALESCE(oa.id, 0),
			COALESCE(v.name, ''),
			e.status::text
		FROM payouts p
		JOIN events e ON e.id = p.event_id
		LEFT JOIN organizer_applications oa ON oa.user_id = e.organizer_id
		LEFT JOIN user_profiles up ON up.user_id = e.organizer_id
		LEFT JOIN venues v ON v.id = e.venue_id
		LEFT JOIN user_profiles vb ON vb.user_id = oa.bank_verified_by
		WHERE p.id = $1
	`
	var p AuditorPayout
	var reqTime, eventTime time.Time
	var dbStatus string
	var eventID, organizerID int
	var taxRate float64

	err := r.db.QueryRowContext(ctx, query, payoutID).Scan(
		&p.ID,
		&p.RequestedAmount,
		&dbStatus,
		&reqTime,
		&eventID,
		&organizerID,
		&p.EventName,
		&eventTime,
		&p.OrganizerName,
		&p.OrganizerEmail,
		&p.InternalNotes,
		&p.OrganizerNotes,
		&taxRate,
		&p.BankName,
		&p.BankAccountNum,
		&p.BankHolder,
		&p.OrganizerPhone,
		&p.OrganizerStatus,
		&p.BankVerificationStatus,
		&p.BankVerifiedBy,
		&p.BankVerifiedAt,
		&p.ApplicationID,
		&p.VenueName,
		&p.EventStatus,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	// There is no licence-number column anywhere in the schema. Report the
	// verification state of the organizer's NIB/SIUP instead — the same signal
	// GetEventReview surfaces, so the two consoles agree.
	p.OrganizerBusinessLicense = r.organizerLicenceStatus(ctx, organizerID)

	p.Status = string(dbStatus)
	p.RequestDate = formatTime(reqTime)
	p.EventDate = eventTime.Format("2006-01-02 15:04")

	p.SalesSummary = r.payoutSales(ctx, eventID)
	p.TicketCapacity = r.eventCapacity(ctx, eventID)
	p.OrganizerViolations = r.organizerViolations(ctx, organizerID, eventID)
	p.EventID = eventID
	_ = taxRate // the per-order rate is authoritative; see payoutSales

	// A duplicate approved payout is a real, checkable condition — unlike the
	// old risk score, which was a hardcoded 20/40 that mapped to "High" for
	// every payout that ever existed.
	hasAlert := false
	alertMsg := ""

	// `id <> $2` excludes the payout being viewed. Without it an approved payout
	// counts itself and reports that an approved payout already exists for the
	// event — announcing itself as its own duplicate. Harmless while the
	// 'approved' label did not exist (migration 0023 added it), and a false
	// fraud alert on a money-release screen the moment it did.
	var dupCount int
	_ = r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM payouts
		WHERE event_id = $1 AND id <> $2 AND status = 'approved'
	`, eventID, payoutID).Scan(&dupCount)
	if dupCount > 0 {
		hasAlert = true
		alertMsg = "Warning: Approved payout request already exists for this event!"
	}

	// A payout asking for more than the event actually netted is checkable and
	// worth flagging. The previous rule (gross > 250000 && sold < 100) was a
	// USD-era threshold — as rupiah that is about two tickets, so once revenue
	// became real it would have flagged essentially every event.
	if p.RequestedAmount > p.SalesSummary.NetRevenue {
		hasAlert = true
		if alertMsg != "" {
			alertMsg += " "
		}
		alertMsg += "Requested amount exceeds the event's net revenue."
	}

	p.FraudDetection = FraudSignals{
		DuplicatePayout:   dupCount > 0,
		SuspiciousRevenue: p.RequestedAmount > p.SalesSummary.NetRevenue,
		HasAlert:          hasAlert,
		AlertMessage:      alertMsg,
	}

	// Fetch timeline logs from activity_log.
	//
	// Rows written since migration 0028 carry resource_type/resource_id and are
	// matched exactly. Older rows have no resource columns, so they keep the
	// legacy substring match — which is a PREFIX match on a decimal number, so
	// payout 3 also picks up payouts 30-39. That is the bug being retired; it
	// cannot be repaired retroactively, because a backfill would have to parse
	// the same ambiguous strings to decide where each row belongs.
	//
	// The `resource_type IS NULL` guard is what stops a row from matching twice
	// and stops a NEW payout-30 row from leaking into payout 3's timeline.
	queryTimeline := `
		SELECT al.id, COALESCE(up.full_name, 'System'), al.action, al.detail, al.created_at
		FROM activity_log al
		LEFT JOIN user_profiles up ON up.user_id = al.actor_id
		WHERE (al.resource_type = 'payout' AND al.resource_id = $1)
		   OR (al.resource_type IS NULL AND al.detail ILIKE $2)
		ORDER BY al.created_at DESC
	`
	timelinePattern := fmt.Sprintf("%%payout %d%%", payoutID)
	rowsTimeline, err := r.db.QueryContext(ctx, queryTimeline, payoutID, timelinePattern)
	p.Timeline = []Activity{}
	if err == nil {
		defer rowsTimeline.Close()
		for rowsTimeline.Next() {
			var act Activity
			var actTime time.Time
			err = rowsTimeline.Scan(&act.ID, &act.ActorName, &act.Action, &act.Detail, &actTime)
			if err == nil {
				act.CreatedAt = formatTime(actTime)
				p.Timeline = append(p.Timeline, act)
			}
		}
	}

	checklist, err := r.payoutReviewChecklist(ctx, payoutID, string(dbStatus))
	if err != nil {
		return nil, err
	}
	p.ReviewChecklist = checklist

	return &p, nil
}

// payoutReviewChecklist builds the eleven-item checklist for a payout.
//
// The item list is always the full eleven, in whitelist order, whether or not a
// row exists yet — an item nobody has touched must render as an unticked box,
// not vanish. Stored rows only supply state on top of that skeleton.
func (r *PostgresAuditorRepository) payoutReviewChecklist(ctx context.Context, payoutID int, dbStatus string) (PayoutReviewChecklist, error) {
	type storedCheck struct {
		checked bool
		by      string
		at      string
	}
	stored := map[string]storedCheck{}

	rows, err := r.db.QueryContext(ctx, `
		SELECT c.item_key, c.checked, COALESCE(up.full_name, ''), c.checked_at
		FROM payout_review_checks c
		LEFT JOIN user_profiles up ON up.user_id = c.checked_by
		WHERE c.payout_id = $1
	`, payoutID)
	if err != nil {
		return PayoutReviewChecklist{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var key string
		var sc storedCheck
		var at time.Time
		if err := rows.Scan(&key, &sc.checked, &sc.by, &at); err != nil {
			return PayoutReviewChecklist{}, err
		}
		sc.at = formatTime(at)
		stored[key] = sc
	}
	if err := rows.Err(); err != nil {
		return PayoutReviewChecklist{}, err
	}

	checklist := PayoutReviewChecklist{Items: make([]PayoutReviewItem, 0, len(payoutReviewItemDefs))}
	for _, def := range payoutReviewItemDefs {
		item := def
		if sc, ok := stored[def.Key]; ok {
			item.Checked = sc.checked
			item.CheckedBy = sc.by
			item.CheckedAt = sc.at
		}
		checklist.Items = append(checklist.Items, item)
	}

	if reason, terminal := terminalPayoutStatuses[dbStatus]; terminal {
		checklist.Frozen = true
		checklist.FrozenReason = "This payout was " + reason + ". The checklist records what was verified before that decision and can no longer be changed."
	}

	return checklist, nil
}

// UpdatePayoutCheck ticks or unticks ONE checklist item.
//
// Single-item by design. A whole-checklist write would carry a stale copy of
// the other ten boxes, so two auditors reviewing the same payout would silently
// undo each other's work.
//
// The freeze is enforced HERE, not only in the UI: the checklist is the record
// of what was verified before the money left, so it must stop accepting edits
// the moment the payout becomes terminal. A frozen payout returns ErrForbidden
// rather than a silent no-op — an auditor whose click was discarded must be
// told, or they will believe the box is ticked.
func (r *PostgresAuditorRepository) UpdatePayoutCheck(ctx context.Context, payoutID, actorID int, req UpdatePayoutCheckRequest) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Locked so the status cannot go terminal between this check and the write.
	// Without it an approval landing mid-request would leave a check recorded
	// against a payout that was already paid.
	var dbStatus string
	err = tx.QueryRowContext(ctx, `
		SELECT status::text FROM payouts WHERE id = $1 FOR UPDATE
	`, payoutID).Scan(&dbStatus)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return err
	}
	if _, terminal := terminalPayoutStatuses[dbStatus]; terminal {
		return ErrForbidden
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO payout_review_checks (payout_id, item_key, checked, checked_by, checked_at)
		VALUES ($1, $2, $3, $4, now())
		ON CONFLICT (payout_id, item_key) DO UPDATE
		SET checked = EXCLUDED.checked,
		    checked_by = EXCLUDED.checked_by,
		    checked_at = EXCLUDED.checked_at
	`, payoutID, req.ItemKey, req.Checked, actorID); err != nil {
		return err
	}

	return tx.Commit()
}

// outstandingPayoutChecks lists the labels of items not ticked, in whitelist
// order. Used to record what was still open at the moment of approval.
func outstandingPayoutChecks(checked map[string]bool) []string {
	var out []string
	for _, def := range payoutReviewItemDefs {
		if !checked[def.Key] {
			out = append(out, def.Label)
		}
	}
	return out
}

// payoutSales derives an event's settlement figures from `orders`.
//
// It replaces a query over ticket_tiers.tickets_sold * price. Nothing in the
// codebase ever writes tickets_sold — every reference is a read — so that
// computation returned zero for every event that has ever existed, on the
// screen that authorises payment.
//
// Fees come from the per-order columns rather than being recomputed at today's
// rates, so a payout for a past event settles at the rates its buyers were
// actually charged.
//
// Net follows chk_net_amount (gross - platform_fee - platform_fee_ppn -
// gateway_fee - gateway_fee_ppn) and then deducts entertainment tax ONLY where
// the buyer did not already bear it: when entertainment_tax_passed_to_buyer is
// true the tax was added on top of the ticket price, so deducting it from the
// organizer as well would charge it twice.
func (r *PostgresAuditorRepository) payoutSales(ctx context.Context, eventID int) PayoutSales {
	const q = `
		SELECT
			COALESCE(SUM(quantity)                       FILTER (WHERE status = 'paid'), 0),
			COALESCE(SUM(gross_amount)                   FILTER (WHERE status = 'paid'), 0),
			COALESCE(SUM(platform_fee)                   FILTER (WHERE status = 'paid'), 0),
			COALESCE(SUM(gateway_fee)                    FILTER (WHERE status = 'paid'), 0),
			COALESCE(SUM(platform_fee_ppn + gateway_fee_ppn) FILTER (WHERE status = 'paid'), 0),
			COALESCE(SUM(entertainment_tax_amount)       FILTER (WHERE status = 'paid'), 0),
			COALESCE(SUM(net_amount)                     FILTER (WHERE status = 'paid'), 0),
			COALESCE(SUM(entertainment_tax_amount) FILTER (WHERE status = 'paid' AND NOT entertainment_tax_passed_to_buyer), 0),
			COALESCE(SUM(gross_amount)                   FILTER (WHERE status = 'refunded'), 0)
		FROM orders
		WHERE event_id = $1
	`
	var s PayoutSales
	var netBeforeTax, organizerBorneTax float64
	if err := r.db.QueryRowContext(ctx, q, eventID).Scan(
		&s.TicketsSold,
		&s.GrossRevenue,
		&s.PlatformFee,
		&s.GatewayFee,
		&s.PPN,
		&s.EntertainmentTax,
		&netBeforeTax,
		&organizerBorneTax,
		&s.RefundAmount,
	); err != nil {
		return PayoutSales{}
	}

	s.NetRevenue = netBeforeTax - organizerBorneTax - s.RefundAmount
	return s
}

// eventCapacity resolves how many tickets the event can sell. Seated-vs-GA is
// per TIER: a tier with painted seats is bounded by its rows in
// event_seats_matrix, and allocation_limit is simply unused for it. Mixing the
// two would double-count, so each tier contributes whichever applies to it.
func (r *PostgresAuditorRepository) eventCapacity(ctx context.Context, eventID int) int {
	const q = `
		SELECT COALESCE(SUM(
			CASE WHEN seats.painted > 0 THEN seats.painted ELSE t.allocation_limit END
		), 0)
		FROM ticket_tiers t
		LEFT JOIN LATERAL (
			SELECT COUNT(*) AS painted
			FROM event_seats_matrix m
			WHERE m.event_id = t.event_id AND m.ticket_tier_id = t.id
		) seats ON TRUE
		WHERE t.event_id = $1
	`
	var capacity int
	if err := r.db.QueryRowContext(ctx, q, eventID).Scan(&capacity); err != nil {
		return 0
	}
	return capacity
}

// organizerViolations counts the organizer's rejected events — the same rule
// GetEventReview uses for compliance history. The event this payout belongs to
// is excluded so its own outcome never reads as prior history.
func (r *PostgresAuditorRepository) organizerViolations(ctx context.Context, organizerID, excludeEventID int) int {
	const q = `SELECT COUNT(*) FROM events WHERE organizer_id = $1 AND id <> $2 AND status = 'rejected'`
	var n int
	if err := r.db.QueryRowContext(ctx, q, organizerID, excludeEventID).Scan(&n); err != nil {
		return 0
	}
	return n
}

// RevisePayout sends a payout back to the organizer with an explanation.
//
// Distinct from HoldPayout: a hold means the auditor is investigating, a
// revision means the organizer has something to do. The console has always
// offered them as separate actions, and the payouts list needs to tell them
// apart, so they are separate statuses rather than one status plus free text.
func (r *PostgresAuditorRepository) RevisePayout(ctx context.Context, payoutID, actorID int, req RevisePayoutRequest) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(ctx, `
		UPDATE payouts
		SET status = 'need_revision',
		    organizer_notes = $1,
		    internal_notes = CASE WHEN $2 = '' THEN internal_notes ELSE $2 END,
		    updated_at = now()
		WHERE id = $3
	`, req.Reason, req.InternalNotes, payoutID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}

	detail := fmt.Sprintf("Requested revision on payout %d. Reason: %s", payoutID, req.Reason)
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO activity_log (actor_id, action, detail, resource_type, resource_id) VALUES ($1, 'Revise Payout', $2, 'payout', $3)
	`, actorID, detail, payoutID); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	go func() {
		_ = r.CreateNotificationForAuditors(context.Background(), "✏️ Payout Revision Requested",
			fmt.Sprintf("Payout #%d was sent back to the organizer.", payoutID), "payout", strconv.Itoa(payoutID))
	}()
	return nil
}

// UpdatePayoutNotes saves notes without touching status.
//
// The console's "Save Draft" has always called the status handler with the
// payout's CURRENT status, which matched no branch and reported a failure while
// sending nothing. Notes previously had nowhere to go at all: approve and
// reject stitched them into an activity_log string.
func (r *PostgresAuditorRepository) UpdatePayoutNotes(ctx context.Context, payoutID, actorID int, req UpdatePayoutNotesRequest) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	res, err := r.db.ExecContext(ctx, `
		UPDATE payouts
		SET internal_notes = $1, organizer_notes = $2, updated_at = now()
		WHERE id = $3
	`, req.InternalNotes, req.OrganizerNotes, payoutID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// VerifyPayoutBankAccount marks the organizer's account confirmed.
//
// One-way by design: an auditor can verify, and only an organizer edit resets
// it (organizer/repository.go sets 'unverified' on any change). An auditor
// un-verifying mid-flight would leave a payout in a state nobody asked for.
//
// The account number the console displayed is echoed back and compared inside
// the transaction. Without that, an organizer editing their details between
// page load and click would have the NEW account verified by an auditor who
// never saw it — the exact substitution this flag exists to prevent.
func (r *PostgresAuditorRepository) VerifyPayoutBankAccount(ctx context.Context, payoutID, actorID int, req VerifyBankAccountRequest) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var appID int
	var onFile string
	err = tx.QueryRowContext(ctx, `
		SELECT oa.id, COALESCE(oa.bank_account_number, '')
		FROM payouts p
		JOIN events e ON e.id = p.event_id
		JOIN organizer_applications oa ON oa.user_id = e.organizer_id
		WHERE p.id = $1
	`, payoutID).Scan(&appID, &onFile)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return err
	}

	if strings.TrimSpace(onFile) == "" {
		return ErrValidation
	}
	if digitsOnly(req.AccountNumber) != digitsOnly(onFile) {
		return ErrValidation
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE organizer_applications
		SET bank_verification_status = 'verified',
		    bank_verified_by = $1,
		    bank_verified_at = now()
		WHERE id = $2
	`, actorID, appID); err != nil {
		return err
	}

	detail := fmt.Sprintf("Verified the bank account for payout %d.", payoutID)
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO activity_log (actor_id, action, detail, resource_type, resource_id) VALUES ($1, 'Verify Bank Account', $2, 'payout', $3)
	`, actorID, detail, payoutID); err != nil {
		return err
	}

	return tx.Commit()
}

// digitsOnly normalises an account number for comparison. The organizer form
// strips spaces and dashes before storing, but a value that predates that rule
// may still carry them.
func digitsOnly(v string) string {
	var b strings.Builder
	for _, r := range v {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func (r *PostgresAuditorRepository) ApprovePayout(ctx context.Context, payoutID, actorID int, req ApprovePayoutRequest) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Read the checklist BEFORE the status change, inside the same transaction.
	// After the UPDATE the payout is terminal and the checklist is frozen; what
	// gets recorded has to be the state the auditor actually approved from.
	checkRows, err := tx.QueryContext(ctx, `
		SELECT item_key, checked FROM payout_review_checks WHERE payout_id = $1
	`, payoutID)
	if err != nil {
		return err
	}
	checked := map[string]bool{}
	for checkRows.Next() {
		var key string
		var isChecked bool
		if err := checkRows.Scan(&key, &isChecked); err != nil {
			checkRows.Close()
			return err
		}
		checked[key] = isChecked
	}
	checkRows.Close()
	if err := checkRows.Err(); err != nil {
		return err
	}
	outstanding := outstandingPayoutChecks(checked)

	_, err = tx.ExecContext(ctx, `
		UPDATE payouts
		SET status = 'approved', processed_at = now(), processed_by = $1, updated_at = now()
		WHERE id = $2
	`, actorID, payoutID)
	if err != nil {
		return err
	}

	// An incomplete checklist WARNS but does not block — the auditor may have
	// grounds the checklist does not model, and a hard block would just teach
	// them to tick boxes to get past it. What it must not do is pass silently,
	// so the outstanding items are named in the permanent record.
	detail := fmt.Sprintf("Approved payout %d. Notes: %s. Finance Notes: %s", payoutID, req.InternalNotes, req.FinanceNotes)
	if len(outstanding) > 0 {
		detail += fmt.Sprintf(" Approved with %d of %d checklist items outstanding: %s.",
			len(outstanding), len(payoutReviewItemDefs), strings.Join(outstanding, ", "))
	} else {
		detail += " All checklist items were verified."
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO activity_log (actor_id, action, detail, resource_type, resource_id)
		VALUES ($1, 'Approve Payout', $2, 'payout', $3)
	`, actorID, detail, payoutID)
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	go func() {
		_ = r.CreateNotificationForAuditors(context.Background(), "💰 Payout Approved", fmt.Sprintf("Payout #%d has been approved.", payoutID), "payout", strconv.Itoa(payoutID))
	}()

	return nil
}

func (r *PostgresAuditorRepository) RejectPayout(ctx context.Context, payoutID, actorID int, req RejectPayoutRequest) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `
		UPDATE payouts
		SET status = 'rejected', processed_at = now(), processed_by = $1, updated_at = now()
		WHERE id = $2
	`, actorID, payoutID)
	if err != nil {
		return err
	}

	detail := fmt.Sprintf("Rejected payout %d. Reason: %s. Notes: %s", payoutID, req.Reason, req.InternalNotes)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO activity_log (actor_id, action, detail, resource_type, resource_id)
		VALUES ($1, 'Reject Payout', $2, 'payout', $3)
	`, actorID, detail, payoutID)
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	go func() {
		_ = r.CreateNotificationForAuditors(context.Background(), "💰 Payout Rejected", fmt.Sprintf("Payout #%d was rejected. Reason: %s", payoutID, req.Reason), "payout", strconv.Itoa(payoutID))
	}()

	return nil
}

func (r *PostgresAuditorRepository) HoldPayout(ctx context.Context, payoutID, actorID int, req HoldPayoutRequest) error {
	ctx2, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx2, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx2, `
		UPDATE payouts
		SET status = 'on_hold', processed_at = now(), processed_by = $1, updated_at = now()
		WHERE id = $2
	`, actorID, payoutID)
	if err != nil {
		return err
	}

	detail := fmt.Sprintf("Placed payout %d on hold. Reason: %s", payoutID, req.Reason)
	_, err = tx.ExecContext(ctx2, `
		INSERT INTO activity_log (actor_id, action, detail, resource_type, resource_id)
		VALUES ($1, 'Hold Payout', $2, 'payout', $3)
	`, actorID, detail, payoutID)
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	go func() {
		_ = r.CreateNotificationForAuditors(context.Background(), "💰 Payout On Hold", fmt.Sprintf("Payout #%d has been put on hold. Reason: %s", payoutID, req.Reason), "payout", strconv.Itoa(payoutID))
	}()

	return nil
}

// ---- Notification Methods ----

func (r *PostgresAuditorRepository) ListNotifications(ctx context.Context, userID int) ([]*AuditorNotification, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, title, detail, COALESCE(resource_type, ''), COALESCE(resource_id, ''), is_read, created_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notifications := []*AuditorNotification{}
	for rows.Next() {
		var n AuditorNotification
		err = rows.Scan(&n.ID, &n.UserID, &n.Title, &n.Detail, &n.ResourceType, &n.ResourceID, &n.IsRead, &n.CreatedAt)
		if err == nil {
			notifications = append(notifications, &n)
		}
	}
	return notifications, nil
}

func (r *PostgresAuditorRepository) MarkNotificationsRead(ctx context.Context, userID int, notificationIDs []int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if len(notificationIDs) == 0 {
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

func (r *PostgresAuditorRepository) CreateNotification(ctx context.Context, userID int, title, detail, resourceType, resourceID string) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO notifications (user_id, title, detail, resource_type, resource_id)
		VALUES ($1, $2, $3, $4, $5)
	`, userID, title, detail, resourceType, resourceID)
	return err
}

func (r *PostgresAuditorRepository) CreateNotificationForAuditors(ctx context.Context, title, detail, resourceType, resourceID string) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO notifications (user_id, title, detail, resource_type, resource_id)
		SELECT u.id, $1, $2, $3, $4
		FROM users u
		JOIN user_roles ur ON u.id = ur.user_id
		JOIN roles r ON ur.role_id = r.id
		WHERE r.role_name IN ('Auditor', 'Super Admin')
	`, title, detail, resourceType, resourceID)
	return err
}

func formatBannerURL(rawURL string) string {
	if rawURL == "" {
		return ""
	}
	if strings.Contains(rawURL, "localhost:9000") || strings.Contains(rawURL, "minio:9000") {
		rawURL = strings.ReplaceAll(rawURL, "localhost:9000", "localhost:9000")
		rawURL = strings.ReplaceAll(rawURL, "minio:9000", "localhost:9000")
		rawURL = strings.ReplaceAll(rawURL, "crowdflow-uploads", "crowdflow-public")
		return rawURL
	}
	if strings.HasPrefix(rawURL, "http://") || strings.HasPrefix(rawURL, "https://") {
		return rawURL
	}
	base := os.Getenv("S3_PUBLIC_BASE_URL")
	if base == "" {
		base = "http://localhost:9000/crowdflow-public"
	}
	base = strings.TrimSuffix(base, "/")
	cleaned := strings.TrimPrefix(rawURL, "/")
	if !strings.HasPrefix(cleaned, "events/") {
		cleaned = "events/covers/" + cleaned
	}
	return base + "/" + cleaned
}

// ============================================================================
// Per-event documents
//
// These live in event_documents, NOT organizer_documents, so they cannot go
// through VerifyReviewDocument/RejectReviewDocument: auditor_document_reviews
// has an FK to organizer_documents(id), and the two id sequences overlap.
// The decision is recorded on the row itself (migration 0016 carries
// review_notes / reviewed_at / reviewed_by for exactly this).
// ============================================================================

func (r *PostgresAuditorRepository) VerifyEventDocument(ctx context.Context, docID, actorID int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	res, err := r.db.ExecContext(ctx, `
		UPDATE event_documents
		SET status = 'verified', review_notes = NULL, reviewed_at = now(), reviewed_by = $2
		WHERE id = $1
	`, docID, actorID)
	if err != nil {
		return err
	}
	return checkAffected(res)
}

func (r *PostgresAuditorRepository) RejectEventDocument(ctx context.Context, docID, actorID int, reason string) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	res, err := r.db.ExecContext(ctx, `
		UPDATE event_documents
		SET status = 'rejected', review_notes = $3, reviewed_at = now(), reviewed_by = $2
		WHERE id = $1
	`, docID, actorID, reason)
	if err != nil {
		return err
	}
	return checkAffected(res)
}

// GetDocumentPath resolves a (source, id) pair to its private-bucket object key.
// The source discriminator is what makes the id unambiguous.
func (r *PostgresAuditorRepository) GetDocumentPath(ctx context.Context, source string, docID int) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var query string
	switch source {
	case DocSourceEvent:
		query = `SELECT file_path FROM event_documents WHERE id = $1`
	case DocSourceOrganizer:
		query = `SELECT file_path FROM organizer_documents WHERE id = $1`
	default:
		return "", ErrValidation
	}

	var path string
	err := r.db.QueryRowContext(ctx, query, docID).Scan(&path)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	return path, err
}

// checkAffected turns a no-op UPDATE into a not-found rather than a silent success.
func checkAffected(res sql.Result) error {
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
