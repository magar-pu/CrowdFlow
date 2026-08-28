package auth

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"crowdflow-backend/internal/middleware"
	"crowdflow-backend/internal/response"
	"crowdflow-backend/pkg/turnstile"
)

// rolePriority defines the privilege hierarchy for platform-level roles.
// Higher value = higher privilege. Used to resolve users who hold multiple roles.
var rolePriority = map[string]int{
	"User":            1,
	"Event Organizer": 2,
	"Auditor":         3,
	"Super Admin":     4,
}

type Handler struct {
	service    *AuthService
	secure     bool          // Enforces Secure cookie flag (true in production, false in development)
	accessTTL  time.Duration // access_token cookie lifetime
	refreshTTL time.Duration // refresh_token + csrf_token cookie lifetime
}

func NewHandler(service *AuthService, secure bool, accessTTL, refreshTTL time.Duration) *Handler {
	return &Handler{service: service, secure: secure, accessTTL: accessTTL, refreshTTL: refreshTTL}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux, authenticate func(http.Handler) http.Handler, rateLimitLogin func(http.Handler) http.Handler, rateLimitRefresh func(http.Handler) http.Handler) {
	mux.HandleFunc("POST /auth/register", h.handleRegister)
	mux.Handle("POST /auth/login", rateLimitLogin(http.HandlerFunc(h.handleLogin)))
	mux.Handle("POST /auth/refresh", rateLimitRefresh(http.HandlerFunc(h.handleRefresh)))
	mux.HandleFunc("GET /auth/google/login", h.handleGoogleRedirect)
	mux.HandleFunc("GET /auth/google/callback", h.handleGoogleCallback)
	mux.HandleFunc("POST /auth/logout", h.handleLogout)
	mux.Handle("POST /auth/logout-all", authenticate(http.HandlerFunc(h.handleLogoutAll)))
	mux.Handle("GET /auth/me", authenticate(http.HandlerFunc(h.handleMe)))
	mux.Handle("PUT /auth/me", authenticate(http.HandlerFunc(h.handleUpdateProfile)))
	mux.HandleFunc("POST /auth/forgot-password", h.handleForgotPassword)
	mux.HandleFunc("POST /auth/reset-password", h.handleResetPassword)
	mux.HandleFunc("POST /auth/send-otp", h.handleSendOTP)
}

func generateCSRFToken() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func (h *Handler) setAuthCookies(w http.ResponseWriter, accessToken, refreshToken string) {
	// 1. Short-lived access JWT, sent on every request (Path "/").
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		MaxAge:   int(h.accessTTL.Seconds()),
		HttpOnly: true,
		Secure:   h.secure,
		SameSite: http.SameSiteLaxMode,
	})

	// 2. Long-lived refresh token, scoped to the auth subtree so it is only
	//    sent to /refresh (to rotate) and /logout (to revoke) — never on
	//    ordinary API calls, limiting its exposure.
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/api/v1/auth",
		MaxAge:   int(h.refreshTTL.Seconds()),
		HttpOnly: true,
		Secure:   h.secure,
		SameSite: http.SameSiteLaxMode,
	})

	// 3. Client-readable CSRF token (double-submit). Its lifetime matches the
	//    refresh token so a POST /auth/refresh still has a CSRF cookie to
	//    submit long after the access token has expired.
	csrfToken := generateCSRFToken()
	http.SetCookie(w, &http.Cookie{
		Name:     "csrf_token",
		Value:    csrfToken,
		Path:     "/",
		MaxAge:   int(h.refreshTTL.Seconds()),
		HttpOnly: false, // Must be readable by Next.js client
		Secure:   h.secure,
		SameSite: http.SameSiteLaxMode,
	})
}

