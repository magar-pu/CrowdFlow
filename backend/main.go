package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"crowdflow-backend/internal/auth"
	"crowdflow-backend/internal/event"
	"crowdflow-backend/internal/middleware"
	"crowdflow-backend/internal/platform/database"
	"crowdflow-backend/internal/response"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func healthCheck(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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
		DSN:             dsn,
		MaxOpenConns:    25,
		MaxIdleConns:    25,
		ConnMaxLifetime: 5 * time.Minute,
		ConnMaxIdleTime: 5 * time.Minute,
	})

	if err != nil {
		log.Fatalf("Failed to connect to database: %s", err)
	}
	defer db.Close()

	mux := http.NewServeMux()

	// Register global system health route
	mux.HandleFunc("GET /api/health", healthCheck(db))
	// Initialize Configuration for JWT & Google Client ID
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "crowdflow_dev_jwt_secret"
	}
	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	if googleClientID == "" {
		googleClientID = "91716845059-1l96nahbcu7nb39k1sa9r4ev8p2nitdu.apps.googleusercontent.com"
	}
	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	googleRedirectURI := os.Getenv("GOOGLE_REDIRECT_URI")
	if googleRedirectURI == "" {
		googleRedirectURI = "http://localhost/api/auth/google/callback"
	}

	oauthConfig := &oauth2.Config{
		ClientID:     googleClientID,
		ClientSecret: googleClientSecret,
		RedirectURL:  googleRedirectURI,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}

	// Initialize Auth Middleware
	authMounter := middleware.NewAuthMiddleware(jwtSecret, db)

	// Initialize domain packages dependencies
	eventRepo := event.NewInMemoryRepository()
	eventService := event.NewEventService(eventRepo)
	eventHandler := event.NewHandler(eventService)

	// Register feature routes
	eventHandler.RegisterRoutes(mux, authMounter.Authenticate, authMounter.RequirePlatformRole, authMounter.RequireEventRole)

	// Initialize Authentication dependencies
	authRepo := auth.NewPostgresRepository(db)
	authService := auth.NewAuthService(authRepo, jwtSecret, oauthConfig)
	isSecure := os.Getenv("DEV_MODE") != "true"
	authHandler := auth.NewHandler(authService, isSecure)

	// Register Authentication routes
	authHandler.RegisterRoutes(mux)

	fmt.Println("Starting server on :8080 with CSRF protection enabled")
	if err := http.ListenAndServe(":8080", middleware.CSRF(mux)); err != nil {
		log.Fatalf("Error starting server: %s", err)
	}
}
