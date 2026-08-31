package ticket

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
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

func (h *TicketHandler) RegisterRoutes(mux *http.ServeMux, authMw func(http.Handler) http.Handler, orderAccessRateLimit func(http.Handler) http.Handler, orderAccessRotateRateLimit func(http.Handler) http.Handler) {
	mux.Handle("GET /my-tickets", authMw(http.HandlerFunc(h.getMyTickets)))
	mux.Handle("POST /orders/complete-payment", authMw(http.HandlerFunc(h.completePayment)))

	// Link-as-credential, deliberately unauthenticated (plan decision 4): the
	// order/ticket UUID in the path IS the access control. Backs the
	// /booking/<order_uuid> and /booking/<order_uuid>/t/<ticket_uuid> frontend
	// pages. Kept under a distinct "/order-access" prefix rather than
	// "/booking/..." to avoid any ambiguity with the existing seat-hold
	// routes at POST/GET/DELETE /booking/holds/{token} (internal/booking).
	//
	// This replaces the deleted request-otp/verify-otp/GET /tickets/{id}/vault
	// trio, which turned out to have NO real ownership check for an
	// unauthenticated caller (userID defaulted to 0, and `$2 = 0 OR
	// purchaser_id = $2` short-circuited past it) — these two routes are
	// strictly tighter: both the order id and ticket id must match together,
	// with no id-in-either-slot pivot. Rate limited since they're now the
	// only unauthenticated secret-bearing routes in the codebase.
	mux.Handle("GET /order-access/{orderId}", orderAccessRateLimit(http.HandlerFunc(h.getOrderAccess)))
	mux.Handle("GET /order-access/{orderId}/tickets/{ticketId}", orderAccessRateLimit(http.HandlerFunc(h.getTicketAccessByOrder)))

	// M3/M4: purchaser-authorized secret rotation, "panic revoke" or explicit
	// transfer. Same link-as-credential scoping as the GET above — a rarer,
	// more sensitive write, so its own stricter limiter rather than reusing
	// orderAccessRateLimit's read-traffic ceiling.
	mux.Handle("POST /order-access/{orderId}/tickets/{ticketId}/rotate", orderAccessRotateRateLimit(http.HandlerFunc(h.rotateTicketAccessSecret)))
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

func (h *TicketHandler) getOrderAccess(w http.ResponseWriter, r *http.Request) {
	orderID := r.PathValue("orderId")
	if orderID == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Order ID is required")
		return
	}

	res, err := h.service.GetOrderAccess(orderID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, res)
}

func (h *TicketHandler) getTicketAccessByOrder(w http.ResponseWriter, r *http.Request) {
	orderID := r.PathValue("orderId")
	ticketID := r.PathValue("ticketId")
	if orderID == "" || ticketID == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Order ID and Ticket ID are required")
		return
	}

	res, err := h.service.GetTicketAccess(orderID, ticketID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	// M5: record this secret fetch — fire-and-forget, off the response path,
	// so a logging hiccup never delays or breaks ticket delivery. Hashes only
	// (see RecordBookingAccess doc comment); raw IP/UA never leaves this frame.
	ipHash := hashForAccessLog(middleware.ClientIP(r))
	uaHash := hashForAccessLog(r.Header.Get("User-Agent"))
	go func() {
		if err := h.service.RecordBookingAccess(orderID, ticketID, ipHash, uaHash); err != nil {
			log.Printf("[BOOKING ACCESS LOG ERROR] order=%s ticket=%s: %v", orderID, ticketID, err)
		}
	}()

	response.JSON(w, http.StatusOK, res)
}

// hashForAccessLog is the M5 device-distinctness hash: plain SHA-256 hex,
// no salt — see the doc comment on migration 0033 for why an unsalted hash
// is the right call here (a heuristic, not a secret).
func hashForAccessLog(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func (h *TicketHandler) rotateTicketAccessSecret(w http.ResponseWriter, r *http.Request) {
	orderID := r.PathValue("orderId")
	ticketID := r.PathValue("ticketId")
	if orderID == "" || ticketID == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Order ID and Ticket ID are required")
		return
	}

	if err := h.service.RotateSecretForOrderTicket(orderID, ticketID); err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, RotateSecretResponse{TicketID: ticketID, Rotated: true})
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
