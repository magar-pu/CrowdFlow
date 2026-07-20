package resale

import (
	"database/sql"
	"fmt"
)

// PostgresRepository implements the Repository interface using PostgreSQL.
type PostgresRepository struct {
	db *sql.DB
}

// NewPostgresRepository creates a new PostgresRepository.
func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

// listingSelectColumns is the shared column list for all listing queries.
// It joins ticket_resale_listings → tickets → ticket_tiers → events → venues
// → event_types → users (seller) to populate all display fields.
const listingSelectQuery = `
	SELECT
		trl.id,
		trl.ticket_id,
		trl.seller_id,
		trl.original_ticket_price,
		trl.listing_price,
		trl.status,
		trl.created_at,
		trl.expires_at,
		trl.updated_at,
		e.id AS event_id,
		e.event_name,
		e.event_start,
		e.event_end,
		e.event_type_id,
		COALESCE(e.cover_image_url, '') AS cover_image_url,
		v.name AS venue_name,
		v.city AS venue_city,
		tt.name AS tier_name,
		COALESCE(up.full_name, u.email) AS seller_name
	FROM ticket_resale_listings trl
	JOIN tickets t ON trl.ticket_id = t.id
	JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
	JOIN events e ON tt.event_id = e.id
	JOIN venues v ON e.venue_id = v.id
	JOIN users u ON trl.seller_id = u.id
	LEFT JOIN user_profiles up ON u.id = up.user_id
`

// scanListing scans a single row into a ResaleListing struct.
func scanListing(scanner interface{ Scan(...interface{}) error }) (*ResaleListing, error) {
	l := &ResaleListing{}
	err := scanner.Scan(
		&l.ID,
		&l.TicketID,
		&l.SellerID,
		&l.OriginalTicketPrice,
		&l.ListingPrice,
		&l.Status,
		&l.CreatedAt,
		&l.ExpiresAt,
		&l.UpdatedAt,
		&l.EventID,
		&l.EventName,
		&l.EventStart,
		&l.EventEnd,
		&l.EventTypeID,
		&l.CoverImageURL,
		&l.VenueName,
		&l.VenueCity,
		&l.TierName,
		&l.SellerName,
	)
	if err != nil {
		return nil, err
	}
	return l, nil
}

// ListActive returns all active resale listings, ordered by newest first.
func (r *PostgresRepository) ListActive(limit, offset int) ([]*ResaleListing, error) {
	query := listingSelectQuery + `
		WHERE trl.status = 'active' AND trl.expires_at > NOW()
		ORDER BY trl.created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.Query(query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list active resale listings: %w", err)
	}
	defer rows.Close()

	var listings []*ResaleListing
	for rows.Next() {
		l, err := scanListing(rows)
		if err != nil {
			return nil, fmt.Errorf("scan resale listing row: %w", err)
		}
		listings = append(listings, l)
	}
	return listings, rows.Err()
}

// GetByID returns a single resale listing by its UUID.
func (r *PostgresRepository) GetByID(id string) (*ResaleListing, error) {
	query := listingSelectQuery + ` WHERE trl.id = $1`

	l, err := scanListing(r.db.QueryRow(query, id))
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("resale listing not found")
	}
	if err != nil {
		return nil, fmt.Errorf("get resale listing by id: %w", err)
	}
	return l, nil
}

// GetBySellerID returns all listings belonging to a specific seller.
func (r *PostgresRepository) GetBySellerID(sellerID int) ([]*ResaleListing, error) {
	query := listingSelectQuery + `
		WHERE trl.seller_id = $1
		ORDER BY trl.created_at DESC
	`

	rows, err := r.db.Query(query, sellerID)
	if err != nil {
		return nil, fmt.Errorf("list seller resale listings: %w", err)
	}
	defer rows.Close()

	var listings []*ResaleListing
	for rows.Next() {
		l, err := scanListing(rows)
		if err != nil {
			return nil, fmt.Errorf("scan seller listing row: %w", err)
		}
		listings = append(listings, l)
	}
	return listings, rows.Err()
}

// Create inserts a new resale listing into the database.
func (r *PostgresRepository) Create(listing *ResaleListing) error {
	query := `
		INSERT INTO ticket_resale_listings (
			ticket_id, seller_id, original_ticket_price, listing_price, expires_at
		) VALUES ($1, $2, $3, $4, $5)
		RETURNING id, status, created_at, updated_at
	`

	return r.db.QueryRow(
		query,
		listing.TicketID,
		listing.SellerID,
		listing.OriginalTicketPrice,
		listing.ListingPrice,
		listing.ExpiresAt,
	).Scan(&listing.ID, &listing.Status, &listing.CreatedAt, &listing.UpdatedAt)
}

// Cancel sets an active listing's status to 'cancelled'. Only the owner
// (seller_id) can cancel their own listing.
func (r *PostgresRepository) Cancel(id string, sellerID int) error {
	query := `
		UPDATE ticket_resale_listings
		SET status = 'cancelled'
		WHERE id = $1 AND seller_id = $2 AND status = 'active'
	`

	result, err := r.db.Exec(query, id, sellerID)
	if err != nil {
		return fmt.Errorf("cancel resale listing: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("check cancel result: %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("listing not found, not owned by you, or already cancelled")
	}
	return nil
}

// IsTicketOwnedBy checks whether a ticket belongs to the specified user
// by verifying the order's purchaser_id.
func (r *PostgresRepository) IsTicketOwnedBy(ticketID string, userID int) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1
			FROM tickets t
			JOIN orders o ON t.order_id = o.id
			WHERE t.id = $1 AND o.purchaser_id = $2
			  AND t.ticket_status = 'issued'
			  AND o.status = 'paid'
		)
	`
	var exists bool
	err := r.db.QueryRow(query, ticketID, userID).Scan(&exists)
	return exists, err
}

// IsTicketAlreadyListed checks whether a ticket already has an active
// resale listing to prevent double-listing.
func (r *PostgresRepository) IsTicketAlreadyListed(ticketID string) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1
			FROM ticket_resale_listings
			WHERE ticket_id = $1 AND status = 'active'
		)
	`
	var exists bool
	err := r.db.QueryRow(query, ticketID).Scan(&exists)
	return exists, err
}
