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

// Pagination constants — change these to tune page size behaviour globally.
const (
	defaultLimit = 20  // default page size when no limit param is given
	limitStep    = 10  // all limits and offsets are snapped to multiples of this
	maxLimit     = 100 // absolute ceiling — no single request can fetch more than this
)

// snapLimit rounds l up to the nearest multiple of limitStep, then caps at maxLimit.
// Examples: 7→10, 11→20, 99→100, 101→100, 0→defaultLimit.
func snapLimit(l int) int {
	if l <= 0 {
		return defaultLimit
	}
	snapped := ((l + limitStep - 1) / limitStep) * limitStep
	if snapped > maxLimit {
		return maxLimit
	}
	return snapped
}

// snapOffset floors o to the nearest multiple of limitStep so offsets always
// align to page boundaries. Negative values are clamped to 0.
// Examples: 0→0, 5→0, 10→10, 15→10, 25→20.
func snapOffset(o int) int {
	if o < 0 {
		return 0
	}
	return (o / limitStep) * limitStep
}

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
	optionalAuthenticate func(http.Handler) http.Handler,
	requirePlatformRole func(allowedRoles ...string) func(http.Handler) http.Handler,
	requireEventRole func(roleName string) func(http.Handler) http.Handler,
) {
	mux.Handle("GET /api/events", optionalAuthenticate(http.HandlerFunc(h.handleListEvents)))
	mux.Handle("GET /api/events/{id}", optionalAuthenticate(http.HandlerFunc(h.handleGetEvent)))
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

	limit := defaultLimit
	offset := 0

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = snapLimit(l)
		}
		// Non-integer string leaves limit at defaultLimit
	}
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil {
			offset = snapOffset(o)
		}
		// Non-integer string leaves offset at 0
	}

	events, err := h.service.ListEvents(limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	res := make([]*EventListResponse, len(events))
	for i, e := range events {
		res[i] = MapEventToList(e)
	}
	response.JSON(w, http.StatusOK, res)
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

	// If event is not approved, authorize the request (only organizer or Super Admin can view)
	if evt.Status != "approved" {
		claims, ok := middleware.GetClaims(r.Context())
		if !ok {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Event not found or not approved")
			return
		}

		callerID, err := strconv.Atoi(claims.UserID)
		if err != nil {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Event not found or not approved")
			return
		}

		isSuperAdmin := false
		for _, role := range claims.Roles {
			if role == "Super Admin" {
				isSuperAdmin = true
				break
			}
		}

		if !isSuperAdmin && evt.OrganizerID != callerID {
			// Return 404, not 403: returning 403 would leak that the event ID
			// exists in the database, enabling enumeration of draft/hidden events.
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Event not found")
			return
		}
	}

	response.JSON(w, http.StatusOK, MapEventToDetail(evt))
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

	var req CreateEventRequest
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

	// Construct domain model from request DTO
	eventModel := &Event{
		VenueID:                       req.VenueID,
		OrganizerID:                   req.OrganizerID,
		EventName:                     req.EventName,
		Description:                   req.Description,
		EventStart:                    req.EventStart,
		EventEnd:                      req.EventEnd,
		EntertainmentTaxRate:          req.EntertainmentTaxRate,
		EntertainmentTaxPassedToBuyer: req.EntertainmentTaxPassedToBuyer,
		EventTypeID:                   req.EventTypeID,
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
		eventModel.CoverImageURL = h.storage.GetPublicURL(objectKey)
	} else if err != http.ErrMissingFile {
		// FormFile returned a non-nil error other than "missing file"
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Error reading cover_image field: "+err.Error())
		return
	}

	// 5. Save Event details to database
	if err := h.service.CreateEvent(eventModel); err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, MapEventToDetail(eventModel))
}


