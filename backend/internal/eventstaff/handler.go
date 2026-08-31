package eventstaff

import (
	"database/sql"
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

// RegisterRoutes mounts the organizer-facing ticketman staff CRUD, nested
// under the same /api/organizer/events/{id}/ prefix and guard chain as the
// rest of the organizer console (authenticate -> verified Event Organizer ->
// requireEventOwnership).
func (h *Handler) RegisterRoutes(
	mux *http.ServeMux,
	authenticate func(http.Handler) http.Handler,
	requirePlatformRole func(allowedRoles ...string) func(http.Handler) http.Handler,
	requireEventOwnership func(http.Handler) http.Handler,
) {
	verifiedOrganizer := requirePlatformRole("Event Organizer")
	guard := func(f http.HandlerFunc) http.Handler {
		return authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(f))))
	}

	mux.Handle("GET /api/organizer/events/{id}/staff", guard(h.handleList))
	mux.Handle("POST /api/organizer/events/{id}/staff", guard(h.handleCreate))
	mux.Handle("GET /api/organizer/events/{id}/staff/{staffId}", guard(h.handleGet))
	mux.Handle("PUT /api/organizer/events/{id}/staff/{staffId}/grants", guard(h.handleUpdateGrants))
	mux.Handle("PUT /api/organizer/events/{id}/staff/{staffId}/status", guard(h.handleUpdateStatus))
	mux.Handle("PUT /api/organizer/events/{id}/staff/{staffId}/validity", guard(h.handleUpdateValidity))
	mux.Handle("POST /api/organizer/events/{id}/staff/{staffId}/reset-credentials", guard(h.handleResetCredentials))
	mux.Handle("DELETE /api/organizer/events/{id}/staff/{staffId}", guard(h.handleDelete))
}

func pathInt(r *http.Request, name string) (int, error) {
	return strconv.Atoi(r.PathValue(name))
}

func (h *Handler) handleList(w http.ResponseWriter, r *http.Request) {
	eventID, err := pathInt(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}

	staffList, err := h.service.List(eventID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, staffList)
}

func (h *Handler) handleCreate(w http.ResponseWriter, r *http.Request) {
	eventID, err := pathInt(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}

	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}
	organizerID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier")
		return
	}

	var req CreateStaffRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	result, err := h.service.Create(eventID, organizerID, &req)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, result)
}

func (h *Handler) handleGet(w http.ResponseWriter, r *http.Request) {
	eventID, err := pathInt(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}
	staffID, err := pathInt(r, "staffId")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid staff ID")
		return
	}

	staff, err := h.service.Get(staffID, eventID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Staff account not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, staff)
}

func (h *Handler) handleUpdateGrants(w http.ResponseWriter, r *http.Request) {
	eventID, err := pathInt(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}
	staffID, err := pathInt(r, "staffId")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid staff ID")
		return
	}

	var req UpdateGrantsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if err := h.service.UpdateGrants(staffID, eventID, &req); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Staff account not found")
			return
		}
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Grants updated"})
}

func (h *Handler) handleUpdateStatus(w http.ResponseWriter, r *http.Request) {
	eventID, err := pathInt(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}
	staffID, err := pathInt(r, "staffId")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid staff ID")
		return
	}

	var req UpdateStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if err := h.service.SetStatus(staffID, eventID, req.Status); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Staff account not found")
			return
		}
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Status updated"})
}

func (h *Handler) handleUpdateValidity(w http.ResponseWriter, r *http.Request) {
	eventID, err := pathInt(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}
	staffID, err := pathInt(r, "staffId")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid staff ID")
		return
	}

	var req UpdateValidityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if err := h.service.UpdateValidity(staffID, eventID, &req); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Staff account not found")
			return
		}
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Validity window updated"})
}

func (h *Handler) handleResetCredentials(w http.ResponseWriter, r *http.Request) {
	eventID, err := pathInt(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}
	staffID, err := pathInt(r, "staffId")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid staff ID")
		return
	}

	result, err := h.service.ResetCredentials(staffID, eventID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Staff account not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, result)
}

func (h *Handler) handleDelete(w http.ResponseWriter, r *http.Request) {
	eventID, err := pathInt(r, "id")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}
	staffID, err := pathInt(r, "staffId")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid staff ID")
		return
	}

	if err := h.service.Delete(staffID, eventID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Staff account not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Staff account deleted"})
}
