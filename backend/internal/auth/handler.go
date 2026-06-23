package auth

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"

	"crowdflow-backend/internal/response"
)

type Handler struct {
	service *AuthService
	secure  bool // Enforces Secure cookie flag (true in production, false in development)
}

func NewHandler(service *AuthService, secure bool) *Handler {
	return &Handler{service: service, secure: secure}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/auth/register", h.handleRegister)
	mux.HandleFunc("POST /api/auth/login", h.handleLogin)
	mux.HandleFunc("POST /api/auth/google", h.handleGoogleLogin)
	mux.HandleFunc("POST /api/auth/logout", h.handleLogout)
}

func generateCSRFToken() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func (h *Handler) setAuthCookies(w http.ResponseWriter, token string) {
	// 1. Set HttpOnly JWT Cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    token,
		Path:     "/",
		MaxAge:   86400, // 1 day
		HttpOnly: true,
		Secure:   h.secure,
		SameSite: http.SameSiteLaxMode,
	})

	// 2. Set client-readable CSRF Cookie
	csrfToken := generateCSRFToken()
	http.SetCookie(w, &http.Cookie{
		Name:     "csrf_token",
		Value:    csrfToken,
		Path:     "/",
		MaxAge:   86400, // 1 day
		HttpOnly: false, // Must be readable by Next.js client
		Secure:   h.secure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (h *Handler) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body")
		return
	}

	if req.Email == "" || req.Password == "" || req.FullName == "" {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", "Email, password, and full name are required")
		return
	}

	if err := h.service.Register(req); err != nil {
		response.Error(w, http.StatusConflict, "REGISTRATION_FAILED", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, map[string]string{
		"message": "User registered successfully",
	})
}

func (h *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body")
		return
	}

	token, err := h.service.Login(req)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "AUTHENTICATION_FAILED", err.Error())
		return
	}

	// Set secure auth cookies instead of returning token in JSON body
	h.setAuthCookies(w, token)

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Logged in successfully",
	})
}

func (h *Handler) handleGoogleLogin(w http.ResponseWriter, r *http.Request) {
	var req GoogleLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body")
		return
	}

	if req.Token == "" {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", "Google token is required")
		return
	}

	token, err := h.service.LoginWithGoogle(r.Context(), req.Token)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "AUTHENTICATION_FAILED", err.Error())
		return
	}

	// Set secure auth cookies instead of returning token in JSON body
	h.setAuthCookies(w, token)

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Logged in successfully via Google",
	})
}

func (h *Handler) handleLogout(w http.ResponseWriter, r *http.Request) {
	// 1. Clear access_token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1, // Deletes the cookie
		HttpOnly: true,
		Secure:   h.secure,
		SameSite: http.SameSiteLaxMode,
	})

	// 2. Clear csrf_token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "csrf_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1, // Deletes the cookie
		HttpOnly: false,
		Secure:   h.secure,
		SameSite: http.SameSiteLaxMode,
	})

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Logged out successfully",
	})
}
