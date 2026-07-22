package auditor

import (
	"context"
	"database/sql"
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

		// Calculate Risk Level based on compliance score and missing docs
		score := rev.ComplianceScore
		if rev.MissingDocs > 0 {
			score -= rev.MissingDocs * 10
		}
		if score < 0 {
			score = 0
		}
		rev.RiskLevel = computeRiskLevel(score)

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

		// Calculate Risk Level based on compliance score and missing docs
		score := rev.ComplianceScore
		if rev.MissingDocs > 0 {
			score -= rev.MissingDocs * 10
		}
		if score < 0 {
			score = 0
		}
		rev.RiskLevel = computeRiskLevel(score)

		// Filter riskLevel client-side if risk level filter is specified
		if filters.RiskLevel != "" && string(rev.RiskLevel) != filters.RiskLevel {
			continue
		}

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
			COALESCE(v.address || ', ' || v.city || ', ' || v.province, 'No Address'),
			COALESCE(v.total_capacity, 0),
			e.entertainment_tax_rate
		FROM events e
		LEFT JOIN user_profiles up ON up.user_id = e.organizer_id
		LEFT JOIN event_types et ON et.id = e.event_type_id
		LEFT JOIN venues v ON v.id = e.venue_id
		LEFT JOIN auditor_event_reviews ear ON ear.event_id = e.id
		WHERE e.id = $1
	`
	var submittedAt, lastUpdated, eventStart time.Time
	var dbStatus, stageStr, addressStr string
	var taxRate float64

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
		&addressStr,
		&rev.Capacity,
		&taxRate,
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

	// 2. Fetch Organizer application documents
	queryDocs := `
		SELECT 
			od.id,
			od.document_type,
			od.file_path,
			od.status,
			od.uploaded_at
		FROM organizer_documents od
		JOIN organizer_applications oa ON oa.id = od.application_id
		JOIN events e ON e.organizer_id = oa.user_id
		WHERE e.id = $1
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

	for rowsDocs.Next() {
		var doc ReviewDoc
		var docStatus string
		var uploadedAt time.Time
		err = rowsDocs.Scan(&doc.ID, &doc.DocumentType, &doc.FileURL, &docStatus, &uploadedAt)
		if err != nil {
			return nil, err
		}
		doc.Status = mapVerificationStatus(docStatus)
		doc.UploadedAt = formatTime(uploadedAt)

		// Map category dynamically
		switch strings.ToUpper(doc.DocumentType) {
		case "KTP", "NPWP", "SIUP", "NIB":
			doc.Category = "Permits & Licenses"
		default:
			doc.Category = "Supporting Documents"
		}

		if doc.Status == "pending" {
			missingCount++
		} else if doc.Status == "verified" {
			verifiedCount++
		}
		totalDocs++
		rev.Documents = append(rev.Documents, doc)
	}
	rev.MissingDocs = missingCount
	if totalDocs == 0 {
		rev.ComplianceScore = 100
	} else {
		rev.ComplianceScore = (verifiedCount * 100) / totalDocs
	}
	rev.RiskLevel = computeRiskLevel(rev.ComplianceScore - rev.MissingDocs*10)

	// 3. Fetch Ticket Tiers & Financial metrics
	queryTiers := `
		SELECT name, price, allocation_limit, tickets_sold
		FROM ticket_tiers
		WHERE event_id = $1
	`
	rowsTiers, err := r.db.QueryContext(ctx, queryTiers, eventID)
	if err != nil {
		return nil, err
	}
	defer rowsTiers.Close()

	tiers := []ReviewTicketTier{}
	var projectedRev float64
	for rowsTiers.Next() {
		var tier ReviewTicketTier
		var name string
		var price float64
		var capLimit int
		var sold int

		err = rowsTiers.Scan(&name, &price, &capLimit, &sold)
		if err != nil {
			return nil, err
		}

		tier.Category = name
		tier.Price = price
		tier.Seats = capLimit
		if sold >= capLimit {
			tier.Status = "Sold Out"
		} else {
			tier.Status = "Available"
		}
		projectedRev += price * float64(capLimit)
		tiers = append(tiers, tier)
	}

	platformFee := projectedRev * 0.05
	gatewayFee := projectedRev * 0.02
	taxAmount := projectedRev * (taxRate / 100)
	netPayout := projectedRev - platformFee - gatewayFee - taxAmount

	rev.Finance = ReviewFinance{
		ProjectedRevenue: projectedRev,
		PlatformFee:      platformFee,
		GatewayFee:       gatewayFee,
		TaxAmount:        taxAmount,
		NetPayout:        netPayout,
		TicketTiers:      tiers,
		TaxConfig: ReviewTaxConfig{
			EntertainmentTax: taxRate,
			Ppn:              11.0,
			Region:           "DKI Jakarta",
			TaxPercentage:    taxRate + 11.0,
			RegionMatch:      true,
			TaxApplied:       true,
			PpnApplied:       true,
		},
		Payout: ReviewPayout{
			Bank:            "Bank Central Asia (BCA)",
			AccountName:     rev.OrganizerName,
			AccountNumber:   "8024927501",
			EstimatedPayout: netPayout,
			Verified:        true,
		},
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
		       COALESCE(organizer_file, ''),
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
			&revItem.OrganizerFile,
			&respondedAtStr,
		)
		if err != nil {
			return nil, err
		}
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

	return &rev, nil
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
		msg := fmt.Sprintf("Event %q telah disetujui oleh auditor.", eventName)
		if organizerUserID > 0 {
			_ = r.CreateNotification(context.Background(), organizerUserID, "✅ Event Disetujui!", msg, "event", strconv.Itoa(eventID))
		}
		_ = r.CreateNotificationForAuditors(context.Background(), "✅ Event Disetujui", msg, "event", strconv.Itoa(eventID))
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
			_ = r.CreateNotification(context.Background(), organizerUserID, "❌ Event Ditolak",
				fmt.Sprintf("Event %q ditolak oleh Auditor. Alasan: %s. Catatan: %s", eventName, reason, notes), "event", strconv.Itoa(eventID))
		}
		_ = r.CreateNotificationForAuditors(context.Background(), "❌ Event Ditolak", fmt.Sprintf("Event %q telah ditolak. Alasan: %s", eventName, reason), "event", strconv.Itoa(eventID))
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
			_ = r.CreateNotification(context.Background(), organizerUserID, "⚠️ Perlu Revisi Event",
				fmt.Sprintf("Event %q memerlukan revisi. Catatan Auditor: %s", eventName, notes), "event", strconv.Itoa(eventID))
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
		`, organizerUserID, fmt.Sprintf("⚠️ Perlu Revisi: %s", req.Title), fmt.Sprintf("Event %q memerlukan tindakan: %s (%s)", eventName, req.RequiredAction, req.Description), strconv.Itoa(eventID))
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
			`, organizerUserID, fmt.Sprintf("✅ Revisi Disetujui: %s", title), fmt.Sprintf("Auditor telah menyetujui perbaikan revisi untuk event %q.", eventName), strconv.Itoa(eventID))
		}
	} else if status == "Sent" || status == "Draft" {
		_, _ = r.db.ExecContext(ctx, `UPDATE events SET status = 'needs_revision', updated_at = now() WHERE id = $1`, eventID)
		if organizerUserID > 0 {
			_, _ = r.db.ExecContext(ctx, `
				INSERT INTO notifications (user_id, title, detail, resource_type, resource_id, is_read, created_at)
				VALUES ($1, $2, $3, 'event', $4, FALSE, now())
			`, organizerUserID, fmt.Sprintf("⚠️ Perlu Revisi Tambahan: %s", title), fmt.Sprintf("Auditor meminta perbaikan tambahan untuk event %q.", eventName), strconv.Itoa(eventID))
		}
	} else if status == "Rejected" {
		_, _ = r.db.ExecContext(ctx, `UPDATE events SET status = 'rejected', updated_at = now() WHERE id = $1`, eventID)
		if organizerUserID > 0 {
			_, _ = r.db.ExecContext(ctx, `
				INSERT INTO notifications (user_id, title, detail, resource_type, resource_id, is_read, created_at)
				VALUES ($1, $2, $3, 'event', $4, FALSE, now())
			`, organizerUserID, fmt.Sprintf("❌ Perbaikan Ditolak: %s", title), fmt.Sprintf("Auditor menolak hasil perbaikan revisi untuk event %q.", eventName), strconv.Itoa(eventID))
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
			COALESCE(oa.business_address, '')
		FROM organizer_applications oa
		LEFT JOIN user_profiles up ON up.user_id = oa.user_id
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

	query := `
		SELECT
			p.id,
			p.amount,
			p.status,
			p.requested_at,
			e.event_name,
			e.event_start,
			COALESCE(up.full_name, 'Unknown Organizer'),
			COALESCE(oa.business_email, 'org@crowdflow.com')
		FROM payouts p
		JOIN events e ON e.id = p.event_id
		LEFT JOIN organizer_applications oa ON oa.user_id = e.organizer_id
		LEFT JOIN user_profiles up ON up.user_id = e.organizer_id
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if filters.Status != "" {
		dbStatus := strings.ToLower(filters.Status)
		if dbStatus == "approved" {
			dbStatus = "approved"
		} else if dbStatus == "rejected" {
			dbStatus = "rejected"
		} else if dbStatus == "on hold" || dbStatus == "on_hold" {
			dbStatus = "on_hold"
		} else {
			dbStatus = "pending"
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

		err = rows.Scan(
			&p.ID,
			&p.RequestedAmount,
			&dbStatus,
			&reqTime,
			&p.EventName,
			&eventTime,
			&p.OrganizerName,
			&p.OrganizerEmail,
		)
		if err != nil {
			return nil, err
		}

		p.Status = string(dbStatus)
		p.RequestDate = formatTime(reqTime)
		p.EventDate = eventTime.Format("2006-01-02 15:04")

		riskScore := 20
		if p.RequestedAmount > 1000000.0 {
			riskScore = 40
		}
		p.RiskScore = riskScore
		p.RiskLevel = computeRiskLevel(100 - riskScore)

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

	query := `
		SELECT
			p.id,
			p.amount,
			p.status,
			p.requested_at,
			e.id AS event_id,
			e.event_name,
			e.event_start,
			COALESCE(up.full_name, 'Unknown Organizer'),
			COALESCE(oa.business_email, 'org@crowdflow.com'),
			COALESCE(oa.notes, ''),
			e.entertainment_tax_rate,
			COALESCE(oa.bank_name, 'Bank Central Asia (BCA)'),
			COALESCE(oa.bank_account_number, '8024927501'),
			COALESCE(oa.bank_account_holder, up.full_name, 'Unknown Organizer'),
			COALESCE(oa.business_phone, '+62 812-3456-7890'),
			COALESCE(oa.business_license, 'BL-2026-ID-00123'),
			COALESCE(oa.status::text, 'Verified')
		FROM payouts p
		JOIN events e ON e.id = p.event_id
		LEFT JOIN organizer_applications oa ON oa.user_id = e.organizer_id
		LEFT JOIN user_profiles up ON up.user_id = e.organizer_id
		WHERE p.id = $1
	`
	var p AuditorPayout
	var reqTime, eventTime time.Time
	var dbStatus string
	var eventID int
	var taxRate float64

	err := r.db.QueryRowContext(ctx, query, payoutID).Scan(
		&p.ID,
		&p.RequestedAmount,
		&dbStatus,
		&reqTime,
		&eventID,
		&p.EventName,
		&eventTime,
		&p.OrganizerName,
		&p.OrganizerEmail,
		&p.InternalNotes,
		&taxRate,
		&p.BankName,
		&p.BankAccountNum,
		&p.BankHolder,
		&p.OrganizerPhone,
		&p.OrganizerBusinessLicense,
		&p.OrganizerStatus,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	p.Status = string(dbStatus)
	p.RequestDate = formatTime(reqTime)
	p.EventDate = eventTime.Format("2006-01-02 15:04")

	// Calculate Sales summary dynamically
	querySales := `
		SELECT 
			COALESCE(SUM(tickets_sold), 0),
			COALESCE(SUM(tickets_sold * price), 0.0)
		FROM ticket_tiers
		WHERE event_id = $1
	`
	var ticketsSold int
	var grossRevenue float64
	_ = r.db.QueryRowContext(ctx, querySales, eventID).Scan(&ticketsSold, &grossRevenue)

	platformFee := grossRevenue * 0.05
	gatewayFee := grossRevenue * 0.02
	taxAmount := grossRevenue * (taxRate / 100)
	netRevenue := grossRevenue - platformFee - gatewayFee - taxAmount

	p.SalesSummary = PayoutSales{
		TicketsSold:      ticketsSold,
		GrossRevenue:     grossRevenue,
		PlatformFee:      platformFee,
		GatewayFee:       gatewayFee,
		EntertainmentTax: taxAmount,
		RefundAmount:     0.0,
		NetRevenue:       netRevenue,
	}

	// Calculate Risk Score & Level
	riskScore := 20
	hasAlert := false
	alertMsg := ""

	if netRevenue > 100000.0 {
		riskScore = 45
	}
	var dupCount int
	_ = r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM payouts WHERE event_id = $1 AND status = 'approved'`, eventID).Scan(&dupCount)
	if dupCount > 0 {
		riskScore += 40
		hasAlert = true
		alertMsg = "Warning: Approved payout request already exists for this event!"
	}

	p.RiskScore = riskScore
	p.RiskLevel = computeRiskLevel(100 - riskScore)

	p.FraudDetection = FraudSignals{
		DuplicatePayout:   dupCount > 0,
		SuspiciousRevenue: grossRevenue > 250000.0 && ticketsSold < 100,
		UnusualRefundRate: false,
		HighChargeback:    false,
		HasAlert:          hasAlert,
		AlertMessage:      alertMsg,
	}

	// Fetch timeline logs from activity_log
	queryTimeline := `
		SELECT al.id, COALESCE(up.full_name, 'System'), al.action, al.detail, al.created_at
		FROM activity_log al
		LEFT JOIN user_profiles up ON up.user_id = al.actor_id
		WHERE detail ILIKE $1
		ORDER BY al.created_at DESC
	`
	timelinePattern := fmt.Sprintf("%%payout %d%%", payoutID)
	rowsTimeline, err := r.db.QueryContext(ctx, queryTimeline, timelinePattern)
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

	return &p, nil
}

