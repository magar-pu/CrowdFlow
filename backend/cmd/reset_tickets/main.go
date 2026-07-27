package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	dsn := "postgres://postgres:postgres@localhost:5432/crowdflow?sslmode=disable"
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// 1. Reset ALL tickets and delete all scan logs for Event 18
	_, err = db.Exec("UPDATE tickets SET ticket_status = 'ready'")
	if err != nil {
		log.Printf("Reset error: %v", err)
	}
	_, _ = db.Exec("DELETE FROM ticket_checkins")

	fmt.Println("✅ ALL Tickets in database reset to 'ready' and scan history cleared!")

	// 2. Find order_id for admin (super-admin@crowdflow.my.id)
	var orderID string
	var tierID int
	err = db.QueryRow(`
		SELECT t.order_id::text, t.ticket_tier_id 
		FROM tickets t 
		WHERE t.id = 'a04bb786-f3b2-45a3-af5e-49ea4cef4570'
	`).Scan(&orderID, &tierID)

	if err != nil {
		log.Fatalf("Failed to find admin order: %v", err)
	}

	// 3. Create Ticket 2: Budi Santoso
	var t2ID string
	err = db.QueryRow(`
		INSERT INTO tickets (order_id, ticket_tier_id, attendee_full_name, attendee_email, ticket_status, unit_price, secret_key, created_at, updated_at)
		VALUES ($1, $2, 'Budi Santoso (VIP Guest)', 'super-admin@crowdflow.my.id', 'ready', 150000.00, 'A4BB76F3B245A3AF5E49EA4CEF4570JJ', NOW(), NOW())
		RETURNING id::text
	`, orderID, tierID).Scan(&t2ID)

	if err == nil {
		fmt.Printf("✅ Created Fresh Test Ticket 2: %s (Attendee: Budi Santoso)\n Link: http://localhost/events-test/%s\n", t2ID, t2ID)
	}

	// 4. Create Ticket 3: Siti Rahma
	var t3ID string
	err = db.QueryRow(`
		INSERT INTO tickets (order_id, ticket_tier_id, attendee_full_name, attendee_email, ticket_status, unit_price, secret_key, created_at, updated_at)
		VALUES ($1, $2, 'Siti Rahma (VVIP Guest)', 'super-admin@crowdflow.my.id', 'ready', 150000.00, 'A4BB76F3B245A3AF5E49EA4CEF4570JJ', NOW(), NOW())
		RETURNING id::text
	`, orderID, tierID).Scan(&t3ID)

	if err == nil {
		fmt.Printf("✅ Created Fresh Test Ticket 3: %s (Attendee: Siti Rahma)\n Link: http://localhost/events-test/%s\n", t3ID, t3ID)
	}
}
