package admin

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"crowdflow-backend/internal/middleware"
	"crowdflow-backend/internal/response"
)

// actorIDFromRequest resolves the authenticated Super Admin's user ID for
// activity-log attribution. All routes that call this are already gated by
// requirePlatformRole("Super Admin") in RegisterRoutes, so claims are always
// present here - a missing/invalid sub claim is treated as a server error
// rather than re-checked as an auth failure.
func actorIDFromRequest(r *http.Request) (int, bool) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		return 0, false
	}
	actorID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		return 0, false
	}
	return actorID, true
}

// parsePagination reads limit/offset query params shared by every admin list
// endpoint, falling back to defaultLimit/0 when absent or invalid. The
// service layer applies its own default too (limit<=0), so a 0 fallback here
// is safe.
func parsePagination(r *http.Request, defaultLimit int) (limit, offset int) {
	limit, offset = defaultLimit, 0
	if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && l > 0 {
		limit = l
	}
	if o, err := strconv.Atoi(r.URL.Query().Get("offset")); err == nil && o >= 0 {
		offset = o
	}
	return limit, offset
}

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes wires the admin console's API surface under /api/v1, gated
// by the Super Admin platform role. Paths intentionally match
// frontend/src/lib/api/admin/*.ts so the existing admin frontend can be
// switched from local mock state to real fetches without any client changes,
// except where noted below.
func (h *Handler) RegisterRoutes(
	mux *http.ServeMux,
	authenticate func(http.Handler) http.Handler,
	requirePlatformRole func(allowedRoles ...string) func(http.Handler) http.Handler,
) {
	admin := func(f http.HandlerFunc) http.Handler {
		return authenticate(requirePlatformRole("Super Admin")(f))
	}

	mux.Handle("GET /dashboard/stats", admin(h.handleGetDashboardStats))
	mux.Handle("GET /dashboard/alerts", admin(h.handleListSecurityAlerts))
	mux.Handle("GET /dashboard/activities", admin(h.handleListActivities))

	mux.Handle("GET /events", admin(h.handleListEvents))
	mux.Handle("POST /events/{id}/approve", admin(h.handleApproveEvent))
	mux.Handle("POST /events/{id}/reject", admin(h.handleRejectEvent))
	mux.Handle("POST /events/{id}/status", admin(h.handleSetEventStatus))
	mux.Handle("GET /events/{id}/status-log", admin(h.handleListEventStatusLog))
	// NOTE: event creation and publishing are deliberately NOT duplicated here.
	// backend/internal/event already exposes POST /api/events and
	// PATCH /api/events/{id}/publish, and Super Admin already bypasses their
	// role checks (see middleware.RequirePlatformRole/RequireEventRole).
	// frontend/src/lib/api/admin/eventService.ts's createEvent/publishEvent
	// should be pointed at those existing endpoints rather than a new v1
	// duplicate - see conversation summary.

	mux.Handle("GET /events/{id}/scanners", admin(h.handleListScanners))
	mux.Handle("POST /events/{id}/scanners", admin(h.handleNotImplemented))
	mux.Handle("DELETE /events/{id}/scanners/{scannerId}", admin(h.handleNotImplemented))

	// Bonus reads - not yet called by the frontend service files (only PUT is),
	// included so a future "load current tiers/sections" fetch has somewhere to go.
	mux.Handle("GET /events/{id}/ticket-tiers", admin(h.handleGetTicketTiers))
	mux.Handle("PUT /events/{id}/ticket-tiers", admin(h.handleUpdateTicketTiers))
	mux.Handle("DELETE /events/{id}/ticket-tiers/{tierId}", admin(h.handleDeleteTicketTier))
	mux.Handle("GET /events/{id}/venue-sections", admin(h.handleGetVenueSections))
	mux.Handle("PUT /events/{id}/venue-sections", admin(h.handleUpdateVenueSections))

	mux.Handle("GET /finance/transactions", admin(h.handleListTransactions))
	mux.Handle("GET /finance/payouts", admin(h.handleListPayouts))
	mux.Handle("POST /finance/payouts/{id}/process", admin(h.handleProcessPayout))
	mux.Handle("POST /finance/payouts/{id}/reject", admin(h.handleRejectPayout))
	mux.Handle("POST /finance/transactions/{id}/status", admin(h.handleUpdateTransactionStatus))

	mux.Handle("GET /users", admin(h.handleListUsers))
	mux.Handle("POST /users/{id}/status", admin(h.handleUpdateUserStatus))
	mux.Handle("POST /users/{id}/roles", admin(h.handleGrantUserRole))
	mux.Handle("DELETE /users/{id}/roles", admin(h.handleRevokeUserRole))
	mux.Handle("GET /users/verifications", admin(h.handleListVerifications))
	mux.Handle("POST /users/verifications/{id}/approve", admin(h.handleApproveVerification))
	mux.Handle("POST /users/verifications/{id}/reject", admin(h.handleRejectVerification))
}