func (r *PostgresAuditorRepository) ApprovePayout(ctx context.Context, payoutID, actorID int, req ApprovePayoutRequest) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `
		UPDATE payouts
		SET status = 'approved', processed_at = now(), processed_by = $1, updated_at = now()
		WHERE id = $2
	`, actorID, payoutID)
	if err != nil {
		return err
	}

	detail := fmt.Sprintf("Approved payout %d. Notes: %s. Finance Notes: %s", payoutID, req.InternalNotes, req.FinanceNotes)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO activity_log (actor_id, action, detail)
		VALUES ($1, 'Approve Payout', $2)
	`, actorID, detail)
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	go func() {
		_ = r.CreateNotificationForAuditors(context.Background(), "💰 Payout Disetujui", fmt.Sprintf("Payout #%d telah disetujui.", payoutID), "payout", strconv.Itoa(payoutID))
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
		INSERT INTO activity_log (actor_id, action, detail)
		VALUES ($1, 'Reject Payout', $2)
	`, actorID, detail)
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	go func() {
		_ = r.CreateNotificationForAuditors(context.Background(), "💰 Payout Ditolak", fmt.Sprintf("Payout #%d telah ditolak. Alasan: %s", payoutID, req.Reason), "payout", strconv.Itoa(payoutID))
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
		INSERT INTO activity_log (actor_id, action, detail)
		VALUES ($1, 'Hold Payout', $2)
	`, actorID, detail)
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	go func() {
		_ = r.CreateNotificationForAuditors(context.Background(), "💰 Payout Ditahan", fmt.Sprintf("Payout #%d telah ditahan. Alasan: %s", payoutID, req.Reason), "payout", strconv.Itoa(payoutID))
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
		rawURL = strings.ReplaceAll(rawURL, "localhost:9000", "localhost:9001")
		rawURL = strings.ReplaceAll(rawURL, "minio:9000", "localhost:9001")
		rawURL = strings.ReplaceAll(rawURL, "crowdflow-uploads", "crowdflow-public")
		return rawURL
	}
	if strings.HasPrefix(rawURL, "http://") || strings.HasPrefix(rawURL, "https://") {
		return rawURL
	}
	base := os.Getenv("S3_PUBLIC_BASE_URL")
	if base == "" {
		base = "http://localhost:9001/crowdflow-public"
	}
	base = strings.TrimSuffix(base, "/")
	cleaned := strings.TrimPrefix(rawURL, "/")
	if !strings.HasPrefix(cleaned, "events/") {
		cleaned = "events/covers/" + cleaned
	}
	return base + "/" + cleaned
}
