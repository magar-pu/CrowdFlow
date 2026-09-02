package payment

import (
	"encoding/json"
	"errors"
	"log"
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

func (h *Handler) RegisterRoutes(mux *http.ServeMux, authMiddleware func(http.Handler) http.Handler, requireBuyer func(http.Handler) http.Handler, orderRateLimit func(http.Handler) http.Handler) {
	mux.Handle("POST /orders", authMiddleware(requireBuyer(orderRateLimit(http.HandlerFunc(h.createOrder)))))

	// Webhook is public so midtrans can reach it. Deliberately unlimited:
	// Midtrans retries from a small set of IPs, and throttling it here would
	// mean a paid order silently never gets marked paid.
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
		// Attendee validation is a buyer mistake, not a server fault — surfaced
		// as 400 with the specific reason so the checkout form can point at
		// what to fix, rather than the generic 500 every other failure here
		// gets collapsed into.
		if errors.Is(err, ErrInvalidAttendees) {
			response.Error(w, http.StatusBadRequest, "INVALID_ATTENDEES", err.Error())
			return
		}
		log.Printf("Order creation failed for user %d: %v", userID, err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to process payment transaction")
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
		// A bad signature is not a processing failure: the body did not come
		// from Midtrans (or the wrong server key is configured). 403 rather
		// than 500 so a genuine Midtrans retry storm is distinguishable from a
		// forged caller in the access log, and so Midtrans stops retrying a
		// body that will never verify.
		if errors.Is(err, ErrInvalidSignature) {
			response.Error(w, http.StatusForbidden, "INVALID_SIGNATURE", "Signature verification failed")
			return
		}

		log.Printf("Webhook handling failed: %v", err)
		response.Error(w, http.StatusInternalServerError, "WEBHOOK_FAILED", "Failed to process webhook")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
