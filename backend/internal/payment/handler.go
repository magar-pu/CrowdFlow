package payment

import (
	"encoding/json"
	"net/http"
	"strconv"

	"crowdflow-backend/internal/middleware"
	"crowdflow-backend/internal/response"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux, authMiddleware func(http.Handler) http.Handler) {
	mux.Handle("POST /orders", authMiddleware(http.HandlerFunc(h.createOrder)))
	
	// Webhook is public so midtrans can reach it
	mux.HandleFunc("POST /payment/webhook", h.handleWebhook)
}

func (h *Handler) createOrder(w http.ResponseWriter, r *http.Request) {
	// 1. Get User ID from context claims
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User is not authenticated")
		return
	}

	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in token claims")
		return
	}

	// 2. Parse request
	var req CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid JSON body")
		return
	}

	// 3. Call service
	resp, err := h.service.CreateMidtransTransaction(r.Context(), userID, &req)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	// 4. Return success using standard response envelope
	response.JSON(w, http.StatusOK, resp)
}

func (h *Handler) handleWebhook(w http.ResponseWriter, r *http.Request) {
	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid JSON payload")
		return
	}

	if err := h.service.HandleMidtransWebhook(r.Context(), payload); err != nil {
		// Log the error but return 200 OK to midtrans so it stops retrying
		// or return 500 depending on the logic, but usually we return 200
		response.Error(w, http.StatusInternalServerError, "WEBHOOK_FAILED", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
