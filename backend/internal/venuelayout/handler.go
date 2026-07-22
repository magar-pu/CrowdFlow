package venuelayout

import (
	"encoding/json"
	"errors"
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

// RegisterRoutes mounts the venue-layout read endpoints. The console is shared
// by organizers and super admins, so both platform roles are allowed; the
// service still scopes event-exclusive layouts to their owner.
func (h *Handler) RegisterRoutes(
	mux *http.ServeMux,
	authenticate func(http.Handler) http.Handler,
	requirePlatformRole func(allowedRoles ...string) func(http.Handler) http.Handler,
) {
	console := func(next http.Handler) http.Handler {
		return authenticate(requirePlatformRole("Event Organizer", "Super Admin")(next))
	}

	mux.Handle("GET /venues/{id}/layouts", console(http.HandlerFunc(h.handleListLayouts)))
	mux.Handle("POST /venues/{id}/layouts", console(http.HandlerFunc(h.handleCreateLayout)))
	mux.Handle("PUT /venues/{id}/layouts/{lid}", console(http.HandlerFunc(h.handleSaveLayout)))
	mux.Handle("GET /layouts/{id}", console(http.HandlerFunc(h.handleGetLayout)))
}

// writeServiceError maps venuelayout service errors to HTTP responses. Sentinel
// errors carry an HTTP-meaningful status; validation and in-use errors surface
// their specific message, everything else is a generic 500.
func writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "Venue layout not found")
	case errors.Is(err, ErrForbidden):
		response.Error(w, http.StatusForbidden, "FORBIDDEN", "You do not have access to this venue layout")
	case errors.Is(err, ErrStale):
		response.Error(w, http.StatusConflict, "STALE_LAYOUT", "This layout changed since you loaded it; reload and try again")
	case errors.Is(err, ErrSeatInUse):
		response.Error(w, http.StatusConflict, "SEAT_IN_USE", err.Error())
	case errors.Is(err, ErrInvalidInput):
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
	default:
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save venue layout")
	}
}

func (h *Handler) handleCreateLayout(w http.ResponseWriter, r *http.Request) {
	venueID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Venue ID must be a valid integer")
		return
	}

	userID, ok := userIDFrom(w, r)
	if !ok {
		return
	}

	var req CreateLayoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body")
		return
	}

	layout, err := h.service.CreateLayout(r.Context(), venueID, userID, req)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, layout)
}

func (h *Handler) handleSaveLayout(w http.ResponseWriter, r *http.Request) {
	venueID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Venue ID must be a valid integer")
		return
	}
	layoutID, err := strconv.Atoi(r.PathValue("lid"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Layout ID must be a valid integer")
		return
	}

	userID, ok := userIDFrom(w, r)
	if !ok {
		return
	}

	var req SaveLayoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body")
		return
	}

	result, err := h.service.SaveLayout(r.Context(), venueID, layoutID, userID, req)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}

// userIDFrom extracts the authenticated user's integer ID from the request
// context, writing an error response and returning ok=false on failure.
func userIDFrom(w http.ResponseWriter, r *http.Request) (int, bool) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return 0, false
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identity")
		return 0, false
	}
	return userID, true
}

func (h *Handler) handleListLayouts(w http.ResponseWriter, r *http.Request) {
	venueID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Venue ID must be a valid integer")
		return
	}

	userID, ok := userIDFrom(w, r)
	if !ok {
		return
	}

	layouts, err := h.service.ListLayouts(r.Context(), venueID, userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load venue layouts")
		return
	}
	response.JSON(w, http.StatusOK, layouts)
}

func (h *Handler) handleGetLayout(w http.ResponseWriter, r *http.Request) {
	layoutID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Layout ID must be a valid integer")
		return
	}

	userID, ok := userIDFrom(w, r)
	if !ok {
		return
	}

	layout, err := h.service.GetLayout(r.Context(), layoutID, userID)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Venue layout not found")
		case errors.Is(err, ErrForbidden):
			response.Error(w, http.StatusForbidden, "FORBIDDEN", "You do not have access to this venue layout")
		default:
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load venue layout")
		}
		return
	}
	response.JSON(w, http.StatusOK, layout)
}
