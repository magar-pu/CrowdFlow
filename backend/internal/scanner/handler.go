package scanner

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"crowdflow-backend/internal/middleware"
	"crowdflow-backend/internal/response"
)

type Handler struct {
	service *ScannerService
}

func NewHandler(db *sql.DB) *Handler {
	repo := NewPostgresRepository(db)
	svc := NewService(repo)
	return &Handler{service: svc}
}

// RegisterRoutes mounts the ticketman-facing scan endpoints behind
// requireTicketman (checkin, reject, dashboard, my scan log — every one of
// them re-checks the caller's own session on every request) and the
// organizer-facing gate CRUD behind the usual organizer console guard chain.
// There is no unauthenticated path left anywhere in this package.
func (h *Handler) RegisterRoutes(
	mux *http.ServeMux,
	requireTicketman func(http.Handler) http.Handler,
	scanRateLimit func(http.Handler) http.Handler,
	authenticate func(http.Handler) http.Handler,
	requirePlatformRole func(allowedRoles ...string) func(http.Handler) http.Handler,
	requireEventOwnership func(http.Handler) http.Handler,
) {
	ticketman := func(f http.HandlerFunc) http.Handler {
		return requireTicketman(scanRateLimit(http.HandlerFunc(f)))
	}

	mux.Handle("POST /api/v1/scanner/checkin/{eventId}", ticketman(h.handleCheckIn))
	mux.Handle("POST /api/v1/scanner/checkin/{eventId}/reject", ticketman(h.handleReject))
	mux.Handle("GET /api/v1/scanner/dashboard/{eventId}", ticketman(h.handleGetDashboard))
	mux.Handle("GET /api/v1/scanner/my-log", requireTicketman(http.HandlerFunc(h.handleMyScanLog)))

	verifiedOrganizer := requirePlatformRole("Event Organizer")
	organizerGuard := func(f http.HandlerFunc) http.Handler {
		return authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(f))))
	}

	mux.Handle("POST /api/scanner/events/{eventId}/gates", organizerGuard(h.handleCreateGate))
	mux.Handle("GET /api/scanner/events/{eventId}/gates", organizerGuard(h.handleListGates))
	mux.Handle("DELETE /api/scanner/events/{eventId}/gates/{gateId}", organizerGuard(h.handleDeleteGate))
}

// requireOwnEvent checks that the {eventId} path segment matches the
// authenticated ticketman's own event_id from RequireTicketman's DB-verified
// claims. Without this, a ticketman could scan or read another event's
// dashboard just by editing the URL — the session proves who they are, this
// proves they are looking at their own event.
func requireOwnEvent(r *http.Request) (eventID int, ok bool) {
	claims, present := middleware.GetTicketmanClaims(r.Context())
	if !present {
		return 0, false
	}
	pathEventID, err := strconv.Atoi(r.PathValue("eventId"))
	if err != nil {
		return 0, false
	}
	return pathEventID, pathEventID == claims.EventID
}

func staffIDFromContext(r *http.Request) (int, bool) {
	claims, ok := middleware.GetTicketmanClaims(r.Context())
	if !ok {
		return 0, false
	}
	id, err := strconv.Atoi(claims.StaffID)
	return id, err == nil
}

// ──────────── Check-In ────────────

func (h *Handler) handleCheckIn(w http.ResponseWriter, r *http.Request) {
	eventID, ok := requireOwnEvent(r)
	if !ok {
		response.Error(w, http.StatusForbidden, "FORBIDDEN", "You are not assigned to this event")
		return
	}
	staffID, ok := staffIDFromContext(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	var req CheckInRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	result, err := h.service.CheckIn(eventID, staffID, &req)
	if err != nil {
		if errors.Is(err, ErrGateRequired) || errors.Is(err, ErrGateNotGranted) {
			response.Error(w, http.StatusForbidden, "FORBIDDEN", err.Error())
			return
		}
		log.Printf("Scanner CheckIn error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Check-in processing failed")
		return
	}

	// Always 200 for a decided outcome (VALID, ALREADY_USED, WRONG_TIER, ...);
	// 401/403 above are reserved for auth failures, per the frozen contract.
	response.JSON(w, http.StatusOK, result)
}

func (h *Handler) handleReject(w http.ResponseWriter, r *http.Request) {
	eventID, ok := requireOwnEvent(r)
	if !ok {
		response.Error(w, http.StatusForbidden, "FORBIDDEN", "You are not assigned to this event")
		return
	}
	staffID, ok := staffIDFromContext(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	var req RejectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if err := h.service.Reject(eventID, staffID, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Rejection recorded"})
}

// ──────────── Dashboard / Own Log ────────────

func (h *Handler) handleGetDashboard(w http.ResponseWriter, r *http.Request) {
	eventID, ok := requireOwnEvent(r)
	if !ok {
		response.Error(w, http.StatusForbidden, "FORBIDDEN", "You are not assigned to this event")
		return
	}

	dashboard, err := h.service.GetDashboard(eventID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, dashboard)
}

func (h *Handler) handleMyScanLog(w http.ResponseWriter, r *http.Request) {
	staffID, ok := staffIDFromContext(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	entries, err := h.service.GetOwnScanLog(staffID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, entries)
}

// ──────────── Gate CRUD ────────────

func (h *Handler) handleCreateGate(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("eventId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}

	var req CreateGateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	gate, err := h.service.CreateGate(eventID, req.Name)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	response.JSON(w, http.StatusCreated, gate)
}

func (h *Handler) handleListGates(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("eventId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}

	gates, err := h.service.ListGates(eventID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, gates)
}

func (h *Handler) handleDeleteGate(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("eventId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}
	gateID, err := strconv.Atoi(r.PathValue("gateId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid gate ID")
		return
	}

	if err := h.service.DeleteGate(gateID, eventID); err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Gate deleted"})
}
