package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"crowdflow-backend/internal/event"
	"crowdflow-backend/internal/platform/database"
	"crowdflow-backend/internal/response"
)

func healthCheck(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request){
		if err := db.Ping(); err != nil {
			response.Error(w, http.StatusInternalServerError, "DATABASE_UNREACHABLE", err.Error())
			return
		}
		
		response.JSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"message": "CrowdFlow API is running",
		})
	}
}

func main() {
	// Initialize standard library serve mux router
	
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		log.Fatalf("DB_DSN environment variable is required")
	}
	
	db, err := database.Connect(database.Config{
		DSN:				dsn,
		MaxOpenConns: 		25,
		MaxIdleConns:		25,
		ConnMaxLifetime:	5 * time.Minute,
		ConnMaxIdleTime:	5 * time.Minute,
	})

	if err != nil {
		log.Fatalf("Failed to connect to database: %s", err)
	}
	defer db.Close()

	mux := http.NewServeMux()

	// Register global system health route
	mux.HandleFunc("GET /api/health", healthCheck(db))

	// Initialize domain packages dependencies
	eventRepo := event.NewInMemoryRepository()
	eventService := event.NewEventService(eventRepo)
	eventHandler := event.NewHandler(eventService)

	// Register feature routes
	eventHandler.RegisterRoutes(mux)

	fmt.Println("Starting server on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatalf("Error starting server: %s", err)
	}
}
