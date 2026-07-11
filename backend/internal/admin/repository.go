package admin

import (
	"database/sql"
	"errors"
	"strconv"
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

	var events []*Event
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

func (r *PostgresRepository) ListUsers() ([]*User, error) {
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
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*User
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

func (r *PostgresRepository) ListTransactions() ([]*Transaction, error) {
	rows, err := r.db.Query(`
		SELECT
			o.id, COALESCE(up.full_name, ''), e.event_name, o.gross_amount, o.payment_type, o.status, o.created_at
		FROM orders o
		LEFT JOIN users u ON o.purchaser_id = u.id
		LEFT JOIN user_profiles up ON u.id = up.user_id
		LEFT JOIN events e ON o.event_id = e.id
		WHERE o.status IN ('paid', 'pending', 'refunded')
		ORDER BY o.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []*Transaction
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
		SELECT id, name, price, allocation_limit, tickets_sold
		FROM ticket_tiers
		WHERE event_id = $1
		ORDER BY price ASC
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tiers []*TicketTier
	for rows.Next() {
		var id int
		var name string
		var price float64
		var capacity, sold int
		if err := rows.Scan(&id, &name, &price, &capacity, &sold); err != nil {
			return nil, err
		}
		tiers = append(tiers, &TicketTier{
			ID:       strconv.Itoa(id),
			Name:     name,
			Price:    price,
			Capacity: capacity,
			Sold:     sold,
			PriceCap: 0, // TODO: anti-scalping price cap (.agents/02) has no column yet
			Color:    "",
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return tiers, nil
}

// UpdateTicketTiers updates name/price/allocation_limit for existing tiers
// (matched by ID) belonging to eventID. Tiers without a valid numeric ID are
// skipped - creating brand new tiers requires sales_start/sales_end/
// max_ticket_per_user which the admin frontend's TicketTier type doesn't
// carry, so that's left as a follow-up rather than guessing defaults.
func (r *PostgresRepository) UpdateTicketTiers(eventID int, tiers []*TicketTier) error {
	for _, t := range tiers {
		id, err := strconv.Atoi(t.ID)
		if err != nil {
			continue
		}
		if _, err := r.db.Exec(`
			UPDATE ticket_tiers SET name = $1, price = $2, allocation_limit = $3, updated_at = now()
			WHERE id = $4 AND event_id = $5
		`, t.Name, t.Price, t.Capacity, id, eventID); err != nil {
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

	var sections []*VenueSection
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
func (r *PostgresRepository) UpdateUserStatus(userID int, status string) error {
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
	_, err := r.db.Exec(`UPDATE users SET verification_status = $1, updated_at = now() WHERE id = $2`, dbStatus, userID)
	return err
}

// GrantUserRole assigns a role to a user, scoped to a specific event when
// eventID is non-nil (e.g. Auditor on event 42) or platform-wide when nil
// (e.g. Event Organizer everywhere) - mirrors the user_roles.event_id design
// (see the two partial unique indexes idx_user_roles_event/idx_user_roles_platform).
// Only verified users may be granted a role. Duplicate grants are rejected
// with a clean validation error rather than surfacing the raw unique
// constraint violation.
func (r *PostgresRepository) GrantUserRole(userID int, roleID int, eventID *int) error {
	var verificationStatus string
	err := r.db.QueryRow(`SELECT verification_status FROM users WHERE id = $1`, userID).Scan(&verificationStatus)
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

	_, err = r.db.Exec(`INSERT INTO user_roles (user_id, event_id, role_id) VALUES ($1, $2, $3)`, userID, eventID, roleID)
	return err
}

// ListVerifications derives the Verification Queue directly from users with
// verification_status = 'pending_verification' - there is no separate
// verification_applications table. The applicant's ID is the user's own ID,
// so Approve/Reject reuse UpdateUserStatus rather than needing a parallel
// data model. businessType/documentType/submittedAt are fields the frontend
// type expects that the DB doesn't model - placeholders until a real KYC
// application table exists.
func (r *PostgresRepository) ListVerifications() ([]*VerificationApplication, error) {
	rows, err := r.db.Query(`
		SELECT u.id, COALESCE(up.full_name, ''), u.email, u.created_at
		FROM users u
		LEFT JOIN user_profiles up ON u.id = up.user_id
		WHERE u.verification_status = 'pending_verification'
		ORDER BY u.created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var verifications []*VerificationApplication
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
func (r *PostgresRepository) UpdateTransactionStatus(orderID string, status string) error {
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
	_, err := r.db.Exec(`UPDATE orders SET status = $1, updated_at = now() WHERE id = $2`, dbStatus, orderID)
	return err
}