// handleNotImplemented is returned for actions on resources with no backing
// table yet (scanners, payouts, verification applications). It responds with
// the standard error envelope rather than a fabricated success, so the
// frontend surfaces a real error state instead of silently lying.
func (h *Handler) handleNotImplemented(w http.ResponseWriter, r *http.Request) {
	response.Error(w, http.StatusNotImplemented, "NOT_IMPLEMENTED", "This admin feature has no backing data model yet.")
}

func (h *Handler) handleGetDashboardStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.service.GetDashboardStats()
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load dashboard statistics")
		return
	}
	response.JSON(w, http.StatusOK, stats)
}

func (h *Handler) handleListSecurityAlerts(w http.ResponseWriter, r *http.Request) {
	alerts, err := h.service.ListSecurityAlerts()
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load security alerts")
		return
	}
	response.JSON(w, http.StatusOK, alerts)
}

func (h *Handler) handleListActivities(w http.ResponseWriter, r *http.Request) {
	activities, err := h.service.ListActivities()
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load activity feed")
		return
	}
	response.JSON(w, http.StatusOK, activities)
}

func (h *Handler) handleListEvents(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r, 20)

	events, err := h.service.ListEvents(limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load events")
		return
	}
	response.JSON(w, http.StatusOK, events)
}

type eventDecisionRequest struct {
	Notes string `json:"notes"`
}

func (h *Handler) handleApproveEvent(w http.ResponseWriter, r *http.Request) {
	actorID, ok := actorIDFromRequest(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Could not resolve the authenticated admin")
		return
	}
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}
	var req eventDecisionRequest
	_ = json.NewDecoder(r.Body).Decode(&req) // body is optional for approve

	if err := h.service.ApproveEvent(eventID, actorID, req.Notes); err != nil {
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to approve event")
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Event approved"})
}

func (h *Handler) handleRejectEvent(w http.ResponseWriter, r *http.Request) {
	actorID, ok := actorIDFromRequest(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Could not resolve the authenticated admin")
		return
	}
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}
	var req eventDecisionRequest
	_ = json.NewDecoder(r.Body).Decode(&req) // empty body falls through to the "notes required" validation error below

	if err := h.service.RejectEvent(eventID, actorID, req.Notes); err != nil {
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to reject event")
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Event rejected"})
}

type eventStatusRequest struct {
	Status string `json:"status"`
}

func (h *Handler) handleSetEventStatus(w http.ResponseWriter, r *http.Request) {
	actorID, ok := actorIDFromRequest(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Could not resolve the authenticated admin")
		return
	}
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}
	var req eventStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_BODY", "Request body must be valid JSON")
		return
	}

	if err := h.service.SetEventStatus(eventID, req.Status, actorID); err != nil {
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update event status")
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Event status updated"})
}

func (h *Handler) handleListEventStatusLog(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}
	entries, err := h.service.ListEventStatusLog(eventID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load event status log")
		return
	}
	response.JSON(w, http.StatusOK, entries)
}

func (h *Handler) handleListScanners(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}
	scanners, err := h.service.ListScanners(eventID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load scanners")
		return
	}
	response.JSON(w, http.StatusOK, scanners)
}

func (h *Handler) handleGetTicketTiers(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}
	tiers, err := h.service.GetTicketTiers(eventID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load ticket tiers")
		return
	}
	response.JSON(w, http.StatusOK, tiers)
}

func (h *Handler) handleUpdateTicketTiers(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}
	var tiers []*TicketTier
	if err := json.NewDecoder(r.Body).Decode(&tiers); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body")
		return
	}
	if err := h.service.UpdateTicketTiers(eventID, tiers); err != nil {
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update ticket tiers")
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Ticket tiers updated"})
}

func (h *Handler) handleDeleteTicketTier(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}
	tierID, err := strconv.Atoi(r.PathValue("tierId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Tier ID must be a valid integer")
		return
	}
	if err := h.service.DeleteTicketTier(eventID, tierID); err != nil {
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete ticket tier")
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Ticket tier deleted"})
}

func (h *Handler) handleGetVenueSections(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}
	sections, err := h.service.GetVenueSections(eventID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load venue sections")
		return
	}
	response.JSON(w, http.StatusOK, sections)
}

func (h *Handler) handleUpdateVenueSections(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}
	var sections []*VenueSection
	if err := json.NewDecoder(r.Body).Decode(&sections); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body")
		return
	}
	if err := h.service.UpdateVenueSections(eventID, sections); err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update venue sections")
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Venue sections updated"})
}