// clearAuthCookies expires all three auth cookies. Paths must match those set
// clearAuthCookies expires all three auth cookies. Paths must match those set
// in setAuthCookies, or the browser keeps the stale cookie.
func (h *Handler) clearAuthCookies(w http.ResponseWriter) {
	expiredTime := time.Unix(0, 0)
	// Clear with h.secure setting
	http.SetCookie(w, &http.Cookie{Name: "access_token", Value: "", Path: "/", MaxAge: -1, Expires: expiredTime, HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode})
	http.SetCookie(w, &http.Cookie{Name: "refresh_token", Value: "", Path: "/api/v1/auth", MaxAge: -1, Expires: expiredTime, HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode})
	http.SetCookie(w, &http.Cookie{Name: "refresh_token", Value: "", Path: "/", MaxAge: -1, Expires: expiredTime, HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode})
	http.SetCookie(w, &http.Cookie{Name: "csrf_token", Value: "", Path: "/", MaxAge: -1, Expires: expiredTime, HttpOnly: false, Secure: h.secure, SameSite: http.SameSiteLaxMode})

	// Also clear with Secure: false so HTTP local/docker environments clear the cookie cleanly
	if h.secure {
		http.SetCookie(w, &http.Cookie{Name: "access_token", Value: "", Path: "/", MaxAge: -1, Expires: expiredTime, HttpOnly: true, Secure: false, SameSite: http.SameSiteLaxMode})
		http.SetCookie(w, &http.Cookie{Name: "refresh_token", Value: "", Path: "/api/v1/auth", MaxAge: -1, Expires: expiredTime, HttpOnly: true, Secure: false, SameSite: http.SameSiteLaxMode})
		http.SetCookie(w, &http.Cookie{Name: "refresh_token", Value: "", Path: "/", MaxAge: -1, Expires: expiredTime, HttpOnly: true, Secure: false, SameSite: http.SameSiteLaxMode})
		http.SetCookie(w, &http.Cookie{Name: "csrf_token", Value: "", Path: "/", MaxAge: -1, Expires: expiredTime, HttpOnly: false, Secure: false, SameSite: http.SameSiteLaxMode})
	}
}

func resolveFrontendURL(r *http.Request) string {
	if envURL := os.Getenv("FRONTEND_URL"); envURL != "" {
		return envURL
	}
	if origin := r.Header.Get("Origin"); origin != "" {
		return origin
	}
	scheme := "http"
	if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	host := r.Header.Get("X-Forwarded-Host")
	if host == "" {
		host = r.Host
	}
	if host != "" && host != "localhost" && host != "127.0.0.1" && host != "backend:8080" {
		return scheme + "://" + host
	}
	return "http://localhost:3000"
}

// resolveRoleName returns the user's highest-privilege platform role (roles
// scoped to a specific event are ignored), defaulting to "User".
func (h *Handler) resolveRoleName(userID int) string {
	roleName := "User"
	if mappings, err := h.service.repo.GetUserRolesAndPermissions(userID); err == nil {
		for _, m := range mappings {
			if m.EventID == nil && rolePriority[m.RoleName] > rolePriority[roleName] {
				roleName = m.RoleName
			}
		}
	}
	return roleName
}

func (h *Handler) handleRegister(w http.ResponseWriter, r *http.Request) {
	// Limit body to 1MB to prevent unauthenticated memory exhaustion DoS
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body or payload too large")
		return
	}

	if req.Email == "" || req.Password == "" || req.FullName == "" {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", "Email, password, and full name are required")
		return
	}

	if valid, err := turnstile.VerifyToken(req.TurnstileToken, r.RemoteAddr); !valid {
		response.Error(w, http.StatusBadRequest, "INVALID_TURNSTILE", "CAPTCHA verification failed: "+err.Error())
		return
	}

	if err := h.service.Register(req); err != nil {
		if err.Error() == "email is already registered" {
			response.Error(w, http.StatusConflict, "EMAIL_ALREADY_REGISTERED", "This email address is already registered.")
			return
		}
		response.Error(w, http.StatusConflict, "REGISTRATION_FAILED", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, map[string]string{
		"message": "User registered successfully",
	})
}

func (h *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	// Limit body to 1MB to prevent unauthenticated memory exhaustion DoS
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body or payload too large")
		return
	}

	if valid, err := turnstile.VerifyToken(req.TurnstileToken, r.RemoteAddr); !valid {
		response.Error(w, http.StatusBadRequest, "INVALID_TURNSTILE", "CAPTCHA verification failed: "+err.Error())
		return
	}

	accessToken, refreshToken, user, err := h.service.Login(r.Context(), req)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "AUTHENTICATION_FAILED", err.Error())
		return
	}

	// Set secure auth cookies instead of returning token in JSON body
	h.setAuthCookies(w, accessToken, refreshToken)

	roleName := "User"
	if userID, err := strconv.Atoi(user.ID); err == nil {
		roleName = h.resolveRoleName(userID)
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"user_id":   user.ID,
		"email":     user.Email,
		"full_name": user.FullName,
		"role":      roleName,
	})
}

