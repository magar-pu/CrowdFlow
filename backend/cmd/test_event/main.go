package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strconv"

	"crowdflow-backend/internal/organizer"
	"crowdflow-backend/internal/storage"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	dsn := "postgres://postgres:postgres@localhost:5432/crowdflow?sslmode=disable"
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("sql.Open failed: %v", err)
	}
	defer db.Close()

	repo := organizer.NewPostgresRepository(db)
	s3Store, _ := storage.NewS3Storage()
	service := organizer.NewOrganizerService(repo, s3Store)

	ctx := context.Background()

	// Create test event payload
	eventPayload := &organizer.OrganizerEvent{
		Name:            "Prambanan Rock Festival 2026",
		Category:        "Festival",
		Description:     "Rock music in Prambanan.",
		StartDate:       "2026-10-10",
		StartTime:       "18:00:00",
		EndDate:         "2026-10-10",
		EndTime:         "23:00:00",
		LocationType:    "physical",
		Location:        "Sleman, Yogyakarta",
		LocationAddress: "Jl. Raya Solo - Yogyakarta",
		VenueName:       "Candi Prambanan",
		Capacity:        5000,
		Status:          "Scheduled",
		Image:           "http://localhost:9000/crowdflow-public/placeholders/cover.jpg",
	}

	fmt.Println("Attempting to create event...")
	err = service.CreateOrganizerEvent(ctx, 15, eventPayload)
	if err != nil {
		log.Fatalf("CreateOrganizerEvent failed: %v", err)
	}
	fmt.Printf("Event created successfully! Generated ID: %s\n", eventPayload.ID)

	eventID, err := strconv.Atoi(eventPayload.ID)
	if err != nil {
		log.Fatalf("Invalid generated event ID: %v", err)
	}

	fmt.Printf("Attempting to publish event with ID %d...\n", eventID)
	err = service.PublishOrganizerEvent(ctx, eventID, 15)
	if err != nil {
		log.Fatalf("PublishOrganizerEvent failed: %v", err)
	}
	fmt.Println("Event published successfully!")

	// Query from database to verify status
	var status string
	err = db.QueryRow("SELECT status FROM events WHERE id = $1", eventID).Scan(&status)
	if err != nil {
		log.Fatalf("Query event status failed: %v", err)
	}
	fmt.Printf("Database verification: Event %d status is %s\n", eventID, status)

	// Clean up created event so we don't clutter the DB
	_, err = db.Exec("DELETE FROM event_status_log WHERE event_id = $1", eventID)
	_, err = db.Exec("DELETE FROM user_roles WHERE event_id = $1", eventID)
	_, err = db.Exec("DELETE FROM events WHERE id = $1", eventID)
	if err != nil {
		fmt.Printf("Clean up warning: %v\n", err)
	} else {
		fmt.Println("Test event cleaned up successfully.")
	}
}