func (h *Handler) handleListTransactions(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r, 50)
	transactions, err := h.service.ListTransactions(limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load transactions")
		return
	}
	response.JSON(w, http.StatusOK, transactions)
}

func (h *Handler) handleListPayouts(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r, 50)
	payouts, err := h.service.ListPayouts(limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load payouts")
		return
	}
	response.JSON(w, http.StatusOK, payouts)
}

func (h *Handler) handleProcessPayout(w http.ResponseWriter, r *http.Request) {
	actorID, ok := actorIDFromRequest(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Could not resolve the authenticated admin")
		return
	}
	payoutID := r.PathValue("id")
	if err := h.service.ProcessPayout(payoutID, actorID); err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Payout processed"})
}

func (h *Handler) handleRejectPayout(w http.ResponseWriter, r *http.Request) {
	actorID, ok := actorIDFromRequest(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Could not resolve the authenticated admin")
		return
	}
	payoutID := r.PathValue("id")
	if err := h.service.RejectPayout(payoutID, actorID); err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Payout rejected"})
}

type statusUpdateRequest struct {
	Status string `json:"status"`
}

func (h *Handler) handleUpdateTransactionStatus(w http.ResponseWriter, r *http.Request) {
	actorID, ok := actorIDFromRequest(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Could not resolve the authenticated admin")
		return
	}
	orderID := r.PathValue("id")
	var req statusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body")
		return
	}
	if err := h.service.UpdateTransactionStatus(orderID, req.Status, actorID); err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Transaction status updated"})
}

func (h *Handler) handleListUsers(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r, 50)
	users, err := h.service.ListUsers(limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load users")
		return
	}
	response.JSON(w, http.StatusOK, users)
}

func (h *Handler) handleUpdateUserStatus(w http.ResponseWriter, r *http.Request) {
	actorID, ok := actorIDFromRequest(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Could not resolve the authenticated admin")
		return
	}
	userID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "User ID must be a valid integer")
		return
	}
	var req statusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body")
		return
	}
	if err := h.service.UpdateUserStatus(userID, req.Status, actorID); err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "User status updated"})
}

func (h *Handler) handleApproveVerification(w http.ResponseWriter, r *http.Request) {
	h.setVerificationStatus(w, r, "Verified", "Verification approved")
}

func (h *Handler) handleRejectVerification(w http.ResponseWriter, r *http.Request) {
	h.setVerificationStatus(w, r, "Suspended", "Verification rejected")
}

// setVerificationStatus approves or rejects a pending verification. The queue is
// derived from users.verification_status, so the {id} is the user's own id and
// this reuses UpdateUserStatus ("Verified" -> verified, "Suspended" -> rejected)
// rather than a parallel data model.
func (h *Handler) setVerificationStatus(w http.ResponseWriter, r *http.Request, status, successMsg string) {
	actorID, ok := actorIDFromRequest(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Could not resolve the authenticated admin")
		return
	}
	userID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Verification ID must be a valid integer")
		return
	}
	if err := h.service.UpdateUserStatus(userID, status, actorID); err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": successMsg})
}

type grantRoleRequest struct {
	RoleID  int  `json:"role_id"`
	EventID *int `json:"event_id"`
}

// handleGrantUserRole assigns a role_id to the target user, platform-wide
// when event_id is omitted/null or scoped to that event otherwise (e.g.
// Event Organizer everywhere vs. Auditor on one specific event).
func (h *Handler) handleGrantUserRole(w http.ResponseWriter, r *http.Request) {
	actorID, ok := actorIDFromRequest(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Could not resolve the authenticated admin")
		return
	}
	userID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "User ID must be a valid integer")
		return
	}
	var req grantRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body")
		return
	}
	if err := h.service.GrantUserRole(userID, req.RoleID, req.EventID, actorID); err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
		return
	}
	response.JSON(w, http.StatusCreated, map[string]string{"message": "Role granted"})
}

// handleRevokeUserRole removes a role_id from the target user, matching the
// same event scope the grant used (event_id omitted/null -> the platform-wide
// grant; an event_id -> that event's scoped grant).
func (h *Handler) handleRevokeUserRole(w http.ResponseWriter, r *http.Request) {
	actorID, ok := actorIDFromRequest(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Could not resolve the authenticated admin")
		return
	}
	userID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "User ID must be a valid integer")
		return
	}
	var req grantRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body")
		return
	}
	if err := h.service.RevokeUserRole(userID, req.RoleID, req.EventID, actorID); err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Role revoked"})
}

func (h *Handler) handleListVerifications(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r, 50)
	verifications, err := h.service.ListVerifications(limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load verification applications")
		return
	}
	response.JSON(w, http.StatusOK, verifications)
}