func (h *Handler) getRedirectURI(r *http.Request) string {
	if envURI := os.Getenv("GOOGLE_REDIRECT_URI"); envURI != "" {
		return envURI
	}
	return "http://localhost/api/v1/auth/google/callback"
}

func (h *Handler) handleGoogleRedirect(w http.ResponseWriter, r *http.Request) {
	state := generateCSRFToken()

	// Set state cookie for callback CSRF verification
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		MaxAge:   300, // 5 minutes
		HttpOnly: true,
		Secure:   h.secure,
		SameSite: http.SameSiteLaxMode,
	})

	redirectURI := h.getRedirectURI(r)
	authURL := h.service.GetGoogleAuthURLWithRedirect(state, redirectURI)
	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

func (h *Handler) handleGoogleCallback(w http.ResponseWriter, r *http.Request) {
	// 1. Verify state cookie
	stateCookie, err := r.Cookie("oauth_state")
	if err != nil || stateCookie.Value == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "OAuth state cookie is missing or empty")
		return
	}

	// Clear state cookie immediately
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.secure,
		SameSite: http.SameSiteLaxMode,
	})

	state := r.URL.Query().Get("state")
	if state != stateCookie.Value {
		response.Error(w, http.StatusForbidden, "FORBIDDEN", "OAuth state mismatch verification failed")
		return
	}

	// 2. Extract authorization code
	code := r.URL.Query().Get("code")
	if code == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "OAuth authorization code is missing")
		return
	}

	// 3. Exchange code for JWT session token
	redirectURI := h.getRedirectURI(r)
	accessToken, refreshToken, user, err := h.service.HandleGoogleCallback(r.Context(), code, redirectURI)
	if err != nil {
		if err.Error() == "PROVIDER_MISMATCH: native" {
			http.Redirect(w, r, "/login?error=PROVIDER_MISMATCH&provider=native", http.StatusTemporaryRedirect)
			return
		}
		response.Error(w, http.StatusUnauthorized, "AUTHENTICATION_FAILED", err.Error())
		return
	}

	// 4. Set authentication and CSRF session cookies
	h.setAuthCookies(w, accessToken, refreshToken)

	// 5. Redirect browser based on user's highest-privilege platform role
	roleName := "User"
	if userID, err := strconv.Atoi(user.ID); err == nil {
		roleName = h.resolveRoleName(userID)
	}

	frontendURL := resolveFrontendURL(r)

	targetPath := "/"
	switch roleName {
	case "Super Admin":
		targetPath = "/admin"
	case "Auditor":
		targetPath = "/auditor"
	case "Event Organizer":
		targetPath = "/organizer"
	default:
		targetPath = "/"
	}

	http.Redirect(w, r, frontendURL+targetPath, http.StatusTemporaryRedirect)
}

// handleRefresh rotates the refresh token and issues a new access token. It
// authenticates purely via the refresh_token cookie (the access token may be
// expired), and is CSRF-protected like any state-changing POST. Any failure —
// missing, expired, revoked, or replayed token — clears all cookies and
// returns 401 so the client falls back to a full login.
func (h *Handler) handleRefresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil || cookie.Value == "" {
		h.clearAuthCookies(w)
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Refresh token is missing")
		return
	}

	accessToken, refreshToken, user, err := h.service.RefreshTokens(r.Context(), cookie.Value)
	if err != nil {
		h.clearAuthCookies(w)
		if errors.Is(err, ErrRefreshTokenReuse) {
			// A rotated token was replayed — possible theft. The family is
			// already revoked; surface it for monitoring.
			log.Printf("[SECURITY] refresh token reuse detected")
		}
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Session expired. Please log in again.")
		return
	}

	h.setAuthCookies(w, accessToken, refreshToken)

	roleName := "User"
	if userID, err := strconv.Atoi(user.ID); err == nil {
		roleName = h.resolveRoleName(userID)
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"user_id":   user.ID,
		"email":     user.Email,
		"full_name": user.FullName,
		"role":      roleName,
	})
}

