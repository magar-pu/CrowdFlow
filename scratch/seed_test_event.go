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

	fmt.Println("Connected to PostgreSQL successfully.")

	// 1. Find Admin / Super Admin user
	rows, err := db.Query(`
		SELECT u.id, u.email, COALESCE(pr.name, 'User') as role, COALESCE(up.full_name, 'Admin User') as full_name
		FROM users u
		LEFT JOIN user_profiles up ON u.id = up.user_id
		LEFT JOIN user_platform_roles upr ON u.id = upr.user_id
		LEFT JOIN platform_roles pr ON upr.platform_role_id = pr.id
		ORDER BY u.id ASC
	`)
	if err != nil {
		log.Fatalf("Failed to query users: %v", err)
	}
	defer rows.Close()

	type UserInfo struct {
		ID       int
		Email    string
		Role     string
		FullName string
	}

	var users []UserInfo
	fmt.Println("\nExisting Users in System:")
	for rows.Next() {
		var u UserInfo
		rows.Scan(&u.ID, &u.Email, &u.Role, &u.FullName)
		users = append(users, u)
		fmt.Printf(" - ID: %d | Email: %s | Role: %s | Name: %s\n", u.ID, u.Email, u.Role, u.FullName)
	}

	if len(users) == 0 {
		log.Fatalf("No users found in database.")
	}

	// Pick admin user or first user
	var targetUser UserInfo
	foundAdmin := false
	for _, u := range users {
		if u.Role == "Super Admin" || u.Role == "Admin" || u.Role == "Event Organizer" {
			targetUser = u
			foundAdmin = true
			break
		}
	}
	if !foundAdmin {
		targetUser = users[0]
	}

	fmt.Printf("\nSelected Target Admin User for Ticket: ID %d (%s, %s)\n", targetUser.ID, targetUser.Email, targetUser.Role)

	// 2. Create or Get Event named "events test"
	var eventID int
	err = db.QueryRow("SELECT id FROM events WHERE LOWER(event_name) = 'events test'").Scan(&eventID)
	if err != nil {
		// Create event
		endTime := time.Now().Add(30 * 24 * time.Hour)
		err = db.QueryRow(`
			INSERT INTO events (event_name, category, description, location, venue_name, capacity, organizer_id, status, start_date, end_time, created_at, updated_at)
			VALUES ('events test', 'Concert', 'Event khusus pengetesan Dynamic QR Ticket (Offline PWA + 15s TOTP)', 'Main Arena', 'Jakarta Convention Center', 1000, $1, 'published', NOW(), $2, NOW(), NOW())
			RETURNING id
		`, targetUser.ID, endTime).Scan(&eventID)
		if err != nil {
			// Try fallback without organizer_id or columns
			err = db.QueryRow(`
				INSERT INTO events (event_name, status, created_at, updated_at)
				VALUES ('events test', 'published', NOW(), NOW())
				RETURNING id
			`).Scan(&eventID)
			if err != nil {
				log.Fatalf("Failed to create event 'events test': %v", err)
			}
		}
		fmt.Printf("Created new event 'events test' with ID: %d\n", eventID)
	} else {
		fmt.Printf("Found existing event 'events test' with ID: %d\n", eventID)
	}

	// Update event end_time to future date if null
	_, _ = db.Exec("UPDATE events SET end_time = NOW() + INTERVAL '30 days' WHERE id = $1 AND (end_time IS NULL OR end_time < NOW())", eventID)

	// 3. Create or Get Ticket Tier
	var tierID int
	err = db.QueryRow("SELECT id FROM ticket_tiers WHERE event_id = $1 LIMIT 1", eventID).Scan(&tierID)
	if err != nil {
		err = db.QueryRow(`
			INSERT INTO ticket_tiers (event_id, name, price, allocation_limit, sold_count, created_at, updated_at)
			VALUES ($1, 'VIP Test Tier', 150000.00, 100, 1, NOW(), NOW())
			RETURNING id
		`, eventID).Scan(&tierID)
		if err != nil {
			log.Fatalf("Failed to create ticket tier: %v", err)
		}
		fmt.Printf("Created ticket tier ID: %d\n", tierID)
	} else {
		fmt.Printf("Found ticket tier ID: %d\n", tierID)
	}

	// 4. Create Paid Order
	var orderID string
	err = db.QueryRow(`
		INSERT INTO orders (user_id, total_amount, net_amount, order_status, created_at, updated_at)
		VALUES ($1, 150000.00, 150000.00, 'paid', NOW(), NOW())
		RETURNING id::text
	`, targetUser.ID).Scan(&orderID)
	if err != nil {
		log.Fatalf("Failed to create order: %v", err)
	}
	fmt.Printf("Created paid order ID: %s for user ID: %d\n", orderID, targetUser.ID)

	// 5. Create Ticket with Secret Key for TOTP v2
	secretKey := generateBase32Secret()
	var ticketID string
	err = db.QueryRow(`
		INSERT INTO tickets (order_id, ticket_tier_id, attendee_full_name, attendee_email, ticket_status, unit_price, secret_key, created_at, updated_at)
		VALUES ($1, $2, $3, $4, 'ready', 150000.00, $5, NOW(), NOW())
		RETURNING id::text
	`, orderID, tierID, targetUser.FullName, targetUser.Email, secretKey).Scan(&ticketID)
	if err != nil {
		log.Fatalf("Failed to create ticket: %v", err)
	}

	fmt.Println("\n=======================================================")
	fmt.Println("🎉 TEST DATA GENERATED SUCCESSFULLY!")
	fmt.Println("=======================================================")
	fmt.Printf("Event Name       : events test (Event ID: %d)\n", eventID)
	fmt.Printf("Admin User       : %s (%s, User ID: %d)\n", targetUser.FullName, targetUser.Email, targetUser.ID)
	fmt.Printf("Order ID         : %s\n", orderID)
	fmt.Printf("Ticket ID        : %s\n", ticketID)
	fmt.Printf("Base32 SecretKey : %s\n", secretKey)
	fmt.Printf("Ticket Page URL  : http://localhost/orders/%s\n", orderID)
	fmt.Printf("Scanner Link     : http://localhost/scanner/%d\n", eventID)
	fmt.Println("=======================================================\n")
}
