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
	"crowdflow-backend/internal/booking"
	"crowdflow-backend/internal/config"
	"crowdflow-backend/internal/delegation"
	"crowdflow-backend/internal/event"
	"crowdflow-backend/internal/eventstaff"
	"crowdflow-backend/internal/mail"
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
	"crowdflow-backend/internal/ticketman"
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
	// below, and the required-secret check here). It is derived from APP_ENV
	// (production | sandbox | local), with a legacy DEV_MODE=true fallback for
	// a host that hasn't migrated to APP_ENV yet; anything else — including an
	// unset or unrecognised APP_ENV — resolves to production. devMode is true
	// for "local" ONLY: the sandbox deployment is still a public host and needs
	// Secure cookies and a required JWT_SECRET exactly like production. See
	// internal/config/env.go for the full resolution order.
	devMode := config.IsLocal()
	log.Printf("config: APP_ENV=%s (devMode=%v, secureCookies=%v)", config.AppEnv(), devMode, !devMode)

	// Initialize Configuration for JWT & Google Client ID
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		if !devMode {
			log.Fatalf("JWT_SECRET environment variable is required in production (set DEV_MODE=true to use the insecure development fallback)")
		}
		jwtSecret = "crowdflow_dev_jwt_secret"
	}

	// Ticketman sessions are signed with their own secret, entirely separate
	// from JWT_SECRET above. This is deliberate isolation, not an oversight:
	// aud is not validated anywhere the platform's own Authenticate/
	// OptionalAuthenticate middleware runs, so a ticketman token signed with
	// the platform key would be accepted by ordinary user routes with the
	// staff id read as a user id. A distinct secret makes that impossible by
	// construction — a ticketman token simply does not verify against
	// JWT_SECRET, and vice versa.
	ticketmanJWTSecret := os.Getenv("TICKETMAN_JWT_SECRET")
	if ticketmanJWTSecret == "" {
		if !devMode {
			log.Fatalf("TICKETMAN_JWT_SECRET environment variable is required in production")
		}
		ticketmanJWTSecret = "crowdflow_dev_ticketman_jwt_secret"
	}

	// e-ticket emails (internal/payment's webhook dispatch) link to
	// {FRONTEND_URL}/booking/<order_uuid> and .../t/<ticket_uuid> — since the
	// PDF/QR-image fallback is gone (plan decision 24), that link is the ONLY
	// way a buyer reaches their ticket. A missing FRONTEND_URL must not
	// silently degrade to a localhost link nobody's phone can open; mirrors
	// the JWT_SECRET check above exactly, same devMode-only escape hatch.
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		if !devMode {
			log.Fatalf("FRONTEND_URL environment variable is required outside local dev (set DEV_MODE via APP_ENV=local to use the http://localhost:3000 development fallback) — e-ticket emails are the only ticket-delivery path left and link to this value")
		}
		frontendURL = "http://localhost:3000"
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

	// Initialize Mail Service (Resend Integration)
	resendAPIKey := os.Getenv("RESEND_API_KEY")
	resendFromEmail := os.Getenv("RESEND_FROM_EMAIL")
	mailService := mail.NewService(resendAPIKey, resendFromEmail)

	// Initialize Authentication dependencies
	authRepo := auth.NewPostgresRepository(db)
	sessionStore := auth.NewSessionStore(redisClient, refreshTTL)
	authService := auth.NewAuthService(authRepo, jwtSecret, oauthConfig, sessionStore, accessTTL, mailService)
	isSecure := !devMode
	authHandler := auth.NewHandler(authService, isSecure, accessTTL, refreshTTL)

	// Rate limit login attempts per IP to slow brute-force/credential-stuffing
	loginRateLimit := middleware.RateLimit(redisClient, "login", 10, 15*time.Minute)
	// Refresh is legitimate ~once per access-token lifetime per session; keep a
	// generous per-IP ceiling to blunt abuse without harming users behind NAT.
	refreshRateLimit := middleware.RateLimit(redisClient, "refresh", 60, 15*time.Minute)
	// Loose on purpose: Indonesian mobile carriers use CGNAT heavily and
	// campuses NAT behind one IP, so a tight per-IP ceiling on signup would
	// punish legitimate users sharing an address, not an attacker.
	registerRateLimit := middleware.RateLimit(redisClient, "register", 10, time.Hour)
	// forgot-password and send-otp each send an email per call; IP-keyed
	// ceilings here bound the cost of one caller hammering many addresses.
	forgotPasswordRateLimit := middleware.RateLimit(redisClient, "forgot-password", 3, 15*time.Minute)
	// reset-password takes a mailed token; this bounds token brute-forcing.
	resetPasswordRateLimit := middleware.RateLimit(redisClient, "reset-password", 10, 15*time.Minute)
	sendOTPRateLimit := middleware.RateLimit(redisClient, "send-otp", 5, 15*time.Minute)
	// Email-keyed companions: an IP-keyed limit alone can't see a distributed
	// mail-bomb aimed at one address arriving from many different IPs.
	forgotPasswordRateLimitByEmail := middleware.RateLimitBy(redisClient, "forgot-password-email", 5, time.Hour, middleware.EmailBodyKey)
	sendOTPRateLimitByEmail := middleware.RateLimitBy(redisClient, "send-otp-email", 5, time.Hour, middleware.EmailBodyKey)

	// Register Authentication routes
	authHandler.RegisterRoutes(
		apiV1,
		authMounter.Authenticate,
		loginRateLimit,
		refreshRateLimit,
		registerRateLimit,
		forgotPasswordRateLimit,
		resetPasswordRateLimit,
		sendOTPRateLimit,
		forgotPasswordRateLimitByEmail,
		sendOTPRateLimitByEmail,
	)

	// Initialize Ticket dependencies (My Tickets, order-access secret delivery,
	// rotation) ahead of Admin/Organizer below — both consume ticketService as
	// their SecretRotator for M4's panic-revoke paths (see organizer/service.go,
	// admin/service.go). ticketHandler itself is still constructed and its
	// routes registered further down, alongside the rate limiters they need.
	ticketRepo := ticket.NewPostgresRepository(db)
	ticketService := ticket.NewService(ticketRepo, mailService)

	// Initialize Admin console dependencies
	adminRepo := admin.NewPostgresRepository(db)
	// ticketService satisfies admin.SecretRotator structurally — see M4's
	// admin panic-revoke path in internal/admin/service.go.
	adminService := admin.NewAdminService(adminRepo, ticketService)
	adminHandler := admin.NewHandler(adminService)

	// Register Admin console routes (Super Admin only)
	adminHandler.RegisterRoutes(adminV1, authMounter.Authenticate, authMounter.RequirePlatformRole)

	// Initialize Booking dependencies (ticket tiers, seat map, seat/GA holds)
	bookingRepo := booking.NewPostgresRedisRepository(db, redisClient)
	bookingService := booking.NewBookingService(bookingRepo, mailService)
	bookingHandler := booking.NewHandler(bookingService)

	// Register Booking routes
	bookingHandler.RegisterRoutes(apiV1, authMounter.Authenticate, authMounter.RequireBuyer)

	// ticketRepo/ticketService are constructed earlier (see above, ahead of
	// Admin/Organizer) — only the handler and route registration live here.
	ticketHandler := ticket.NewHandler(ticketService)

	// /order-access/* is the only unauthenticated secret-bearing surface in
	// the codebase (link-as-credential, plan decision 4) — UUID entropy makes
	// brute force impractical, but every other sensitive route here has a
	// limiter, so this does too.
	orderAccessRateLimit := middleware.RateLimit(redisClient, "order-access", 60, 5*time.Minute)
	// Secret rotation (M3/M4) is a much rarer, more sensitive write than a
	// read — a purchaser panic-revokes once when they suspect a leak, not
	// every few seconds like a rotating QR poll. A tighter ceiling than the
	// GET routes' 60/5min.
	orderAccessRotateRateLimit := middleware.RateLimit(redisClient, "order-access-rotate", 10, 15*time.Minute)

	// Register Ticket routes
	ticketHandler.RegisterRoutes(apiV1, authMounter.Authenticate, orderAccessRateLimit, orderAccessRotateRateLimit)

	// Initialize Venue Layout dependencies (saved seat-map plans + geometry)
	venueLayoutRepo := venuelayout.NewPostgresRepository(db)
	venueLayoutService := venuelayout.NewLayoutService(venueLayoutRepo)
	venueLayoutHandler := venuelayout.NewHandler(venueLayoutService)

	// Register Venue Layout routes (organizer + super admin console)
	venueLayoutHandler.RegisterRoutes(apiV1, authMounter.Authenticate, authMounter.RequirePlatformRole)

	// Initialize Payment dependencies
	paymentRepo := payment.NewPostgresRepository(db)
	// bookingService is passed in as payment's HoldReader: the hold is the
	// authority on what an order contains and what it costs, so pricing is
	// re-derived from it server-side rather than trusted from the request body.
	// ticketService is passed in as payment's TicketIssuer: both the Midtrans
	// webhook and the buyer-triggered complete-payment endpoint mint tickets
	// through this one implementation — see payment.TicketIssuer.
	paymentService := payment.NewPaymentService(paymentRepo, mailService, bookingService, ticketService, frontendURL)
	paymentHandler := payment.NewHandler(paymentService)

	// On-sale retries are normal (a popular tier selling out mid-checkout
	// causes legitimate resubmits), so this stays generous per-IP.
	orderRateLimit := middleware.RateLimit(redisClient, "orders", 20, 5*time.Minute)

	// Register Payment routes
	paymentHandler.RegisterRoutes(apiV1, authMounter.Authenticate, authMounter.RequireBuyer, orderRateLimit)

	// Mount the versioned sub-routers onto the root mux. ServeMux matches the
	// more specific /api/v1/admin/ pattern ahead of /api/v1/, so admin console
	// routes never collide with the public/EO event routes.
	mux.Handle("/api/v1/admin/", http.StripPrefix("/api/v1/admin", adminV1))
	mux.Handle("/api/v1/", http.StripPrefix("/api/v1", apiV1))

	// Initialize Organizer onboarding dependencies
	organizerRepo := organizer.NewPostgresRepository(db)
	// ticketService satisfies organizer.SecretRotator structurally — see
	// M4's organizer panic-revoke path in internal/organizer/service.go.
	organizerService := organizer.NewOrganizerService(organizerRepo, s3Storage, ticketService)
	organizerHandler := organizer.NewHandler(organizerService)

	// Document uploads cost R2 storage/egress; both account-level and
	// event-level upload routes share this ceiling.
	organizerUploadRateLimit := middleware.RateLimit(redisClient, "organizer-upload", 30, time.Hour)

	// Register Organizer routes
	organizerHandler.RegisterRoutes(mux, authMounter.Authenticate, authMounter.RequirePlatformRole, authMounter.RequireEventOwnership, organizerUploadRateLimit)

	// Initialize Event Staff (ticketman) CRUD dependencies — organizer console
	// only; the ticketman's own login/session lives in a separate package.
	eventStaffRepo := eventstaff.NewPostgresRepository(db)
	eventStaffService := eventstaff.NewService(eventStaffRepo)
	eventStaffHandler := eventstaff.NewHandler(eventStaffService)

	// Register Event Staff routes
	eventStaffHandler.RegisterRoutes(mux, authMounter.Authenticate, authMounter.RequirePlatformRole, authMounter.RequireEventOwnership)

	// Initialize Ticketman (scanner staff) auth dependencies — its own JWT
	// secret and its own middleware, isolated from the platform auth stack.
	ticketmanAuthMounter := middleware.NewTicketmanAuthMiddleware(ticketmanJWTSecret, db)
	ticketmanRepo := ticketman.NewPostgresRepository(db)
	ticketmanAccessTTL := getDurationEnv("TICKETMAN_ACCESS_TOKEN_TTL", 12*time.Hour)
	ticketmanService := ticketman.NewAuthService(ticketmanRepo, ticketmanJWTSecret, ticketmanAccessTTL)
	ticketmanHandler := ticketman.NewHandler(ticketmanService, isSecure, ticketmanAccessTTL)

	// Same login-abuse ceiling as the platform login, per-IP.
	ticketmanLoginRateLimit := middleware.RateLimit(redisClient, "ticketman_login", 10, 15*time.Minute)

	// Register Ticketman auth routes
	ticketmanHandler.RegisterRoutes(mux, ticketmanAuthMounter.RequireTicketman, ticketmanLoginRateLimit)

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
	auditorService := auditor.NewAuditorService(auditorRepo, s3Storage)
	auditorHandler := auditor.NewHandler(auditorService)

	// Register Auditor routes (Auditor + Super Admin roles)
	auditorHandler.RegisterRoutes(mux, authMounter.Authenticate, authMounter.RequirePlatformRole)

	// Initialize and Register Scanner routes. Every scan-side route requires a
	// ticketman session (RequireTicketman); gate CRUD stays on the organizer
	// console guard chain. No unauthenticated path remains.
	scannerHandler := scanner.NewHandler(db)
	scanRateLimit := middleware.RateLimit(redisClient, "scan", 120, time.Minute)
	scannerHandler.RegisterRoutes(mux, ticketmanAuthMounter.RequireTicketman, scanRateLimit, authMounter.Authenticate, authMounter.RequirePlatformRole, authMounter.RequireEventOwnership)

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
