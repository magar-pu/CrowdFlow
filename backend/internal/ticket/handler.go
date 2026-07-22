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
	mux.Handle("GET /tickets/{ticketId}/qr", authMw(http.HandlerFunc(h.getTicketQR)))
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
