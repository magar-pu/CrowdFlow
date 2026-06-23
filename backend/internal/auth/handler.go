package auth

import (
	"encoding/json"
	"net/http"

	"crowdflow-backend/internal/response"
)

type Handler struct {
	service *AuthService
}

func NewHandler(service *AuthService) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/auth/register", h.handleRegister)
	mux.HandleFunc("POST /api/auth/login", h.handleLogin)
	mux.HandleFunc("POST /api/auth/google", h.handleGoogleLogin)
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

	response.JSON(w, http.StatusOK, map[string]string{
		"access_token": token,
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

	response.JSON(w, http.StatusOK, map[string]string{
		"access_token": token,
	})
}
