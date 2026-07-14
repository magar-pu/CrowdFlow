package admin

import (
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

// mapEventStatus collapses the DB's 4-value event_status enum (draft,
// pending_review, approved, rejected) into the admin frontend's 3-value union
// (Draft, Active, Completed). pending_review/rejected both fall back to
// "Draft" since the frontend has no equivalent of an in-review/rejected state.
func mapEventStatus(dbStatus string, eventEnd time.Time) string {
	switch dbStatus {
	case "approved":
		if time.Now().After(eventEnd) {
			return "Completed"
		}
		return "Active"
	default: // draft, pending_review, rejected
		return "Draft"
	}
}

// mapPaymentMethod translates the DB's Indonesian payment rails to the admin
// frontend's existing method union where a direct match exists, and passes
// the raw value through otherwise. The frontend's
// 'Credit Card' | 'Apple Pay' | 'Crypto' | 'Bank Transfer' union was built
// without reference to the real payment_method enum (bank_transfer, qris,
// gopay, shopeepay, credit_card, debit_card) - qris/gopay/shopeepay/debit_card
// have no honest equivalent, so this deliberately does not force a false
// label onto them. The frontend union should be widened to match reality.
func mapPaymentMethod(dbMethod string) string {
	switch dbMethod {
	case "bank_transfer":
		return "Bank Transfer"
	case "credit_card":
		return "Credit Card"
	default:
		return dbMethod
	}
}

// mapOrderStatus translates order_status to the admin frontend's
// 'Success' | 'Pending' | 'Refunded' union.
func mapOrderStatus(dbStatus string) string {
	switch dbStatus {
	case "paid":
		return "Success"
	case "refunded":
		return "Refunded"
	default: // pending
		return "Pending"
	}
}

func (r *PostgresRepository) GetDashboardStats() (*DashboardStats, error) {
	var stats DashboardStats
	err := r.db.QueryRow(`
		SELECT
			(SELECT COUNT(*) FROM events),
			(SELECT COUNT(*) FROM users),
			(SELECT COALESCE(SUM(net_amount), 0) FROM orders WHERE status = 'paid'),
			(SELECT COALESCE(SUM(tickets_sold), 0) FROM ticket_tiers)
	`).Scan(&stats.TotalEvents, &stats.TotalUsers, &stats.TotalRevenue, &stats.TicketsSold)
	if err != nil {
		return nil, err
	}
	return &stats, nil
}

func (r *PostgresRepository) ListEvents(limit, offset int) ([]*Event, error) {
	rows, err := r.db.Query(`
		SELECT
			e.id, e.event_name, e.event_start, e.event_end, e.status, COALESCE(e.cover_image_url, ''), COALESCE(e.description, ''),
			COALESCE(v.name, ''), COALESCE(v.city, ''), COALESCE(v.province, ''), COALESCE(v.total_capacity, 0),
			COALESCE((SELECT SUM(tt.tickets_sold) FROM ticket_tiers tt WHERE tt.event_id = e.id), 0),
			COALESCE((SELECT SUM(o.net_amount) FROM orders o WHERE o.event_id = e.id AND o.status = 'paid'), 0),
			COALESCE(et.event_type, 'Uncategorized')
		FROM events e
		LEFT JOIN venues v ON e.venue_id = v.id
		LEFT JOIN event_types et ON e.event_type_id = et.id
		ORDER BY e.created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Non-nil so an empty result marshals as `[]`, not `null` - the frontend's
	// `result.success && result.data` check treats `null` as an error. Same
	// reasoning as GetTicketTiers below; applies to every list query here.
	events := []*Event{}
	for rows.Next() {
		var id int
		var name string
		var eventStart, eventEnd time.Time
		var dbStatus, coverImage, description, venueName, city, province, category string
		var capacity, ticketsSold int
		var totalRevenue float64

		if err := rows.Scan(
			&id, &name, &eventStart, &eventEnd, &dbStatus, &coverImage, &description,
			&venueName, &city, &province, &capacity,
			&ticketsSold, &totalRevenue, &category,
		); err != nil {
			return nil, err
		}

		location := city
		if province != "" {
			location = city + ", " + province
		}

		events = append(events, &Event{
			ID:           strconv.Itoa(id),
			Name:         name,
			Date:         eventStart.Format("2006-01-02"),
			Venue:        venueName,
			Location:     location,
			Status:       mapEventStatus(dbStatus, eventEnd),
			Image:        coverImage,
			Capacity:     capacity,
			TicketsSold:  ticketsSold,
			TotalRevenue: totalRevenue,
			Category:     category,
			Description:  description,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return events, nil
}

func (r *PostgresRepository) ListUsers(limit, offset int) ([]*User, error) {
	rows, err := r.db.Query(`
		SELECT
			u.id, COALESCE(up.full_name, ''), u.email, u.verification_status, u.created_at, COALESCE(up.avatar_pic, ''),
			COALESCE((SELECT COUNT(*) FROM orders o WHERE o.purchaser_id = u.id), 0),
			COALESCE((
				SELECT r.role_name FROM user_roles ur
				JOIN roles r ON ur.role_id = r.id
				WHERE ur.user_id = u.id AND ur.event_id IS NULL
				LIMIT 1
			), 'User')
		FROM users u
		LEFT JOIN user_profiles up ON u.id = up.user_id
		ORDER BY u.created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []*User{}
	for rows.Next() {
		var id int
		var fullName, email, verificationStatus, avatarPic, platformRole string
		var createdAt time.Time
		var txCount int

		if err := rows.Scan(&id, &fullName, &email, &verificationStatus, &createdAt, &avatarPic, &txCount, &platformRole); err != nil {
			return nil, err
		}

		users = append(users, &User{
			ID:                strconv.Itoa(id),
			Name:              fullName,
			Email:             email,
			Role:              mapPlatformRole(platformRole),
			Status:            mapVerificationStatus(verificationStatus),
			JoinedAt:          createdAt.Format("2006-01-02"),
			TransactionsCount: txCount,
			ProfilePic:        avatarPic,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return users, nil
}

// mapPlatformRole translates DB platform role names to the admin frontend's
// 'Buyer' | 'Seller' | 'Organizer' | 'Admin' union. This mapping is lossy:
// "Auditor" has no equivalent, and "Seller" isn't a platform role at all in
// the RBAC schema (resale is an order_type on orders/ticket_resale_listings,
// not a role) - both fall back to "Buyer". The frontend union should be
// reconciled with the real roles table.
func mapPlatformRole(dbRole string) string {
	switch dbRole {
	case "Event Organizer":
		return "Organizer"
	case "Super Admin":
		return "Admin"
	default: // "User", "Auditor"
		return "Buyer"
	}
}

// mapVerificationStatus translates users.verification_status
// (pending_verification | verified | rejected) to the admin frontend's
// 'Verified' | 'Pending' | 'Suspended' union. "Suspended" implies an account
// action distinct from KYC rejection - there is no such column yet, so
// "rejected" is mapped here as the closest available value.
func mapVerificationStatus(dbStatus string) string {
	switch dbStatus {
	case "verified":
		return "Verified"
	case "rejected":
		return "Suspended"
	default: // pending_verification
		return "Pending"
	}
}

func (r *PostgresRepository) ListTransactions(limit, offset int) ([]*Transaction, error) {
	rows, err := r.db.Query(`
		SELECT
			o.id, COALESCE(up.full_name, ''), e.event_name, o.gross_amount, o.payment_type, o.status, o.created_at
		FROM orders o
		LEFT JOIN users u ON o.purchaser_id = u.id
		LEFT JOIN user_profiles up ON u.id = up.user_id
		LEFT JOIN events e ON o.event_id = e.id
		WHERE o.status IN ('paid', 'pending', 'refunded')
		ORDER BY o.created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	transactions := []*Transaction{}
	for rows.Next() {
		var id, customerName, eventName, dbMethod, dbStatus string
		var amount float64
		var createdAt time.Time

		if err := rows.Scan(&id, &customerName, &eventName, &amount, &dbMethod, &dbStatus, &createdAt); err != nil {
			return nil, err
		}

		transactions = append(transactions, &Transaction{
			ID:           id,
			CustomerName: customerName,
			EventName:    eventName,
			Amount:       amount,
			Method:       mapPaymentMethod(dbMethod),
			Status:       mapOrderStatus(dbStatus),
			Date:         createdAt.Format("2006-01-02"),
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return transactions, nil
}

func (r *PostgresRepository) GetTicketTiers(eventID int) ([]*TicketTier, error) {
	rows, err := r.db.Query(`
		SELECT id, name, COALESCE(description, ''), price, allocation_limit, tickets_sold
		FROM ticket_tiers
		WHERE event_id = $1
		ORDER BY price ASC
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// A nil slice marshals to JSON `null`, not `[]` - which the frontend's
	// `if (result.success && result.data)` truthy check treats as "no data"
	// (falling into its error branch) rather than "empty list", leaving
	// whatever tiers were already in state from a previously viewed event
	// displayed under this one. Starting from a non-nil empty slice keeps an
	// event with zero tiers an honest `[]`.
	tiers := []*TicketTier{}
	for rows.Next() {
		var id int
		var name, description string
		var price float64
		var capacity, sold int
		if err := rows.Scan(&id, &name, &description, &price, &capacity, &sold); err != nil {
			return nil, err
		}
		tiers = append(tiers, &TicketTier{
			ID:          strconv.Itoa(id),
			Name:        name,
			Description: description,
			Price:       price,
			Capacity:    capacity,
			Sold:        sold,
			PriceCap:    0, // TODO: anti-scalping price cap (.agents/02) has no column yet
			Color:       "",
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return tiers, nil
}

// UpdateTicketTiers updates name/description/price/allocation_limit for existing tiers
// (matched by a valid numeric ID) belonging to eventID, and inserts a new row
// for any tier without one (the admin frontend assigns new tiers a synthetic
// "TIER-<timestamp>" ID client-side). ticket_tiers requires sales_start/
// sales_end, which the admin frontend's TicketTier type doesn't carry -
// new rows default to "on sale now through the event's end", the only
// sensible default without a real per-tier sales-window UI.
// max_ticket_per_user/visibility fall back to their DB column defaults.
func (r *PostgresRepository) UpdateTicketTiers(eventID int, tiers []*TicketTier) error {
	var eventEnd time.Time

	for _, t := range tiers {
		id, err := strconv.Atoi(t.ID)
		if err != nil {
			if eventEnd.IsZero() {
				if err := r.db.QueryRow(`SELECT event_end FROM events WHERE id = $1`, eventID).Scan(&eventEnd); err != nil {
					return err
				}
			}
			if _, err := r.db.Exec(`
				INSERT INTO ticket_tiers (event_id, name, description, price, allocation_limit, sales_start, sales_end)
				VALUES ($1, $2, NULLIF($3, ''), $4, $5, now(), $6)
			`, eventID, t.Name, t.Description, t.Price, t.Capacity, eventEnd); err != nil {
				return err
			}
			continue
		}
		if _, err := r.db.Exec(`
			UPDATE ticket_tiers SET name = $1, description = NULLIF($2, ''), price = $3, allocation_limit = $4, updated_at = now()
			WHERE id = $5 AND event_id = $6
		`, t.Name, t.Description, t.Price, t.Capacity, id, eventID); err != nil {
			return err
		}
	}
	return nil
}

func (r *PostgresRepository) GetVenueSections(eventID int) ([]*VenueSection, error) {
	rows, err := r.db.Query(`
		SELECT vs.id, vs.section_name, vs.capacity
		FROM venue_sections vs
		JOIN events e ON e.venue_id = vs.venue_id
		WHERE e.id = $1
		ORDER BY vs.section_name ASC
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Same nil-vs-empty-slice reasoning as GetTicketTiers above.
	sections := []*VenueSection{}
	for rows.Next() {
		var id int
		var name string
		var capacity int
		if err := rows.Scan(&id, &name, &capacity); err != nil {
			return nil, err
		}
		sections = append(sections, &VenueSection{
			ID:       strconv.Itoa(id),
			Name:     name,
			Capacity: capacity,
			Occupied: 0, // TODO: requires joining seat/ticket assignment by section
			Color:    "",
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return sections, nil
}

// UpdateVenueSections updates name/capacity for existing sections (matched by
// ID). Sections without a valid numeric ID are skipped for the same reason as
// UpdateTicketTiers - creating a new section requires resolving the event's
// venue_id, which is done here for consistency but new-row insertion is left
// as a follow-up.
func (r *PostgresRepository) UpdateVenueSections(eventID int, sections []*VenueSection) error {
	var venueID int
	if err := r.db.QueryRow(`SELECT venue_id FROM events WHERE id = $1`, eventID).Scan(&venueID); err != nil {
		return err
	}

	for _, s := range sections {
		id, err := strconv.Atoi(s.ID)
		if err != nil {
			continue
		}
		if _, err := r.db.Exec(`
			UPDATE venue_sections SET section_name = $1, capacity = $2
			WHERE id = $3 AND venue_id = $4
		`, s.Name, s.Capacity, id, venueID); err != nil {
			return err
		}
	}
	return nil
}

// UpdateUserStatus reverse-maps the admin frontend's display status onto
// users.verification_status. There is no dedicated account-suspension column,
// so "Suspended" is approximated as "rejected" - see mapVerificationStatus.
func (r *PostgresRepository) UpdateUserStatus(userID int, status string, actorID int) error {
	var dbStatus string
	switch status {
	case "Verified":
		dbStatus = "verified"
	case "Suspended":
		dbStatus = "rejected"
	case "Pending":
		dbStatus = "pending_verification"
	default:
		return errors.New("unknown status: " + status)
	}
	var targetName string
	if err := r.db.QueryRow(`
		SELECT COALESCE(up.full_name, u.email) FROM users u
		LEFT JOIN user_profiles up ON up.user_id = u.id
		WHERE u.id = $1
	`, userID).Scan(&targetName); err != nil {
		return err
	}
	if _, err := r.db.Exec(`UPDATE users SET verification_status = $1, updated_at = now() WHERE id = $2`, dbStatus, userID); err != nil {
		return err
	}
	return r.insertActivity(actorID, "Updated User Status", fmt.Sprintf("Set %q's status to %s.", targetName, status))
}

// GrantUserRole assigns a role to a user, scoped to a specific event when
// eventID is non-nil (e.g. Auditor on event 42) or platform-wide when nil
// (e.g. Event Organizer everywhere) - mirrors the user_roles.event_id design
// (see the two partial unique indexes idx_user_roles_event/idx_user_roles_platform).
// Only verified users may be granted a role. Duplicate grants are rejected
// with a clean validation error rather than surfacing the raw unique
// constraint violation.
func (r *PostgresRepository) GrantUserRole(userID int, roleID int, eventID *int, actorID int) error {
	var verificationStatus, targetName string
	err := r.db.QueryRow(`
		SELECT u.verification_status, COALESCE(up.full_name, u.email) FROM users u
		LEFT JOIN user_profiles up ON up.user_id = u.id
		WHERE u.id = $1
	`, userID).Scan(&verificationStatus, &targetName)
	if err != nil {
		if err == sql.ErrNoRows {
			return errors.New("user not found")
		}
		return err
	}
	if verificationStatus != "verified" {
		return errors.New("user must be verified before a role can be granted")
	}

	var alreadyGranted bool
	existsQuery := `SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2 AND event_id IS NOT DISTINCT FROM $3)`
	if err := r.db.QueryRow(existsQuery, userID, roleID, eventID).Scan(&alreadyGranted); err != nil {
		return err
	}
	if alreadyGranted {
		return errors.New("user already has this role assignment")
	}

	var roleName string
	if err := r.db.QueryRow(`SELECT role_name FROM roles WHERE id = $1`, roleID).Scan(&roleName); err != nil {
		return err
	}

	if _, err := r.db.Exec(`INSERT INTO user_roles (user_id, event_id, role_id) VALUES ($1, $2, $3)`, userID, eventID, roleID); err != nil {
		return err
	}

	detail := fmt.Sprintf("Granted %q the %s role.", targetName, roleName)
	if eventID != nil {
		detail = fmt.Sprintf("Granted %q the %s role for event #%d.", targetName, roleName, *eventID)
	}
	return r.insertActivity(actorID, "Granted Role", detail)
}

// ListVerifications derives the Verification Queue directly from users with
// verification_status = 'pending_verification' - there is no separate
// verification_applications table. The applicant's ID is the user's own ID,
// so Approve/Reject reuse UpdateUserStatus rather than needing a parallel
// data model. businessType/documentType/submittedAt are fields the frontend
// type expects that the DB doesn't model - placeholders until a real KYC
// application table exists.
func (r *PostgresRepository) ListVerifications(limit, offset int) ([]*VerificationApplication, error) {
	rows, err := r.db.Query(`
		SELECT u.id, COALESCE(up.full_name, ''), u.email, u.created_at
		FROM users u
		LEFT JOIN user_profiles up ON u.id = up.user_id
		WHERE u.verification_status = 'pending_verification'
		ORDER BY u.created_at ASC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	verifications := []*VerificationApplication{}
	for rows.Next() {
		var id int
		var fullName, email string
		var createdAt time.Time

		if err := rows.Scan(&id, &fullName, &email, &createdAt); err != nil {
			return nil, err
		}

		verifications = append(verifications, &VerificationApplication{
			ID:           strconv.Itoa(id),
			Name:         fullName,
			Email:        email,
			BusinessType: "Not specified",
			DocumentType: "Not specified",
			SubmittedAt:  createdAt.Format("2006-01-02"),
			Status:       "Pending",
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return verifications, nil
}

// UpdateTransactionStatus reverse-maps the admin frontend's display status
// onto orders.status - see mapOrderStatus for the forward direction.
func (r *PostgresRepository) UpdateTransactionStatus(orderID string, status string, actorID int) error {
	var dbStatus string
	switch status {
	case "Success":
		dbStatus = "paid"
	case "Refunded":
		dbStatus = "refunded"
	case "Pending":
		dbStatus = "pending"
	default:
		return errors.New("unknown status: " + status)
	}
	if _, err := r.db.Exec(`UPDATE orders SET status = $1, updated_at = now() WHERE id = $2`, dbStatus, orderID); err != nil {
		return err
	}
	return r.insertActivity(actorID, "Updated Transaction Status", fmt.Sprintf("Set order #%s to %s.", orderID, status))
}

// insertActivity appends a row to the admin action audit trail
// (migrations/0001_payouts_and_activity_log.sql). Failures here surface as a
// real error rather than being swallowed, since a silently-dropped audit
// entry is itself a correctness problem for an admin console.
func (r *PostgresRepository) insertActivity(actorID int, action, detail string) error {
	_, err := r.db.Exec(`INSERT INTO activity_log (actor_id, action, detail) VALUES ($1, $2, $3)`, actorID, action, detail)
	return err
}

func (r *PostgresRepository) ListActivities() ([]*Activity, error) {
	rows, err := r.db.Query(`
		SELECT al.id, COALESCE(up.full_name, 'Admin'), al.action, al.detail, al.created_at
		FROM activity_log al
		LEFT JOIN user_profiles up ON up.user_id = al.actor_id
		ORDER BY al.created_at DESC
		LIMIT 50
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	activities := []*Activity{}
	for rows.Next() {
		var id int
		var userName, action, detail string
		var createdAt time.Time
		if err := rows.Scan(&id, &userName, &action, &detail, &createdAt); err != nil {
			return nil, err
		}
		activities = append(activities, &Activity{
			ID:        strconv.Itoa(id),
			UserName:  userName,
			Action:    action,
			Detail:    detail,
			Timestamp: createdAt.Format("2006-01-02 15:04"),
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return activities, nil
}

// mapPayoutStatus translates the payout_status enum to the admin frontend's
// 'Processed' | 'Pending' | 'Failed' union.
func mapPayoutStatus(dbStatus string) string {
	switch dbStatus {
	case "processed":
		return "Processed"
	case "failed":
		return "Failed"
	default:
		return "Pending"
	}
}

// ListPayouts unions two things under one Payout shape:
//  1. Live-computed outstanding balances - for each event, paid orders'
//     net_amount minus whatever has already been recorded in `payouts`. There
//     is no organizer-facing "request a payout" flow yet, so these synthetic
//     rows (id "PENDING-<eventID>") represent money owed but not yet settled,
//     the same "derive from real data, don't fabricate a table" approach used
//     by ListVerifications above.
//  2. Real historical rows already recorded in `payouts` (processed or
//     rejected/failed) - see ProcessPayout/RejectPayout.
func (r *PostgresRepository) ListPayouts(limit, offset int) ([]*Payout, error) {
	rows, err := r.db.Query(`
		WITH balances AS (
			SELECT
				e.id AS event_id,
				e.event_name,
				COALESCE(up.full_name, '') AS organizer_name,
				COALESCE((SELECT SUM(o.net_amount) FROM orders o WHERE o.event_id = e.id AND o.status = 'paid'), 0)
					- COALESCE((SELECT SUM(p.amount) FROM payouts p WHERE p.event_id = e.id), 0) AS outstanding,
				COALESCE((SELECT MAX(o.paid_at) FROM orders o WHERE o.event_id = e.id AND o.status = 'paid'), e.created_at) AS last_activity
			FROM events e
			LEFT JOIN users u ON u.id = e.organizer_id
			LEFT JOIN user_profiles up ON up.user_id = u.id
		)
		SELECT 'PENDING-' || event_id, organizer_name, event_name, outstanding, 'pending', last_activity
		FROM balances
		WHERE outstanding > 0
		UNION ALL
		SELECT p.id::text, COALESCE(up.full_name, ''), e.event_name, p.amount, p.status::text, p.requested_at
		FROM payouts p
		JOIN events e ON e.id = p.event_id
		LEFT JOIN users u ON u.id = e.organizer_id
		LEFT JOIN user_profiles up ON up.user_id = u.id
		ORDER BY 6 DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	payouts := []*Payout{}
	for rows.Next() {
		var id, organizerName, eventName, dbStatus string
		var amount float64
		var requestedAt time.Time
		if err := rows.Scan(&id, &organizerName, &eventName, &amount, &dbStatus, &requestedAt); err != nil {
			return nil, err
		}
		payouts = append(payouts, &Payout{
			ID:            id,
			OrganizerName: organizerName,
			EventName:     eventName,
			Amount:        amount,
			Status:        mapPayoutStatus(dbStatus),
			RequestedDate: requestedAt.Format("2006-01-02"),
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return payouts, nil
}

// parsePayoutID distinguishes a synthetic live-computed balance
// ("PENDING-<eventID>", see ListPayouts) from a real payouts.id being
// retried after a prior rejection.
func parsePayoutID(payoutID string) (eventID int, existingID int, isSynthetic bool, err error) {
	if rest, ok := strings.CutPrefix(payoutID, "PENDING-"); ok {
		id, convErr := strconv.Atoi(rest)
		if convErr != nil {
			return 0, 0, false, errors.New("invalid payout id")
		}
		return id, 0, true, nil
	}
	id, convErr := strconv.Atoi(payoutID)
	if convErr != nil {
		return 0, 0, false, errors.New("invalid payout id")
	}
	return 0, id, false, nil
}

// settlePayout records a payout decision (process or reject) as a real row.
// For a synthetic pending balance, it re-computes the outstanding amount
// inside the transaction (holding a per-event advisory lock so two concurrent
// "Process" clicks can't double-pay the same balance) and inserts a new row.
// For a retry of a previously-failed real payout, it updates that row in
// place rather than creating a duplicate ledger entry.
func (r *PostgresRepository) settlePayout(payoutID string, actorID int, newStatus string, actionLabel string) error {
	eventIDArg, existingID, isSynthetic, err := parsePayoutID(payoutID)
	if err != nil {
		return err
	}

	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var resultEventID int
	var amount float64

	if isSynthetic {
		if _, err := tx.Exec(`SELECT pg_advisory_xact_lock($1)`, eventIDArg); err != nil {
			return err
		}

		if err := tx.QueryRow(`
			SELECT
				COALESCE((SELECT SUM(o.net_amount) FROM orders o WHERE o.event_id = $1 AND o.status = 'paid'), 0)
					- COALESCE((SELECT SUM(p.amount) FROM payouts p WHERE p.event_id = $1), 0)
		`, eventIDArg).Scan(&amount); err != nil {
			return err
		}
		if amount <= 0 {
			return errors.New("no outstanding balance for this event")
		}

		if err := tx.QueryRow(`
			INSERT INTO payouts (event_id, amount, status, processed_at, processed_by)
			VALUES ($1, $2, $3, now(), $4)
			RETURNING event_id
		`, eventIDArg, amount, newStatus, actorID).Scan(&resultEventID); err != nil {
			return err
		}
	} else {
		err := tx.QueryRow(`
			UPDATE payouts SET status = $1, processed_at = now(), processed_by = $2, updated_at = now()
			WHERE id = $3 AND status = 'failed'
			RETURNING event_id, amount
		`, newStatus, actorID, existingID).Scan(&resultEventID, &amount)
		if err == sql.ErrNoRows {
			return errors.New("payout not found or already settled")
		}
		if err != nil {
			return err
		}
	}

	var eventName string
	if err := tx.QueryRow(`SELECT event_name FROM events WHERE id = $1`, resultEventID).Scan(&eventName); err != nil {
		return err
	}

	detail := fmt.Sprintf("%s payout of %.2f for %q.", actionLabel, amount, eventName)
	if _, err := tx.Exec(`INSERT INTO activity_log (actor_id, action, detail) VALUES ($1, $2, $3)`, actorID, actionLabel+" Payout", detail); err != nil {
		return err
	}

	return tx.Commit()
}

func (r *PostgresRepository) ProcessPayout(payoutID string, actorID int) error {
	return r.settlePayout(payoutID, actorID, "processed", "Processed")
}

func (r *PostgresRepository) RejectPayout(payoutID string, actorID int) error {
	return r.settlePayout(payoutID, actorID, "failed", "Rejected")
}