func (h *Handler) handleLogout(w http.ResponseWriter, r *http.Request) {
	// Revoke the server-side session so the refresh token can't be reused.
	// Logout still succeeds (cookies cleared) even if revocation errors.
	if cookie, err := r.Cookie("refresh_token"); err == nil && cookie.Value != "" {
		if err := h.service.Logout(r.Context(), cookie.Value); err != nil {
			log.Printf("[WARN] logout: revoke session: %v", err)
		}
	}

	h.clearAuthCookies(w)
	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Logged out successfully",
	})
}

// handleLogoutAll revokes every session for the authenticated user (all
// devices), e.g. after a suspected compromise.
func (h *Handler) handleLogoutAll(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User is not authenticated")
		return
	}

	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID in token claims")
		return
	}

	if err := h.service.LogoutAll(r.Context(), userID); err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Failed to revoke sessions")
		return
	}

	h.clearAuthCookies(w)
	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Logged out of all devices",
	})
}

func (h *Handler) handleMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User is not authenticated")
		return
	}

	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID in token claims")
		return
	}

	user, err := h.service.repo.GetByID(userID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "User not found")
		return
	}

	roleName := h.resolveRoleName(userID)

	stats, err := h.service.repo.GetProfileStats(userID)
	if err != nil {
		log.Printf("[ERROR] handleMe: GetProfileStats userID=%d: %v", userID, err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "An internal error occurred")
		return
	}

	isOrganizer := roleName == "Event Organizer" || roleName == "Super Admin"
	events, err := h.service.repo.GetAssociatedEvents(userID, isOrganizer)
	if err != nil {
		log.Printf("[ERROR] handleMe: GetAssociatedEvents userID=%d: %v", userID, err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "An internal error occurred")
		return
	}

	if events == nil {
		events = []ProfileEventSummary{}
	}

	profileResponse := UserProfileResponse{
		UserID:      user.ID,
		Email:       user.Email,
		FullName:    user.FullName,
		PhoneNumber: user.PhoneNumber,
		Location:    user.Location,
		Bio:         user.Bio,
		AvatarURL:   user.AvatarPic,
		Role:        roleName,
		MemberSince: user.CreatedAt.Format("January 2006"),
		Stats:       stats,
		Events:      events,
	}

	response.JSON(w, http.StatusOK, profileResponse)
}

func (h *Handler) handleUpdateProfile(w http.ResponseWriter, r *http.Request) {
	// Limit request body size to 1MB to prevent memory exhaustion DoS
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User is not authenticated")
		return
	}

	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID in token claims")
		return
	}

	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body or payload too large")
		return
	}

	// Validate inputs length to match database character varying constraints
	if req.FullName == "" {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", "Full name is required")
		return
	}
	if len(req.FullName) > 255 {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", "Full name must be 255 characters or less")
		return
	}
	if len(req.PhoneNumber) > 50 {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", "Phone number must be 50 characters or less")
		return
	}
	if len(req.Location) > 255 {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", "Location must be 255 characters or less")
		return
	}
	if len(req.Bio) > 2000 {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", "Bio must be 2000 characters or less")
		return
	}

	err = h.service.repo.UpdateProfile(userID, req)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Failed to update profile: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Profile updated successfully",
	})
}

func (h *Handler) handleForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Email is required")
		return
	}

	resetBaseURL := resolveFrontendURL(r)

	_ = h.service.RequestPasswordReset(req.Email, resetBaseURL)

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Jika email terdaftar, instruksi reset password telah dikirim ke email Anda.",
	})
}

func (h *Handler) handleSendOTP(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email   string `json:"email"`
		Purpose string `json:"purpose"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Email is required")
		return
	}

	if req.Purpose == "" {
		req.Purpose = "verifikasi"
	}

	otpCode, err := h.service.SendOTP(req.Email, req.Purpose)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Kode OTP telah dikirim ke email Anda.",
		"otp":     otpCode,
	})
}

func (h *Handler) handleResetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token       string `json:"token"`
		Email       string `json:"email"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Token == "" || req.Email == "" || req.NewPassword == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Token, email, and new password are required")
		return
	}

	if err := h.service.ResetPassword(req.Token, req.Email, req.NewPassword); err != nil {
		response.Error(w, http.StatusBadRequest, "RESET_FAILED", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Password berhasil direset. Silakan login dengan password baru Anda.",
	})
}
