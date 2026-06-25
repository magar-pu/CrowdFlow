package event

import (
	"encoding/json"
	"net/http"

	"crowdflow-backend/internal/response"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(
	mux *http.ServeMux,
	authenticate func(http.Handler) http.Handler,
	requirePlatformRole func(allowedRoles ...string) func(http.Handler) http.Handler,
	requireEventRole func(roleName string) func(http.Handler) http.Handler,
) {
	mux.HandleFunc("GET /api/events", h.handleListEvents)
	mux.HandleFunc("GET /api/events/{id}", h.handleGetEvent)

	mux.Handle("POST /api/events", authenticate(requirePlatformRole("Organizer")(http.HandlerFunc(h.handleCreateEvent))))
	mux.Handle("PATCH /api/events/{id}/publish", authenticate(requireEventRole("Organizer")(http.HandlerFunc(h.handlePublishEvent))))
}

func (h *Handler) handlePublishEvent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID path parameter is required")
		return
	}

	if err := h.service.PublishEvent(id); err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"message":  "Event published successfully",
		"event_id": id,
	})
}

func (h *Handler) handleListEvents(w http.ResponseWriter, r *http.Request) {
	events, err := h.service.ListEvents()
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, events)
}

func (h *Handler) handleGetEvent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID path parameter is required")
		return
	}

	evt, err := h.service.GetEventDetails(id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, evt)
}

func (h *Handler) handleCreateEvent(w http.ResponseWriter, r *http.Request) {
	var req Event
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON body")
		return
	}

	if err := h.service.CreateEvent(&req); err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, req)
}
