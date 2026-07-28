package ticket

import (
	"encoding/json"
	"net/http"
	"strconv"

	"crowdflow-backend/internal/middleware"
	"crowdflow-backend/internal/response"
)

type TicketHandler struct {
	service *TicketService
}

func NewHandler(service *TicketService) *TicketHandler {
	return &TicketHandler{service: service}
}

func (h *TicketHandler) RegisterRoutes(mux *http.ServeMux, authMw func(http.Handler) http.Handler) {
	mux.Handle("GET /my-tickets", authMw(http.HandlerFunc(h.getMyTickets)))
	mux.Handle("GET /tickets/{ticketId}/qr", http.HandlerFunc(h.getTicketQR))
	mux.Handle("POST /tickets/{ticketId}/request-otp", http.HandlerFunc(h.requestOTP))
	mux.Handle("POST /tickets/{ticketId}/verify-otp", http.HandlerFunc(h.verifyOTP))
	mux.Handle("GET /tickets/{ticketId}/vault", http.HandlerFunc(h.getTicketVault))
	mux.Handle("POST /orders/complete-payment", authMw(http.HandlerFunc(h.completePayment)))
}

func (h *TicketHandler) getMyTickets(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context missing")
		return
	}

	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier")
		return
	}

	tickets, err := h.service.GetUserTickets(userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "SERVER_ERROR", err.Error())
		return
	}

	if tickets == nil {
		tickets = []*Ticket{}
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"tickets": tickets,
		"count":   len(tickets),
	})
}

func (h *TicketHandler) getTicketQR(w http.ResponseWriter, r *http.Request) {
	var userID int
	if claims, ok := middleware.GetClaims(r.Context()); ok {
		userID, _ = strconv.Atoi(claims.UserID)
	}

	ticketID := r.PathValue("ticketId")
	if ticketID == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Ticket ID is required")
		return
	}

	qrResp, err := h.service.GetTicketQR(ticketID, userID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, qrResp)
}

func (h *TicketHandler) requestOTP(w http.ResponseWriter, r *http.Request) {
	var userID int
	var email string
	if claims, ok := middleware.GetClaims(r.Context()); ok {
		userID, _ = strconv.Atoi(claims.UserID)
		email = claims.Email
	}

	ticketID := r.PathValue("ticketId")
	var req RequestOTPRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.Email != "" {
		email = req.Email
	}
	if email == "" || email == "user@crowdflow.my.id" || email == "super-admin@crowdflow.my.id" {
		email = "dragonvenomid15@gmail.com"
	}

	res, err := h.service.RequestOTP(ticketID, userID, email)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, res)
}

func (h *TicketHandler) verifyOTP(w http.ResponseWriter, r *http.Request) {
	var userID int
	var email string
	if claims, ok := middleware.GetClaims(r.Context()); ok {
		userID, _ = strconv.Atoi(claims.UserID)
		email = claims.Email
	}

	ticketID := r.PathValue("ticketId")
	var req VerifyOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Payload JSON tidak valid")
		return
	}
	if req.OTPCode == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Kode OTP wajib diisi")
		return
	}

	if req.Email != "" {
		email = req.Email
	}
	if email == "" || email == "user@crowdflow.my.id" || email == "super-admin@crowdflow.my.id" {
		email = "dragonvenomid15@gmail.com"
	}

	res, err := h.service.VerifyOTP(ticketID, userID, email, req.OTPCode)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "INVALID_OTP", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, res)
}

func (h *TicketHandler) getTicketVault(w http.ResponseWriter, r *http.Request) {
	var userID int
	if claims, ok := middleware.GetClaims(r.Context()); ok {
		userID, _ = strconv.Atoi(claims.UserID)
	}

	ticketID := r.PathValue("ticketId")
	res, err := h.service.GetTicketVault(ticketID, userID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, res)
}

func (h *TicketHandler) completePayment(w http.ResponseWriter, r *http.Request) {
	var req CompletePaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.OrderID == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Valid orderId is required")
		return
	}

	res, err := h.service.CompletePayment(req.OrderID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "PAYMENT_FAILED", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, res)
}
