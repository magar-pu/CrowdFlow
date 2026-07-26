package auditor

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"crowdflow-backend/internal/middleware"
	"crowdflow-backend/internal/response"
)

// Handler is the HTTP layer for the auditor portal.
type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes wires all /api/auditor/* routes.
// All routes require authentication + Auditor platform role.
// Super Admin bypasses the role check automatically (middleware handles this).
func (h *Handler) RegisterRoutes(
	mux *http.ServeMux,
	authenticate func(http.Handler) http.Handler,
	requirePlatformRole func(allowedRoles ...string) func(http.Handler) http.Handler,
) {
	auditor := func(next http.Handler) http.Handler {
		return authenticate(requirePlatformRole("Auditor", "Super Admin")(next))
	}

	// Dashboard
	mux.Handle("GET /api/v1/auditor/dashboard", auditor(http.HandlerFunc(h.handleGetDashboard)))
	mux.Handle("GET /api/v1/auditor/activity", auditor(http.HandlerFunc(h.handleListActivity)))

	// Event Reviews
	mux.Handle("GET /api/v1/auditor/reviews", auditor(http.HandlerFunc(h.handleListEventReviews)))
	mux.Handle("GET /api/v1/auditor/reviews/{id}", auditor(http.HandlerFunc(h.handleGetEventReview)))
	mux.Handle("POST /api/v1/auditor/reviews/{id}/approve", auditor(http.HandlerFunc(h.handleApproveEventReview)))
	mux.Handle("POST /api/v1/auditor/reviews/{id}/reject", auditor(http.HandlerFunc(h.handleRejectEventReview)))
	mux.Handle("POST /api/v1/auditor/reviews/{id}/request-changes", auditor(http.HandlerFunc(h.handleRequestEventChanges)))
	mux.Handle("PATCH /api/v1/auditor/reviews/{id}/stage", auditor(http.HandlerFunc(h.handleUpdateEventReviewStage)))
	mux.Handle("POST /api/v1/auditor/reviews/{id}/revisions", auditor(http.HandlerFunc(h.handleAddEventRevision)))
	mux.Handle("PUT /api/v1/auditor/revisions/{revId}/status", auditor(http.HandlerFunc(h.handleUpdateRevisionStatus)))
	mux.Handle("GET /api/v1/auditor/reviews/{id}/revisions", auditor(http.HandlerFunc(h.handleListEventRevisions)))
	mux.Handle("PATCH /api/v1/auditor/reviews/{id}/documents/{docId}/verify", auditor(http.HandlerFunc(h.handleVerifyReviewDocument)))
	mux.Handle("PATCH /api/v1/auditor/reviews/{id}/documents/{docId}/reject", auditor(http.HandlerFunc(h.handleRejectReviewDocument)))

	// Per-event documents. Separate paths rather than a param on the routes above:
	// event_documents and organizer_documents have overlapping SERIAL ids, so
	// reusing those routes would make {docId} ambiguous and could flip the status
	// of an unrelated document.
	mux.Handle("PATCH /api/v1/auditor/reviews/{id}/event-documents/{docId}/verify", auditor(http.HandlerFunc(h.handleVerifyEventDocument)))
	mux.Handle("PATCH /api/v1/auditor/reviews/{id}/event-documents/{docId}/reject", auditor(http.HandlerFunc(h.handleRejectEventDocument)))
	// ?source=event|organizer — mints a short-lived link for a specific document.
	mux.Handle("GET /api/v1/auditor/reviews/{id}/documents/{docId}/url", auditor(http.HandlerFunc(h.handleGetDocumentViewURL)))

	// Document Queue
	mux.Handle("GET /api/v1/auditor/documents", auditor(http.HandlerFunc(h.handleListDocuments)))
	mux.Handle("GET /api/v1/auditor/documents/{id}", auditor(http.HandlerFunc(h.handleGetDocument)))
	mux.Handle("PATCH /api/v1/auditor/documents/{id}/verify", auditor(http.HandlerFunc(h.handleVerifyDocument)))
	mux.Handle("PATCH /api/v1/auditor/documents/{id}/reject", auditor(http.HandlerFunc(h.handleRejectDocument)))

	// Organizer Verification
	mux.Handle("GET /api/v1/auditor/organizers", auditor(http.HandlerFunc(h.handleListOrganizers)))
	mux.Handle("GET /api/v1/auditor/organizers/{id}", auditor(http.HandlerFunc(h.handleGetOrganizer)))
	mux.Handle("POST /api/v1/auditor/organizers/{id}/approve", auditor(http.HandlerFunc(h.handleApproveOrganizer)))
	mux.Handle("POST /api/v1/auditor/organizers/{id}/reject", auditor(http.HandlerFunc(h.handleRejectOrganizer)))
	mux.Handle("PATCH /api/v1/auditor/organizers/{id}/status", auditor(http.HandlerFunc(h.handleUpdateOrganizerStatus)))

	// Payout Verification
	mux.Handle("GET /api/v1/auditor/payouts", auditor(http.HandlerFunc(h.handleListPayouts)))
	mux.Handle("GET /api/v1/auditor/payouts/{id}", auditor(http.HandlerFunc(h.handleGetPayout)))
	mux.Handle("POST /api/v1/auditor/payouts/{id}/approve", auditor(http.HandlerFunc(h.handleApprovePayout)))
	mux.Handle("POST /api/v1/auditor/payouts/{id}/reject", auditor(http.HandlerFunc(h.handleRejectPayout)))
	mux.Handle("POST /api/v1/auditor/payouts/{id}/hold", auditor(http.HandlerFunc(h.handleHoldPayout)))

	// Notifications
	mux.Handle("GET /api/v1/auditor/notifications", auditor(http.HandlerFunc(h.handleListNotifications)))
	mux.Handle("PUT /api/v1/auditor/notifications/read", auditor(http.HandlerFunc(h.handleMarkNotificationsRead)))
}

// ---- Shared helpers ----

// actorID extracts the authenticated user's ID from JWT claims.
func (h *Handler) actorID(r *http.Request) (int, bool) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		return 0, false
	}
	id, err := strconv.Atoi(claims.UserID)
	if err != nil {
		return 0, false
	}
	return id, true
}

// pathIntParam reads an integer from an HTTP path segment (Go 1.22+ {name} syntax).
func pathIntParam(r *http.Request, name string) (int, bool) {
	v := r.PathValue(name)
	if v == "" {
		return 0, false
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return 0, false
	}
	return n, true
}

// decodeJSON decodes a JSON request body into dest. Returns false and writes
// a 400 error response on failure.
func decodeJSON(w http.ResponseWriter, r *http.Request, dest interface{}) bool {
	if err := json.NewDecoder(r.Body).Decode(dest); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body: "+err.Error())
		return false
	}
	return true
}

// handleServiceError maps domain errors to HTTP status codes.
func handleServiceError(w http.ResponseWriter, caller string, err error) {
	switch {
	case isAuditorError(ErrNotFound, err):
		response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
	case isAuditorError(ErrValidation, err):
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
	case isAuditorError(ErrForbidden, err):
		response.Error(w, http.StatusForbidden, "FORBIDDEN", err.Error())
	default:
		log.Printf("[auditor] %s error: %v", caller, err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An internal error occurred")
	}
}

// ---- Dashboard Handlers ----

func (h *Handler) handleGetDashboard(w http.ResponseWriter, r *http.Request) {
	data, err := h.service.GetDashboard(r.Context())
	if err != nil {
		handleServiceError(w, "handleGetDashboard", err)
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) handleListActivity(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	data, err := h.service.ListActivity(r.Context(), page, limit)
	if err != nil {
		handleServiceError(w, "handleListActivity", err)
		return
	}
	response.JSON(w, http.StatusOK, data)
}

// ---- Event Review Handlers ----

func (h *Handler) handleListEventReviews(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	filters := EventReviewFilters{
		Status:    q.Get("status"),
		RiskLevel: q.Get("riskLevel"),
		Search:    q.Get("search"),
		Page:      page,
		Limit:     limit,
	}
	data, err := h.service.ListEventReviews(r.Context(), filters)
	if err != nil {
		handleServiceError(w, "handleListEventReviews", err)
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) handleGetEventReview(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a positive integer")
		return
	}
	data, err := h.service.GetEventReview(r.Context(), id)
	if err != nil {
		handleServiceError(w, "handleGetEventReview", err)
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) handleApproveEventReview(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	var req ApproveEventRequest
	if r.ContentLength > 0 {
		if !decodeJSON(w, r, &req) {
			return
		}
	}
	if err := h.service.ApproveEventReview(r.Context(), id, actorID, req.Notes); err != nil {
		handleServiceError(w, "handleApproveEventReview", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Event approved successfully"})
}

func (h *Handler) handleRejectEventReview(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	var req RejectEventRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.service.RejectEventReview(r.Context(), id, actorID, req.Reason, req.Notes); err != nil {
		handleServiceError(w, "handleRejectEventReview", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Event rejected"})
}

func (h *Handler) handleRequestEventChanges(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	var req RequestChangesRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.service.RequestEventChanges(r.Context(), id, actorID, req.Notes); err != nil {
		handleServiceError(w, "handleRequestEventChanges", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Changes requested"})
}

func (h *Handler) handleUpdateEventReviewStage(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	var req UpdateStageRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.service.UpdateEventReviewStage(r.Context(), id, actorID, req.Stage); err != nil {
		handleServiceError(w, "handleUpdateEventReviewStage", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Stage updated"})
}

func (h *Handler) handleAddEventRevision(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	var req AddRevisionRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.service.AddEventRevision(r.Context(), id, actorID, req); err != nil {
		handleServiceError(w, "handleAddEventRevision", err)
		return
	}
	response.JSON(w, http.StatusCreated, map[string]string{"message": "Revision added"})
}

func (h *Handler) handleUpdateRevisionStatus(w http.ResponseWriter, r *http.Request) {
	revID, ok := pathIntParam(r, "revId")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Revision ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	var req UpdateRevisionStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON payload")
		return
	}
	if err := h.service.UpdateRevisionStatus(r.Context(), revID, actorID, req.Status); err != nil {
		handleServiceError(w, "handleUpdateRevisionStatus", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Revision status updated successfully"})
}

func (h *Handler) handleListEventRevisions(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a positive integer")
		return
	}
	data, err := h.service.ListEventRevisions(r.Context(), id)
	if err != nil {
		handleServiceError(w, "handleListEventRevisions", err)
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) handleVerifyReviewDocument(w http.ResponseWriter, r *http.Request) {
	docID, ok := pathIntParam(r, "docId")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Document ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	if err := h.service.VerifyReviewDocument(r.Context(), docID, actorID); err != nil {
		handleServiceError(w, "handleVerifyReviewDocument", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Document verified"})
}

func (h *Handler) handleRejectReviewDocument(w http.ResponseWriter, r *http.Request) {
	docID, ok := pathIntParam(r, "docId")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Document ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	var req RejectDocumentRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.service.RejectReviewDocument(r.Context(), docID, actorID, req.Reason); err != nil {
		handleServiceError(w, "handleRejectReviewDocument", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Document rejected"})
}

// ---- Document Queue Handlers ----

func (h *Handler) handleListDocuments(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	filters := DocumentFilters{
		Status:   q.Get("status"),
		Category: q.Get("category"),
		Search:   q.Get("search"),
		Page:     page,
		Limit:    limit,
	}
	data, err := h.service.ListDocuments(r.Context(), filters)
	if err != nil {
		handleServiceError(w, "handleListDocuments", err)
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) handleGetDocument(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Document ID must be a positive integer")
		return
	}
	data, err := h.service.GetDocument(r.Context(), id)
	if err != nil {
		handleServiceError(w, "handleGetDocument", err)
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) handleVerifyDocument(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Document ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	if err := h.service.VerifyDocument(r.Context(), id, actorID); err != nil {
		handleServiceError(w, "handleVerifyDocument", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Document verified"})
}

func (h *Handler) handleRejectDocument(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Document ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	var req RejectDocumentRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.service.RejectDocument(r.Context(), id, actorID, req.Reason); err != nil {
		handleServiceError(w, "handleRejectDocument", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Document rejected"})
}

// ---- Organizer Verification Handlers ----

func (h *Handler) handleListOrganizers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	filters := OrganizerFilters{
		Status: q.Get("status"),
		Search: q.Get("search"),
		Page:   page,
		Limit:  limit,
	}
	data, err := h.service.ListOrganizers(r.Context(), filters)
	if err != nil {
		handleServiceError(w, "handleListOrganizers", err)
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) handleGetOrganizer(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Organizer ID must be a positive integer")
		return
	}
	data, err := h.service.GetOrganizer(r.Context(), id)
	if err != nil {
		handleServiceError(w, "handleGetOrganizer", err)
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) handleApproveOrganizer(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Organizer ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	var req ApproveOrganizerRequest
	if r.ContentLength > 0 {
		if !decodeJSON(w, r, &req) {
			return
		}
	}
	if err := h.service.ApproveOrganizer(r.Context(), id, actorID, req.Notes); err != nil {
		handleServiceError(w, "handleApproveOrganizer", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Organizer application approved"})
}

func (h *Handler) handleRejectOrganizer(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Organizer ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	var req RejectOrganizerRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.service.RejectOrganizer(r.Context(), id, actorID, req.Reason, req.Notes); err != nil {
		handleServiceError(w, "handleRejectOrganizer", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Organizer application rejected"})
}

func (h *Handler) handleUpdateOrganizerStatus(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Organizer ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	var req UpdateOrganizerStatusRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.service.UpdateOrganizerStatus(r.Context(), id, actorID, req); err != nil {
		handleServiceError(w, "handleUpdateOrganizerStatus", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Organizer status updated"})
}

// ---- Payout Verification Handlers ----

func (h *Handler) handleListPayouts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	filters := PayoutFilters{
		Status:    q.Get("status"),
		RiskLevel: q.Get("riskLevel"),
		Search:    q.Get("search"),
		Page:      page,
		Limit:     limit,
	}
	data, err := h.service.ListPayouts(r.Context(), filters)
	if err != nil {
		handleServiceError(w, "handleListPayouts", err)
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) handleGetPayout(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Payout ID must be a positive integer")
		return
	}
	data, err := h.service.GetPayout(r.Context(), id)
	if err != nil {
		handleServiceError(w, "handleGetPayout", err)
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) handleApprovePayout(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Payout ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	var req ApprovePayoutRequest
	if r.ContentLength > 0 {
		if !decodeJSON(w, r, &req) {
			return
		}
	}
	if err := h.service.ApprovePayout(r.Context(), id, actorID, req); err != nil {
		handleServiceError(w, "handleApprovePayout", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Payout approved"})
}

func (h *Handler) handleRejectPayout(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Payout ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	var req RejectPayoutRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.service.RejectPayout(r.Context(), id, actorID, req); err != nil {
		handleServiceError(w, "handleRejectPayout", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Payout rejected"})
}

func (h *Handler) handleHoldPayout(w http.ResponseWriter, r *http.Request) {
	id, ok := pathIntParam(r, "id")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Payout ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	var req HoldPayoutRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.service.HoldPayout(r.Context(), id, actorID, req); err != nil {
		handleServiceError(w, "handleHoldPayout", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Payout put on hold"})
}

// ---- Notification Handlers ----

func (h *Handler) handleListNotifications(w http.ResponseWriter, r *http.Request) {
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}

	notifications, err := h.service.ListNotifications(r.Context(), actorID)
	if err != nil {
		log.Printf("ListNotifications error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load notifications")
		return
	}
	response.JSON(w, http.StatusOK, notifications)
}

func (h *Handler) handleMarkNotificationsRead(w http.ResponseWriter, r *http.Request) {
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}

	var req MarkNotificationsReadRequest
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse request")
			return
		}
	}

	err := h.service.MarkNotificationsRead(r.Context(), actorID, req.NotificationIDs)
	if err != nil {
		log.Printf("MarkNotificationsRead error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to mark notifications read")
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Notifications updated successfully"})
}


// ---- Per-event documents ----

func (h *Handler) handleVerifyEventDocument(w http.ResponseWriter, r *http.Request) {
	docID, ok := pathIntParam(r, "docId")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Document ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	if err := h.service.VerifyEventDocument(r.Context(), docID, actorID); err != nil {
		handleServiceError(w, "handleVerifyEventDocument", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Document verified"})
}

func (h *Handler) handleRejectEventDocument(w http.ResponseWriter, r *http.Request) {
	docID, ok := pathIntParam(r, "docId")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Document ID must be a positive integer")
		return
	}
	actorID, ok := h.actorID(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	var req RejectDocumentRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.service.RejectEventDocument(r.Context(), docID, actorID, req.Reason); err != nil {
		handleServiceError(w, "handleRejectEventDocument", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Document rejected"})
}

// handleGetDocumentViewURL mints a short-lived signed link for one document.
// `source` disambiguates which table the id belongs to.
func (h *Handler) handleGetDocumentViewURL(w http.ResponseWriter, r *http.Request) {
	docID, ok := pathIntParam(r, "docId")
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Document ID must be a positive integer")
		return
	}

	source := r.URL.Query().Get("source")
	if source == "" {
		source = DocSourceOrganizer // pre-existing callers only ever meant account docs
	}

	link, err := h.service.GetDocumentViewURL(r.Context(), source, docID)
	if err != nil {
		handleServiceError(w, "handleGetDocumentViewURL", err)
		return
	}

	// A live credential must never be cached by a proxy or the browser.
	w.Header().Set("Cache-Control", "no-store")
	response.JSON(w, http.StatusOK, link)
}
