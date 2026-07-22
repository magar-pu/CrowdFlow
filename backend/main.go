package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"crowdflow-backend/internal/admin"
	"crowdflow-backend/internal/auditor"
	"crowdflow-backend/internal/auth"
	"crowdflow-backend/internal/bankaccount"
	"crowdflow-backend/internal/booking"
	"crowdflow-backend/internal/delegation"
	"crowdflow-backend/internal/event"
	"crowdflow-backend/internal/middleware"
	"crowdflow-backend/internal/organizer"
	"crowdflow-backend/internal/payment"
	"crowdflow-backend/internal/platform/database"
	"crowdflow-backend/internal/platform/redisclient"
	"crowdflow-backend/internal/resale"
	"crowdflow-backend/internal/response"
	"crowdflow-backend/internal/scanner"
	"crowdflow-backend/internal/storage"
	"crowdflow-backend/internal/ticket"
	"crowdflow-backend/internal/venuelayout"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// getDurationEnv reads a Go duration string (e.g. "15m", "720h") from the
// environment, falling back to def when unset or unparseable.
func getDurationEnv(key string, def time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
		log.Printf("[WARN] invalid %s=%q; using default %s", key, v, def)
	}
	return def
}

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

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	redisClient, err := redisclient.Connect(redisclient.Config{Addr: redisAddr})
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %s", err)
	}
	defer redisClient.Close()

	mux := http.NewServeMux()

	// Versioned API sub-routers. Feature handlers register bare paths
	// (e.g. "GET /events"); the /api/v1 (and /api/v1/admin) prefix is applied
	// once at mount time below, so every endpoint lives under a single version
	// segment and a future v2 becomes a one-line change.
	apiV1 := http.NewServeMux()   // public + EO + auth + booking -> /api/v1/*
	adminV1 := http.NewServeMux() // Super Admin console          -> /api/v1/admin/*

	// Register global system health route (intentionally unversioned)
	mux.HandleFunc("GET /api/health", healthCheck(db))

	// Development mode relaxes production-only guardrails (the Secure-cookie flag
	// below, and the required-secret check here). Anything other than
	// DEV_MODE=true is treated as production.
	devMode := os.Getenv("DEV_MODE") == "true"

	// Initialize Configuration for JWT & Google Client ID
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		if !devMode {
			log.Fatalf("JWT_SECRET environment variable is required in production (set DEV_MODE=true to use the insecure development fallback)")
		}
		jwtSecret = "crowdflow_dev_jwt_secret"
	}
	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	if googleClientID == "" {
		googleClientID = "91716845059-1l96nahbcu7nb39k1sa9r4ev8p2nitdu.apps.googleusercontent.com"
	}
	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	googleRedirectURI := os.Getenv("GOOGLE_REDIRECT_URI")
	if googleRedirectURI == "" {
		googleRedirectURI = "http://localhost/api/v1/auth/google/callback"
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

	// Initialize Storage Client
	s3Storage, err := storage.NewS3Storage()
	if err != nil {
		log.Fatalf("Failed to initialize S3 storage: %s", err)
	}
	// Initialize domain packages dependencies
	eventRepo := event.NewPostgresRepository(db)
	eventService := event.NewEventService(eventRepo)
	eventHandler := event.NewHandler(eventService, s3Storage)

	// Register feature routes
	eventHandler.RegisterRoutes(apiV1, authMounter.Authenticate, authMounter.OptionalAuthenticate, authMounter.RequirePlatformRole, authMounter.RequireEventRole)

	// Token lifetimes: short-lived access JWT refreshed via a long-lived,
	// rotating, revocable refresh token (see internal/auth/session.go).
	accessTTL := getDurationEnv("ACCESS_TOKEN_TTL", 15*time.Minute)
	refreshTTL := getDurationEnv("REFRESH_TOKEN_TTL", 30*24*time.Hour)

	// Initialize Authentication dependencies
	authRepo := auth.NewPostgresRepository(db)
	sessionStore := auth.NewSessionStore(redisClient, refreshTTL)
	authService := auth.NewAuthService(authRepo, jwtSecret, oauthConfig, sessionStore, accessTTL)
	isSecure := !devMode
	authHandler := auth.NewHandler(authService, isSecure, accessTTL, refreshTTL)

	// Rate limit login attempts per IP to slow brute-force/credential-stuffing
	loginRateLimit := middleware.RateLimit(redisClient, "login", 10, 15*time.Minute)
	// Refresh is legitimate ~once per access-token lifetime per session; keep a
	// generous per-IP ceiling to blunt abuse without harming users behind NAT.
	refreshRateLimit := middleware.RateLimit(redisClient, "refresh", 60, 15*time.Minute)

	// Register Authentication routes
	authHandler.RegisterRoutes(apiV1, authMounter.Authenticate, loginRateLimit, refreshRateLimit)

	// Initialize Admin console dependencies
	adminRepo := admin.NewPostgresRepository(db)
	adminService := admin.NewAdminService(adminRepo)
	adminHandler := admin.NewHandler(adminService)

	// Register Admin console routes (Super Admin only)
	adminHandler.RegisterRoutes(adminV1, authMounter.Authenticate, authMounter.RequirePlatformRole)

	// Initialize Booking dependencies (ticket tiers, seat map, seat/GA holds)
	bookingRepo := booking.NewPostgresRedisRepository(db, redisClient)
	bookingService := booking.NewBookingService(bookingRepo)
	bookingHandler := booking.NewHandler(bookingService)

	// Register Booking routes
	bookingHandler.RegisterRoutes(apiV1, authMounter.Authenticate)

	// Initialize Ticket dependencies (My Tickets + Dynamic 10-Min QR Tokens)
	ticketRepo := ticket.NewPostgresRepository(db)
	ticketService := ticket.NewService(ticketRepo)
	ticketHandler := ticket.NewHandler(ticketService)

	// Register Ticket routes
	ticketHandler.RegisterRoutes(apiV1, authMounter.Authenticate)

	// Initialize Venue Layout dependencies (saved seat-map plans + geometry)
	venueLayoutRepo := venuelayout.NewPostgresRepository(db)
	venueLayoutService := venuelayout.NewLayoutService(venueLayoutRepo)
	venueLayoutHandler := venuelayout.NewHandler(venueLayoutService)

	// Register Venue Layout routes (organizer + super admin console)
	venueLayoutHandler.RegisterRoutes(apiV1, authMounter.Authenticate, authMounter.RequirePlatformRole)

	// Initialize Payment dependencies
	paymentRepo := payment.NewPostgresRepository(db)
	paymentService := payment.NewPaymentService(paymentRepo)
	paymentHandler := payment.NewHandler(paymentService)

	// Register Payment routes
	paymentHandler.RegisterRoutes(apiV1, authMounter.Authenticate)

	// Mount the versioned sub-routers onto the root mux. ServeMux matches the
	// more specific /api/v1/admin/ pattern ahead of /api/v1/, so admin console
	// routes never collide with the public/EO event routes.
	mux.Handle("/api/v1/admin/", http.StripPrefix("/api/v1/admin", adminV1))
	mux.Handle("/api/v1/", http.StripPrefix("/api/v1", apiV1))

	// Initialize Organizer onboarding dependencies
	organizerRepo := organizer.NewPostgresRepository(db)
	organizerService := organizer.NewOrganizerService(organizerRepo, s3Storage)
	organizerHandler := organizer.NewHandler(organizerService)

	// Register Organizer routes
	organizerHandler.RegisterRoutes(mux, authMounter.Authenticate, authMounter.RequirePlatformRole, authMounter.RequireEventOwnership)

	// Initialize Co-Organizer Delegation dependencies (owner-driven delegation + approval)
	delegationRepo := delegation.NewPostgresRepository(db)
	delegationService := delegation.NewDelegationService(delegationRepo)
	delegationHandler := delegation.NewHandler(delegationService)

	// Register Delegation routes (verified Event Organizer, on the organizer console)
	delegationHandler.RegisterRoutes(mux, authMounter.Authenticate, authMounter.RequirePlatformRole)

	// Register Delegation admin-oversight routes on the admin sub-router (Super Admin only)
	delegationHandler.RegisterAdminRoutes(adminV1, func(f http.HandlerFunc) http.Handler {
		return authMounter.Authenticate(authMounter.RequirePlatformRole("Super Admin")(f))
	})

	// Initialize Auditor portal dependencies
	auditorRepo := auditor.NewPostgresRepository(db)
	auditorService := auditor.NewAuditorService(auditorRepo)
	auditorHandler := auditor.NewHandler(auditorService)

	// Register Auditor routes (Auditor + Super Admin roles)
	auditorHandler.RegisterRoutes(mux, authMounter.Authenticate, authMounter.RequirePlatformRole)

	// Initialize Bank Account dependencies
	bankAccountRepo := bankaccount.NewBankAccountRepository(db)
	bankAccountService := bankaccount.NewBankAccountService(bankAccountRepo)
	bankAccountHandler := bankaccount.NewBankAccountHandler(bankAccountService)

	// Register Bank Account routes (nested under /api/users/me/)
	bankAccountHandler.RegisterRoutes(mux, authMounter.Authenticate)

	// Initialize and Register Scanner routes
	scannerHandler := scanner.NewHandler(db)
	scannerHandler.RegisterRoutes(mux)

	// Initialize Resale Marketplace dependencies
	resaleRepo := resale.NewPostgresRepository(db)
	resaleService := resale.NewResaleService(resaleRepo)
	resaleHandler := resale.NewHandler(resaleService)

	// Register Resale Marketplace routes
	resaleHandler.RegisterRoutes(mux, authMounter.Authenticate)

	fmt.Println("Starting server on :8080 with CSRF protection enabled")
	if err := http.ListenAndServe(":8080", middleware.CSRF(mux)); err != nil {
		log.Fatalf("Error starting server: %s", err)
	}
}
