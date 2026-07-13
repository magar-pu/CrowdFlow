package admin

import (
	"encoding/json"
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

	mux.Handle("GET /api/v1/dashboard/stats", admin(h.handleGetDashboardStats))
	mux.Handle("GET /api/v1/dashboard/alerts", admin(h.handleListSecurityAlerts))
	mux.Handle("GET /api/v1/dashboard/activities", admin(h.handleListActivities))

	mux.Handle("GET /api/v1/events", admin(h.handleListEvents))
	// NOTE: event creation and publishing are deliberately NOT duplicated here.
	// backend/internal/event already exposes POST /api/events and
	// PATCH /api/events/{id}/publish, and Super Admin already bypasses their
	// role checks (see middleware.RequirePlatformRole/RequireEventRole).
	// frontend/src/lib/api/admin/eventService.ts's createEvent/publishEvent
	// should be pointed at those existing endpoints rather than a new v1
	// duplicate - see conversation summary.

	mux.Handle("GET /api/v1/events/{id}/scanners", admin(h.handleListScanners))
	mux.Handle("POST /api/v1/events/{id}/scanners", admin(h.handleNotImplemented))
	mux.Handle("DELETE /api/v1/events/{id}/scanners/{scannerId}", admin(h.handleNotImplemented))

	// Bonus reads - not yet called by the frontend service files (only PUT is),
	// included so a future "load current tiers/sections" fetch has somewhere to go.
	mux.Handle("GET /api/v1/events/{id}/ticket-tiers", admin(h.handleGetTicketTiers))
	mux.Handle("PUT /api/v1/events/{id}/ticket-tiers", admin(h.handleUpdateTicketTiers))
	mux.Handle("GET /api/v1/events/{id}/venue-sections", admin(h.handleGetVenueSections))
	mux.Handle("PUT /api/v1/events/{id}/venue-sections", admin(h.handleUpdateVenueSections))

	mux.Handle("GET /api/v1/finance/transactions", admin(h.handleListTransactions))
	mux.Handle("GET /api/v1/finance/payouts", admin(h.handleListPayouts))
	mux.Handle("POST /api/v1/finance/payouts/{id}/process", admin(h.handleProcessPayout))
	mux.Handle("POST /api/v1/finance/payouts/{id}/reject", admin(h.handleRejectPayout))
	mux.Handle("POST /api/v1/finance/transactions/{id}/status", admin(h.handleUpdateTransactionStatus))

	mux.Handle("GET /api/v1/users", admin(h.handleListUsers))
	mux.Handle("POST /api/v1/users/{id}/status", admin(h.handleUpdateUserStatus))
	mux.Handle("POST /api/v1/users/{id}/roles", admin(h.handleGrantUserRole))
	mux.Handle("GET /api/v1/users/verifications", admin(h.handleListVerifications))
	mux.Handle("POST /api/v1/users/verifications/{id}/approve", admin(h.handleApproveVerification))
	mux.Handle("POST /api/v1/users/verifications/{id}/reject", admin(h.handleRejectVerification))
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
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update ticket tiers")
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Ticket tiers updated"})
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

func (h *Handler) handleListVerifications(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r, 50)
	verifications, err := h.service.ListVerifications(limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load verification applications")
		return
	}
	response.JSON(w, http.StatusOK, verifications)
}

// handleApproveVerification and handleRejectVerification treat the
// verification "application" ID as the user's own ID (see
// Repository.ListVerifications) and reuse UpdateUserStatus rather than a
// separate applications data model.

func (h *Handler) handleApproveVerification(w http.ResponseWriter, r *http.Request) {
	actorID, ok := actorIDFromRequest(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Could not resolve the authenticated admin")
		return
	}
	userID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Applicant ID must be a valid integer")
		return
	}
	if err := h.service.UpdateUserStatus(userID, "Verified", actorID); err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Verification approved"})
}

func (h *Handler) handleRejectVerification(w http.ResponseWriter, r *http.Request) {
	actorID, ok := actorIDFromRequest(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Could not resolve the authenticated admin")
		return
	}
	userID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Applicant ID must be a valid integer")
		return
	}
	if err := h.service.UpdateUserStatus(userID, "Suspended", actorID); err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Verification rejected"})
}
