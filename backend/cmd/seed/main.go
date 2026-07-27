package main

import (
	"crypto/rand"
	"database/sql"
	"fmt"
	"log"
	"math/big"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func generateBase32Secret() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
	b := make([]byte, 32)
	for i := range b {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			b[i] = charset[i%len(charset)]
		} else {
			b[i] = charset[num.Int64()]
		}
	}
	return string(b)
}

func main() {
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/crowdflow?sslmode=disable"
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("Failed to open DB: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping DB: %v", err)
	}

	// Print chk_net_amount definition
	var conDef string
	err = db.QueryRow("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'chk_net_amount'").Scan(&conDef)
	if err == nil {
		fmt.Printf("chk_net_amount constraint definition: %s\n", conDef)
	}

	// 1. Query users
	rows, err := db.Query(`
		SELECT u.id, u.email, COALESCE(up.full_name, 'User') as full_name
		FROM users u
		LEFT JOIN user_profiles up ON u.id = up.user_id
		ORDER BY u.id ASC
	`)
	if err != nil {
		log.Fatalf("Failed to query users: %v", err)
	}
	defer rows.Close()

	type UserInfo struct {
		ID       int
		Email    string
		FullName string
	}

	var users []UserInfo
	fmt.Println("\nExisting Users in System:")
	for rows.Next() {
		var u UserInfo
		rows.Scan(&u.ID, &u.Email, &u.FullName)
		users = append(users, u)
		fmt.Printf(" - ID: %d | Email: %s | Name: %s\n", u.ID, u.Email, u.FullName)
	}

	if len(users) == 0 {
		log.Fatalf("No users found in database.")
	}

	// Find Admin user super-admin@crowdflow.my.id
	var adminUser UserInfo
	foundAdmin := false
	for _, u := range users {
		if u.Email == "super-admin@crowdflow.my.id" {
			adminUser = u
			foundAdmin = true
			break
		}
	}
	if !foundAdmin {
		adminUser = users[0]
	}

	fmt.Printf("\nSelected Target Admin User: ID %d (%s, %s)\n", adminUser.ID, adminUser.Email, adminUser.FullName)

	// Get or Create Venue
	var venueID int
	err = db.QueryRow("SELECT id FROM venues LIMIT 1").Scan(&venueID)
	if err != nil {
		err = db.QueryRow(`
			INSERT INTO venues (name, address, city, created_at, updated_at)
			VALUES ('Main Hall', 'Jl. Jend. Sudirman', 'Jakarta', NOW(), NOW())
			RETURNING id
		`).Scan(&venueID)
		if err != nil {
			log.Fatalf("Failed to resolve venue: %v", err)
		}
	}

	// Get or Create Event Type
	var eventTypeID int
	err = db.QueryRow("SELECT id FROM event_types LIMIT 1").Scan(&eventTypeID)
	if err != nil {
		err = db.QueryRow("SELECT event_type_id FROM event_types LIMIT 1").Scan(&eventTypeID)
		if err != nil {
			err = db.QueryRow(`
				INSERT INTO event_types (event_type, created_at, updated_at)
				VALUES ('Music Concert', NOW(), NOW())
				RETURNING event_type_id
			`).Scan(&eventTypeID)
			if err != nil {
				log.Fatalf("Failed to resolve event type: %v", err)
			}
		}
	}

	// 2. Create or Get Event named "events test"
	var eventID int
	err = db.QueryRow("SELECT id FROM events WHERE LOWER(event_name) = 'events test'").Scan(&eventID)
	if err != nil {
		endTime := time.Now().Add(30 * 24 * time.Hour)
		err = db.QueryRow(`
			INSERT INTO events (event_name, status, venue_id, organizer_id, event_type_id, event_start, event_end, end_time, created_at, updated_at)
			VALUES ('events test', 'approved', $1, $2, $3, NOW(), $4, $4, NOW(), NOW())
			RETURNING id
		`, venueID, adminUser.ID, eventTypeID, endTime).Scan(&eventID)
		if err != nil {
			log.Fatalf("Failed to create event 'events test': %v", err)
		}
		fmt.Printf("Created new event 'events test' with ID: %d\n", eventID)
	} else {
		fmt.Printf("Found existing event 'events test' with ID: %d\n", eventID)
	}

	// Update event end_time and event_end to future date if null
	_, _ = db.Exec("UPDATE events SET event_end = NOW() + INTERVAL '30 days', end_time = NOW() + INTERVAL '30 days', status = 'approved', organizer_id = $2 WHERE id = $1", eventID, adminUser.ID)

	// 3. Create or Get Ticket Tier for 'events test'
	var tierID int
	err = db.QueryRow("SELECT id FROM ticket_tiers WHERE event_id = $1 LIMIT 1", eventID).Scan(&tierID)
	if err != nil {
		err = db.QueryRow(`
			INSERT INTO ticket_tiers (event_id, name, price, allocation_limit, sales_start, sales_end, created_at, updated_at)
			VALUES ($1, 'VIP Test Tier', 150000.00, 100, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW())
			RETURNING id
		`, eventID).Scan(&tierID)
		if err != nil {
			log.Fatalf("Failed to create ticket tier: %v", err)
		}
		fmt.Printf("Created ticket tier ID: %d\n", tierID)
	} else {
		fmt.Printf("Found ticket tier ID: %d\n", tierID)
	}

	// 4. Create Paid Orders and Tickets for Admin User (and all other users)
	for _, u := range users {
		var orderID string
		err = db.QueryRow(`
			INSERT INTO orders (
				purchaser_id, event_id, order_type, ticket_face_value_total,
				platform_fee_rate, platform_fee, platform_fee_ppn, gateway_fee, gateway_fee_ppn,
				ppn_rate, entertainment_tax_rate, entertainment_tax_amount,
				gross_amount, net_amount, payment_provider, payment_type, status, expires_at, created_at, updated_at
			) VALUES (
				$1, $2, 'primary', 150000.00,
				0.00, 0.00, 0.00, 0.00, 0.00,
				0.00, 0.00, 0.00,
				150000.00, 150000.00, 'midtrans', 'bank_transfer', 'paid', NOW() + INTERVAL '24 hours', NOW(), NOW()
			) RETURNING id::text
		`, u.ID, eventID).Scan(&orderID)
		if err != nil {
			log.Printf("Failed to create order for user %d: %v", u.ID, err)
			continue
		}

		secretKey := generateBase32Secret()
		var ticketID string
		err = db.QueryRow(`
			INSERT INTO tickets (order_id, ticket_tier_id, attendee_full_name, attendee_email, ticket_status, unit_price, secret_key, created_at, updated_at)
			VALUES ($1, $2, $3, $4, 'ready', 150000.00, $5, NOW(), NOW())
			RETURNING id::text
		`, orderID, tierID, u.FullName, u.Email, secretKey).Scan(&ticketID)
		if err != nil {
			log.Printf("Failed to create ticket for user %d: %v", u.ID, err)
			continue
		}

		if u.ID == adminUser.ID {
			fmt.Println("\n=======================================================")
			fmt.Println("🎉 TEST DATA CREATED FOR ADMIN ACCOUNT!")
			fmt.Println("=======================================================")
			fmt.Printf("Event Name       : events test (Event ID: %d)\n", eventID)
			fmt.Printf("Admin Account    : %s (%s, User ID: %d)\n", u.FullName, u.Email, u.ID)
			fmt.Printf("Order ID         : %s\n", orderID)
			fmt.Printf("Ticket ID        : %s\n", ticketID)
			fmt.Printf("Base32 SecretKey : %s\n", secretKey)
			fmt.Printf("My Tickets Link  : http://localhost/orders\n")
			fmt.Printf("Order Detail Link: http://localhost/orders/%s\n", orderID)
			fmt.Printf("Gate Scanner Link: http://localhost/scanner/%d\n", eventID)
			fmt.Println("=======================================================\n")
		} else {
			fmt.Printf("Seeded ticket %s for user ID %d (%s)\n", ticketID, u.ID, u.Email)
		}
	}
}
