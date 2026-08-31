package ticketman

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"crowdflow-backend/internal/middleware"
	"crowdflow-backend/internal/response"
	"crowdflow-backend/pkg/turnstile"
)

type Handler struct {
	service   *AuthService
	secure    bool
	accessTTL time.Duration
}

func NewHandler(service *AuthService, secure bool, accessTTL time.Duration) *Handler {
	return &Handler{service: service, secure: secure, accessTTL: accessTTL}
}

// RegisterRoutes mounts the ticketman's own login/logout/session-check
// routes. requireTicketman guards only /me — login and logout have no
// session yet to check.
func (h *Handler) RegisterRoutes(mux *http.ServeMux, requireTicketman func(http.Handler) http.Handler, loginRateLimit func(http.Handler) http.Handler) {
	mux.Handle("POST /api/ticketman/auth/login", loginRateLimit(http.HandlerFunc(h.handleLogin)))
	mux.Handle("POST /api/ticketman/auth/logout", http.HandlerFunc(h.handleLogout))
	mux.Handle("GET /api/ticketman/auth/me", requireTicketman(http.HandlerFunc(h.handleMe)))

	// verify-device is a thin alias onto /me (decision 22): device-side
	// "am I still authenticated, and as whom" is exactly the /me contract,
	// so it reuses handleMe rather than a second implementation.
	mux.Handle("GET /api/ticketman/auth/verify-device", requireTicketman(http.HandlerFunc(h.handleMe)))
}

func (h *Handler) setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "ticketman_access_token",
		Value:    token,
		Path:     "/",
		MaxAge:   int(h.accessTTL.Seconds()),
		HttpOnly: true,
		Secure:   h.secure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (h *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if valid, err := turnstile.VerifyToken(req.TurnstileToken, r.RemoteAddr); !valid {
		response.Error(w, http.StatusBadRequest, "INVALID_TURNSTILE", "CAPTCHA verification failed: "+err.Error())
		return
	}

	token, info, err := h.service.Login(req)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", err.Error())
		return
	}

	h.setSessionCookie(w, token)
	response.JSON(w, http.StatusOK, info)
}

func (h *Handler) handleLogout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "ticketman_access_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   h.secure,
		SameSite: http.SameSiteLaxMode,
	})
	response.JSON(w, http.StatusOK, map[string]string{"message": "Logged out"})
}

func (h *Handler) handleMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetTicketmanClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}
	staffID, err := strconv.Atoi(claims.StaffID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid session")
		return
	}

	info, err := h.service.GetSessionInfo(staffID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "Ticketman account not found")
		return
	}
	response.JSON(w, http.StatusOK, info)
}
