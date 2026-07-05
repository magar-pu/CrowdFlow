package event

import (
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"crowdflow-backend/internal/middleware"
	"crowdflow-backend/internal/response"
	"crowdflow-backend/internal/storage"
)

type Handler struct {
	service Service
	storage *storage.S3Storage
}

func NewHandler(service Service, storage *storage.S3Storage) *Handler {
	return &Handler{service: service, storage: storage}
}

func (h *Handler) RegisterRoutes(
	mux *http.ServeMux,
	authenticate func(http.Handler) http.Handler,
	requirePlatformRole func(allowedRoles ...string) func(http.Handler) http.Handler,
	requireEventRole func(roleName string) func(http.Handler) http.Handler,
) {
	mux.HandleFunc("GET /api/events", h.handleListEvents)
	mux.HandleFunc("GET /api/events/{id}", h.handleGetEvent)
	mux.Handle("POST /api/events", authenticate(requirePlatformRole("Event Organizer")(http.HandlerFunc(h.handleCreateEvent))))
	mux.Handle("PATCH /api/events/{id}/publish", authenticate(requireEventRole("Event Organizer")(http.HandlerFunc(h.handlePublishEvent))))
}

func (h *Handler) handlePublishEvent(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	if idStr == "" {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID path parameter is required")
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	if err := h.service.PublishEvent(id); err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"message":  "Event published successfully",
		"event_id": id,
	})
}

func (h *Handler) handleListEvents(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 20
	offset := 0

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	events, err := h.service.ListEvents(limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, events)
}

func (h *Handler) handleGetEvent(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	if idStr == "" {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID path parameter is required")
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
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
	// 1. Enforce strict request body size limit to prevent DoS attacks
	r.Body = http.MaxBytesReader(w, r.Body, 10 << 20) // 10MB limit

	// 2. Parse Multipart Form
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse multipart form: Payload too large or malformed")
		return
	}

	// 3. Decode Event Metadata JSON string from form field
	eventDataJSON := r.FormValue("event_data")
	if eventDataJSON == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Missing event_data form field")
		return
	}

	var req Event
	if err := json.Unmarshal([]byte(eventDataJSON), &req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event_data JSON: "+err.Error())
		return
	}

	// Enforce organizer validation / prevent BOLA/impersonation attacks
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}

	callerID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in token claims")
		return
	}

	isSuperAdmin := false
	for _, role := range claims.Roles {
		if role == "Super Admin" {
			isSuperAdmin = true
			break
		}
	}

	if !isSuperAdmin {
		req.OrganizerID = callerID
	} else if req.OrganizerID <= 0 {
		req.OrganizerID = callerID
	}

	// 4. Process Cover Image file upload if present
	file, header, err := r.FormFile("cover_image")
	if err == nil {
		defer file.Close()

		// Validate file type via secure mime signature sniffing and enforce size limit
		contentType, err := storage.ValidateImage(file, 10 << 20)
		if err != nil {
			response.Error(w, http.StatusBadRequest, "INVALID_FILE", "Cover image validation failed: "+err.Error())
			return
		}

		// Generate unique storage key
		ext := filepath.Ext(header.Filename)
		objectKey := fmt.Sprintf("events/covers/%d%s", time.Now().UnixNano(), ext)

		// Upload file to storage
		if err := h.storage.UploadFile(r.Context(), objectKey, file, contentType); err != nil {
			response.Error(w, http.StatusInternalServerError, "UPLOAD_FAILED", "Failed to upload cover image: "+err.Error())
			return
		}

		// Assign resolved URL to event model
		req.CoverImageURL = h.storage.GetPublicURL(objectKey)
	} else if err != http.ErrMissingFile {
		// FormFile returned a non-nil error other than "missing file"
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Error reading cover_image field: "+err.Error())
		return
	}

	// 5. Save Event details to database
	if err := h.service.CreateEvent(&req); err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, req)
}


