package organizer

import (
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"

	"crowdflow-backend/internal/middleware"
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
	requireEventOwnership func(http.Handler) http.Handler,
) {
	// Organizer Application Onboarding routes (authenticated users applying to become organizers)
	mux.Handle("POST /api/organizer/apply", authenticate(http.HandlerFunc(h.handleApply)))
	mux.Handle("GET /api/organizer/application", authenticate(http.HandlerFunc(h.handleGetApplication)))
	mux.Handle("PUT /api/organizer/application", authenticate(http.HandlerFunc(h.handleUpdateApplication)))
	mux.Handle("DELETE /api/organizer/application", authenticate(http.HandlerFunc(h.handleDeleteApplication)))

	// Account-level documents (KTP/NPWP/NIB/SIUP...), distinct from the
	// per-event documents mounted under /events/{id}/documents. Authenticated
	// but NOT behind verifiedOrganizer: an applicant whose documents were
	// rejected has no verified role yet and is exactly who needs to re-file.
	mux.Handle("GET /api/organizer/documents", authenticate(http.HandlerFunc(h.handleListAccountDocuments)))
	mux.Handle("POST /api/organizer/documents", authenticate(http.HandlerFunc(h.handleUploadAccountDocument)))
	mux.Handle("GET /api/organizer/documents/{docId}/url", authenticate(http.HandlerFunc(h.handleGetAccountDocumentURL)))

	// Guard for verified organizers
	verifiedOrganizer := requirePlatformRole("Event Organizer")

	// eorganizer Dashboard & Panel routes
	mux.Handle("GET /api/organizer/dashboard", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleDashboard))))
	mux.Handle("GET /api/notifications", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleListNotifications))))
	mux.Handle("PUT /api/notifications/read", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleMarkNotificationsRead))))
	mux.Handle("GET /api/organizer/events", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleListEvents))))
	mux.Handle("POST /api/organizer/events", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleCreateEvent))))

	// Event specific endpoints with ownership check
	mux.Handle("GET /api/organizer/events/{id}", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleGetEvent)))))
	mux.Handle("PUT /api/organizer/events/{id}", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleUpdateEvent)))))
	mux.Handle("PUT /api/organizer/events/{id}/venue", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleSetEventVenue)))))
	mux.Handle("POST /api/organizer/events/{id}/cover", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleUploadEventCover)))))
	mux.Handle("POST /api/organizer/events/{id}/withdraw", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleWithdrawEvent)))))
	// "listing" rather than "publish": PATCH .../publish above already means
	// "submit to the auditor". These two control the PUBLIC listing.
	mux.Handle("POST /api/organizer/events/{id}/listing", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleListEventPublicly)))))
	mux.Handle("DELETE /api/organizer/events/{id}/listing", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleUnlistEvent)))))
	mux.Handle("POST /api/organizer/events/{id}/archive", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleArchiveEvent)))))
	mux.Handle("DELETE /api/organizer/events/{id}/archive", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleUnarchiveEvent)))))
	mux.Handle("PATCH /api/organizer/events/{id}/publish", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handlePublishEvent)))))
	mux.Handle("DELETE /api/organizer/events/{id}", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleDeleteEvent)))))
	mux.Handle("POST /api/organizer/events/{id}/checkin", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleCheckInAttendee)))))
	mux.Handle("GET /api/organizer/events/{id}/analytics", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleGetEventAnalytics)))))
	mux.Handle("GET /api/organizer/events/{id}/checkin-stats", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleGetEventCheckInStats)))))
	mux.Handle("GET /api/organizer/events/{id}/orders", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleListEventOrders)))))
	mux.Handle("GET /api/organizer/events/{id}/revisions", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleGetEventRevisions)))))
	mux.Handle("POST /api/organizer/events/{id}/revisions/{revId}/respond", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleRespondEventRevision)))))

	// Per-event document submissions
	mux.Handle("GET /api/organizer/events/{id}/documents", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleListEventDocuments)))))
	mux.Handle("POST /api/organizer/events/{id}/documents", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleUploadEventDocument)))))
	mux.Handle("GET /api/organizer/events/{id}/documents/{docId}/url", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleGetEventDocumentURL)))))
	mux.Handle("DELETE /api/organizer/events/{id}/documents/{docId}", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleDeleteEventDocument)))))

	// Ticket Tiers Management
	mux.Handle("GET /api/organizer/events/{id}/ticket-tiers", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleListTicketTiers)))))
	mux.Handle("POST /api/organizer/events/{id}/ticket-tiers", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleCreateTicketTier)))))
	mux.Handle("PUT /api/organizer/events/{id}/ticket-tiers/{tierId}", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleUpdateTicketTier)))))
	mux.Handle("DELETE /api/organizer/events/{id}/ticket-tiers/{tierId}", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleDeleteTicketTier)))))

	// Seat overlay (bind a layout's sections to tiers; seed the seat matrix)
	mux.Handle("GET /api/organizer/events/{id}/seating", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleGetSeating)))))
	mux.Handle("PUT /api/organizer/events/{id}/seating", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleSeedSeating)))))

	// Orders & Refunds
	mux.Handle("GET /api/organizer/orders", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleListOrders))))
	mux.Handle("GET /api/organizer/orders/{id}", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleGetOrderDetails))))
	mux.Handle("GET /api/organizer/refunds", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleListRefunds))))

	// Attendees
	mux.Handle("GET /api/organizer/attendees", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleListAttendees))))
	mux.Handle("GET /api/organizer/events/{id}/attendees", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleListEventAttendees)))))

	// Finance & Payouts
	// Payout details are organizer-level, so they sit outside the per-event
	// routes even though the publish gate for each event depends on them.
	mux.Handle("GET /api/organizer/payout-details", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleGetPayoutDetails))))
	mux.Handle("PUT /api/organizer/payout-details", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleUpdatePayoutDetails))))
	mux.Handle("GET /api/organizer/finance", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleGetFinanceSummary))))
	mux.Handle("GET /api/organizer/payouts", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleListPayouts))))
	mux.Handle("POST /api/organizer/payout-request", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleCreatePayoutRequest))))

	// Analytics
	mux.Handle("GET /api/organizer/analytics", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleGetAnalytics))))
}

// userID pulls the caller's id from the JWT claims, writing the 401 itself so
// each handler is a single early return. The existing handlers inline this;
// three more copies was not worth it.
func (h *Handler) userID(w http.ResponseWriter, r *http.Request) (int, bool) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return 0, false
	}
	id, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in token claims")
		return 0, false
	}
	return id, true
}

func (h *Handler) handleListAccountDocuments(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.userID(w, r)
	if !ok {
		return
	}
	docs, err := h.service.ListAccountDocuments(r.Context(), userID)
	if err != nil {
		log.Printf("handleListAccountDocuments: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load documents")
		return
	}
	response.JSON(w, http.StatusOK, docs)
}

func (h *Handler) handleUploadAccountDocument(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadRequestBytes)
	if err := r.ParseMultipartForm(maxUploadRequestBytes); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse upload: the document is too large or the form is malformed")
		return
	}
	userID, ok := h.userID(w, r)
	if !ok {
		return
	}

	docType := r.FormValue("document_type")
	if docType == "" {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", "document_type is required")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", "A file is required")
		return
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to read the uploaded file")
		return
	}

	doc, err := h.service.UploadAccountDocument(r.Context(), userID, &DocumentUpload{
		Type:     docType,
		Filename: header.Filename,
		Content:  content,
	})
	if err != nil {
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		if errors.Is(err, ErrApplicationNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "No organizer application on file")
			return
		}
		log.Printf("handleUploadAccountDocument: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to upload the document")
		return
	}
	response.JSON(w, http.StatusOK, doc)
}

func (h *Handler) handleGetAccountDocumentURL(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.userID(w, r)
	if !ok {
		return
	}
	docID, err := strconv.Atoi(r.PathValue("docId"))
	if err != nil || docID <= 0 {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Document ID must be a positive integer")
		return
	}
	url, err := h.service.GetAccountDocumentURL(r.Context(), userID, docID)
	if err != nil {
		if errors.Is(err, ErrDocumentNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Document not found")
			return
		}
		log.Printf("handleGetAccountDocumentURL: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate a link")
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"url": url})
}

func (h *Handler) handleApply(w http.ResponseWriter, r *http.Request) {
	// 12MB for the whole request, matching the event-document and cover paths
	// (and nginx's client_max_body_size). Note this is the COMBINED size of
	// every document in the request; each individual file is capped at 10MB by
	// the service, which reports which document was too big.
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadRequestBytes)
	err := r.ParseMultipartForm(maxUploadRequestBytes)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse upload: the documents are too large (12MB total) or the form is malformed")
		return
	}

	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in token claims")
		return
	}

	req := ApplyRequest{
		BusinessName:      r.FormValue("business_name"),
		BusinessType:      r.FormValue("business_type"),
		BusinessEmail:     r.FormValue("business_email"),
		BusinessPhone:     r.FormValue("business_phone"),
		Website:           r.FormValue("website"),
		Description:       r.FormValue("description"),
		BankName:          r.FormValue("bank_name"),
		BankAccountHolder: r.FormValue("bank_account_holder"),
		BankAccountNumber: r.FormValue("bank_account_number"),
		BusinessAddress:   r.FormValue("business_address"),
	}

	docTypes := []string{"ktp", "npwp", "nib", "siup", "business_license"}
	var uploads []*DocumentUpload

	for _, t := range docTypes {
		file, header, err := r.FormFile(t)
		if err == nil {
			defer file.Close()
			content, err := io.ReadAll(file)
			if err != nil {
				response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to read file for "+t)
				return
			}
			uploads = append(uploads, &DocumentUpload{
				Type:     strings.ToUpper(t),
				Filename: header.Filename,
				Content:  content,
			})
		} else if err != http.ErrMissingFile {
			response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Error parsing field "+t+": "+err.Error())
			return
		}
	}

	app, err := h.service.Apply(r.Context(), userID, req, uploads)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		if errors.Is(err, ErrApplicationAlreadyExists) {
			response.Error(w, http.StatusConflict, "APPLICATION_EXISTS", err.Error())
			return
		}
		log.Printf("Apply error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to submit organizer application")
		return
	}

	response.JSON(w, http.StatusCreated, MapApplication(app))
}

func (h *Handler) handleGetApplication(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in token claims")
		return
	}

	app, err := h.service.GetApplication(r.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrApplicationNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "No organizer application found for this user")
			return
		}
		log.Printf("GetApplication error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to retrieve organizer application")
		return
	}

	response.JSON(w, http.StatusOK, MapApplication(app))
}

func (h *Handler) handleUpdateApplication(w http.ResponseWriter, r *http.Request) {
	// 12MB for the whole request, matching the event-document and cover paths
	// (and nginx's client_max_body_size). Note this is the COMBINED size of
	// every document in the request; each individual file is capped at 10MB by
	// the service, which reports which document was too big.
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadRequestBytes)
	err := r.ParseMultipartForm(maxUploadRequestBytes)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse upload: the documents are too large (12MB total) or the form is malformed")
		return
	}

	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in token claims")
		return
	}

	req := ApplyRequest{
		BusinessName:      r.FormValue("business_name"),
		BusinessType:      r.FormValue("business_type"),
		BusinessEmail:     r.FormValue("business_email"),
		BusinessPhone:     r.FormValue("business_phone"),
		Website:           r.FormValue("website"),
		Description:       r.FormValue("description"),
		BankName:          r.FormValue("bank_name"),
		BankAccountHolder: r.FormValue("bank_account_holder"),
		BankAccountNumber: r.FormValue("bank_account_number"),
		BusinessAddress:   r.FormValue("business_address"),
	}

	docTypes := []string{"ktp", "npwp", "nib", "siup", "business_license"}
	var uploads []*DocumentUpload

	for _, t := range docTypes {
		file, header, err := r.FormFile(t)
		if err == nil {
			defer file.Close()
			content, err := io.ReadAll(file)
			if err != nil {
				response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to read file for "+t)
				return
			}
			uploads = append(uploads, &DocumentUpload{
				Type:     strings.ToUpper(t),
				Filename: header.Filename,
				Content:  content,
			})
		} else if err != http.ErrMissingFile {
			response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Error parsing field "+t+": "+err.Error())
			return
		}
	}

	app, err := h.service.UpdateApplication(r.Context(), userID, req, uploads)
	if err != nil {
		if errors.Is(err, ErrApplicationNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "No organizer application found to update")
			return
		}
		if errors.Is(err, ErrApplicationLocked) {
			response.Error(w, http.StatusConflict, "APPLICATION_LOCKED", err.Error())
			return
		}
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		log.Printf("UpdateApplication error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update organizer application")
		return
	}

	response.JSON(w, http.StatusOK, MapApplication(app))
}

func (h *Handler) handleDeleteApplication(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in token claims")
		return
	}

	err = h.service.DeleteApplication(r.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrApplicationNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "No organizer application found to delete")
			return
		}
		if errors.Is(err, ErrApplicationLocked) {
			response.Error(w, http.StatusConflict, "APPLICATION_LOCKED", err.Error())
			return
		}
		log.Printf("DeleteApplication error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete organizer application")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Organizer application cancelled and deleted successfully",
	})
}

// ============================================================================
// eorganizer Dashboard & Action handlers
// ============================================================================

func (h *Handler) handleDashboard(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	data, err := h.service.GetDashboardData(r.Context(), userID)
	if err != nil {
		log.Printf("GetDashboardData error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load dashboard data")
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) handleListEvents(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	// ?archived=true switches the list to the archive view. Anything else,
	// including a malformed value, means the active list.
	archived := r.URL.Query().Get("archived") == "true"

	events, err := h.service.ListOrganizerEvents(r.Context(), userID, archived)
	if err != nil {
		log.Printf("ListOrganizerEvents error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list events")
		return
	}
	response.JSON(w, http.StatusOK, events)
}

func (h *Handler) handleGetEvent(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	event, err := h.service.GetOrganizerEvent(r.Context(), eventID, userID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "Event not found or unauthorized")
		return
	}
	response.JSON(w, http.StatusOK, event)
}

func (h *Handler) handleCreateEvent(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	var event OrganizerEvent
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request payload")
		return
	}

	err = h.service.CreateOrganizerEvent(r.Context(), userID, &event)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		log.Printf("CreateOrganizerEvent error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create organizer event: "+err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, event)
}

func (h *Handler) handleUpdateEvent(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	var event OrganizerEvent
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request payload")
		return
	}

	err = h.service.UpdateOrganizerEvent(r.Context(), eventID, userID, &event)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		log.Printf("UpdateOrganizerEvent error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update event: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Event updated successfully"})
}

// handleSetEventVenue is the workspace's Venue tab. The creation wizard captures
// only the event's identity and schedule, so this is where an event first gets a
// venue — either an existing one (venueId) or one created inline (newVenue).
func (h *Handler) handleSetEventVenue(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	var event OrganizerEvent
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request payload")
		return
	}

	err = h.service.SetEventVenue(r.Context(), eventID, userID, &event)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		log.Printf("SetEventVenue error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to set event venue: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Event venue updated successfully"})
}

// handleUploadEventCover replaces the event's cover art. Multipart, one file
// under "file", mirroring the Documents tab's upload shape.
func (h *Handler) handleUploadEventCover(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	// 12MB reader leaves headroom over the service's 10MB file cap for
	// multipart framing.
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadRequestBytes)
	if err := r.ParseMultipartForm(maxUploadRequestBytes); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse upload: file too large or malformed")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "A file is required under the 'file' field")
		return
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to read uploaded file")
		return
	}

	url, err := h.service.UploadEventCover(r.Context(), eventID, userID, &CoverImageUpload{
		Filename: header.Filename,
		Content:  content,
	})
	if err != nil {
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		log.Printf("UploadEventCover error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to upload cover image")
		return
	}

	response.JSON(w, http.StatusOK, CoverImageResponse{ImageURL: url})
}

func (h *Handler) handlePublishEvent(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	err = h.service.PublishOrganizerEvent(r.Context(), eventID, userID)
	if err != nil {
		if errors.Is(err, ErrVenueRequired) {
			response.Error(w, http.StatusUnprocessableEntity, "VENUE_REQUIRED", err.Error())
			return
		}
		if errors.Is(err, ErrSeatingIncomplete) {
			response.Error(w, http.StatusUnprocessableEntity, "SEATING_INCOMPLETE", err.Error())
			return
		}
		if errors.Is(err, ErrDocumentsIncomplete) {
			response.Error(w, http.StatusUnprocessableEntity, "DOCUMENTS_INCOMPLETE", err.Error())
			return
		}
		if errors.Is(err, ErrPayoutDetailsRequired) {
			response.Error(w, http.StatusUnprocessableEntity, "PAYOUT_DETAILS_REQUIRED", err.Error())
			return
		}
		log.Printf("PublishOrganizerEvent error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to publish event: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Event submitted for review successfully"})
}

func (h *Handler) handleDeleteEvent(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	err = h.service.DeleteOrganizerEvent(r.Context(), eventID, userID)
	if err != nil {
		// Not an internal error: the event exists and is owned by the caller
		// (requireEventOwnership passed), it simply is not a draft any more.
		if errors.Is(err, ErrNotDraft) {
			response.Error(w, http.StatusUnprocessableEntity, "NOT_DRAFT",
				"Only a draft event can be deleted. Withdraw it from review first, or archive it.")
			return
		}
		log.Printf("DeleteOrganizerEvent error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete event")
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Event deleted successfully"})
}

// handleWithdrawEvent pulls an event back out of the auditor queue to draft.
func (h *Handler) handleWithdrawEvent(w http.ResponseWriter, r *http.Request) {
	userID, eventID, ok := h.eventActor(w, r)
	if !ok {
		return
	}

	if err := h.service.WithdrawEventFromReview(r.Context(), eventID, userID); err != nil {
		switch {
		case errors.Is(err, ErrEventNotFound):
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Event not found")
		case errors.Is(err, ErrNotUnderReview):
			response.Error(w, http.StatusUnprocessableEntity, "NOT_UNDER_REVIEW",
				"Only an event awaiting review can be withdrawn.")
		case errors.Is(err, ErrReviewInProgress):
			response.Error(w, http.StatusConflict, "REVIEW_IN_PROGRESS",
				"An auditor has already started reviewing this event, so it can no longer be withdrawn.")
		default:
			log.Printf("WithdrawEventFromReview error: %v", err)
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to withdraw event")
		}
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Event withdrawn from review and returned to draft"})
}

func (h *Handler) handleListEventPublicly(w http.ResponseWriter, r *http.Request) {
	h.setEventListed(w, r, true)
}

func (h *Handler) handleUnlistEvent(w http.ResponseWriter, r *http.Request) {
	h.setEventListed(w, r, false)
}

// setEventListed is the organizer's go-live switch for an approved event.
func (h *Handler) setEventListed(w http.ResponseWriter, r *http.Request, listed bool) {
	userID, eventID, ok := h.eventActor(w, r)
	if !ok {
		return
	}

	if err := h.service.SetEventListed(r.Context(), eventID, userID, listed); err != nil {
		switch {
		case errors.Is(err, ErrEventNotFound):
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Event not found")
		case errors.Is(err, ErrNotApproved):
			response.Error(w, http.StatusUnprocessableEntity, "NOT_APPROVED",
				"This event has not been approved by an auditor yet, so it cannot be published.")
		case errors.Is(err, ErrEventArchived):
			response.Error(w, http.StatusUnprocessableEntity, "EVENT_ARCHIVED",
				"Restore this event from the archive before publishing it.")
		default:
			log.Printf("SetEventListed error: %v", err)
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update event listing")
		}
		return
	}

	msg := "Event is now live for ticket buyers"
	if !listed {
		msg = "Event withdrawn from public listing. New ticket sales are stopped; tickets already sold remain valid."
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": msg})
}

func (h *Handler) handleArchiveEvent(w http.ResponseWriter, r *http.Request) {
	h.setEventArchived(w, r, true)
}

func (h *Handler) handleUnarchiveEvent(w http.ResponseWriter, r *http.Request) {
	h.setEventArchived(w, r, false)
}

func (h *Handler) setEventArchived(w http.ResponseWriter, r *http.Request, archived bool) {
	userID, eventID, ok := h.eventActor(w, r)
	if !ok {
		return
	}

	if err := h.service.SetEventArchived(r.Context(), eventID, userID, archived); err != nil {
		switch {
		case errors.Is(err, ErrEventNotFound):
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Event not found")
		case errors.Is(err, ErrCannotArchive):
			response.Error(w, http.StatusUnprocessableEntity, "CANNOT_ARCHIVE",
				"Only a draft or rejected event can be archived. Withdraw it from review first.")
		default:
			log.Printf("SetEventArchived error: %v", err)
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update event archive state")
		}
		return
	}

	msg := "Event archived"
	if !archived {
		msg = "Event restored"
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": msg})
}

// eventActor pulls the caller's user id and the {id} path value, writing the
// error response itself when either is unusable. Every per-event handler
// repeated these twenty lines.
func (h *Handler) eventActor(w http.ResponseWriter, r *http.Request) (userID int, eventID int, ok bool) {
	claims, found := middleware.GetClaims(r.Context())
	if !found {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return 0, 0, false
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return 0, 0, false
	}
	eventID, err = strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return 0, 0, false
	}
	return userID, eventID, true
}

func (h *Handler) handleListTicketTiers(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	tiers, err := h.service.ListTicketTiers(r.Context(), eventID, userID)
	if err != nil {
		log.Printf("ListTicketTiers error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load ticket tiers")
		return
	}
	response.JSON(w, http.StatusOK, tiers)
}

func (h *Handler) handleCreateTicketTier(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	var tier OrganizerTicketTier
	if err := json.NewDecoder(r.Body).Decode(&tier); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request payload")
		return
	}

	err = h.service.CreateTicketTier(r.Context(), eventID, userID, &tier)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		log.Printf("CreateTicketTier error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create ticket tier")
		return
	}

	response.JSON(w, http.StatusCreated, map[string]string{"message": "Ticket tier created successfully"})
}

func (h *Handler) handleUpdateTicketTier(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	tierID, err := strconv.Atoi(r.PathValue("tierId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_TIER_ID", "Ticket tier ID must be a valid integer")
		return
	}

	var tier OrganizerTicketTier
	if err := json.NewDecoder(r.Body).Decode(&tier); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request payload")
		return
	}

	err = h.service.UpdateTicketTier(r.Context(), eventID, userID, tierID, &tier)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		log.Printf("UpdateTicketTier error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update ticket tier")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Ticket tier updated successfully"})
}

func (h *Handler) handleDeleteTicketTier(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	tierID, err := strconv.Atoi(r.PathValue("tierId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_TIER_ID", "Ticket tier ID must be a valid integer")
		return
	}

	err = h.service.DeleteTicketTier(r.Context(), eventID, userID, tierID)
	if err != nil {
		log.Printf("DeleteTicketTier error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete ticket tier or tier has tickets sold")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Ticket tier deleted successfully"})
}

func (h *Handler) handleListEventOrders(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	orders, err := h.service.ListEventOrders(r.Context(), eventID, userID)
	if err != nil {
		log.Printf("ListEventOrders error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load orders for event")
		return
	}
	response.JSON(w, http.StatusOK, orders)
}

func (h *Handler) handleGetEventCheckInStats(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	stats, err := h.service.GetEventCheckInStats(r.Context(), eventID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, http.StatusNotFound, "EVENT_NOT_FOUND", "Event not found")
			return
		}
		log.Printf("GetEventCheckInStats error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load check-in statistics")
		return
	}
	response.JSON(w, http.StatusOK, stats)
}

func (h *Handler) handleListOrders(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	orders, err := h.service.ListOrders(r.Context(), userID)
	if err != nil {
		log.Printf("ListOrders error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load orders")
		return
	}
	response.JSON(w, http.StatusOK, orders)
}

func (h *Handler) handleGetOrderDetails(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	orderID := r.PathValue("id")
	if orderID == "" {
		response.Error(w, http.StatusBadRequest, "INVALID_ORDER_ID", "Order ID parameter is required")
		return
	}

	order, err := h.service.GetOrderDetails(r.Context(), orderID, userID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "Order not found or unauthorized")
		return
	}
	response.JSON(w, http.StatusOK, order)
}

func (h *Handler) handleListRefunds(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	refunds, err := h.service.ListRefunds(r.Context(), userID)
	if err != nil {
		log.Printf("ListRefunds error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load refunds")
		return
	}
	response.JSON(w, http.StatusOK, refunds)
}

func (h *Handler) handleListAttendees(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	attendees, err := h.service.ListAttendees(r.Context(), userID)
	if err != nil {
		log.Printf("ListAttendees error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load attendees")
		return
	}
	response.JSON(w, http.StatusOK, attendees)
}

func (h *Handler) handleListEventAttendees(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	attendees, err := h.service.ListEventAttendees(r.Context(), eventID, userID)
	if err != nil {
		log.Printf("ListEventAttendees error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load attendees for event")
		return
	}
	response.JSON(w, http.StatusOK, attendees)
}

func (h *Handler) handleGetFinanceSummary(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	finance, err := h.service.GetFinanceSummary(r.Context(), userID)
	if err != nil {
		log.Printf("GetFinanceSummary error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load finance summary")
		return
	}
	response.JSON(w, http.StatusOK, finance)
}

func (h *Handler) handleListPayouts(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	payouts, err := h.service.ListPayouts(r.Context(), userID)
	if err != nil {
		log.Printf("ListPayouts error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load payouts")
		return
	}
	response.JSON(w, http.StatusOK, payouts)
}

func (h *Handler) handleGetPayoutDetails(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	details, err := h.service.GetPayoutDetails(r.Context(), userID)
	if err != nil {
		log.Printf("GetPayoutDetails error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load payout details")
		return
	}
	response.JSON(w, http.StatusOK, details)
}

func (h *Handler) handleUpdatePayoutDetails(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	var req UpdatePayoutDetailsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse request")
		return
	}

	details, err := h.service.UpdatePayoutDetails(r.Context(), userID, req)
	if err != nil {
		// 409, not 422: the payload may be perfectly valid and still be refused
		// because the account is committed to an event under review.
		if errors.Is(err, ErrPayoutDetailsLocked) {
			response.Error(w, http.StatusConflict, "PAYOUT_DETAILS_LOCKED", err.Error())
			return
		}
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", err.Error())
			return
		}
		log.Printf("UpdatePayoutDetails error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save payout details")
		return
	}
	response.JSON(w, http.StatusOK, details)
}

func (h *Handler) handleCreatePayoutRequest(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	var req struct {
		EventID int     `json:"eventId"`
		Amount  float64 `json:"amount"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request payload")
		return
	}

	err = h.service.CreatePayoutRequest(r.Context(), req.EventID, userID, req.Amount)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		log.Printf("CreatePayoutRequest error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to submit payout request: "+err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, map[string]string{"message": "Payout request submitted successfully"})
}

func (h *Handler) handleGetAnalytics(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	dateRange := r.URL.Query().Get("range")
	if dateRange == "" {
		dateRange = "30d"
	}

	analytics, err := h.service.GetAnalytics(r.Context(), userID, dateRange)
	if err != nil {
		log.Printf("GetAnalytics error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load analytics")
		return
	}
	response.JSON(w, http.StatusOK, analytics)
}

func (h *Handler) handleGetEventAnalytics(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	dateRange := r.URL.Query().Get("range")
	if dateRange == "" {
		dateRange = "30d"
	}

	analytics, err := h.service.GetEventAnalytics(r.Context(), eventID, userID, dateRange)
	if err != nil {
		log.Printf("GetEventAnalytics error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load event analytics: "+err.Error())
		return
	}
	response.JSON(w, http.StatusOK, analytics)
}

func (h *Handler) handleCheckInAttendee(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	var req CheckInRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse scan payload: "+err.Error())
		return
	}

	res, err := h.service.CheckInAttendee(r.Context(), eventID, userID, req.QrToken)
	if err != nil {
		log.Printf("CheckInAttendee error: %v", err)
		response.Error(w, http.StatusConflict, "CHECKIN_FAILED", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, res)
}

func (h *Handler) handleListNotifications(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	notifications, err := h.service.ListNotifications(r.Context(), userID)
	if err != nil {
		log.Printf("ListNotifications error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load notifications: "+err.Error())
		return
	}
	response.JSON(w, http.StatusOK, notifications)
}

func (h *Handler) handleMarkNotificationsRead(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	var req MarkReadRequest
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse request: "+err.Error())
			return
		}
	}

	err = h.service.MarkNotificationsRead(r.Context(), userID, req.NotificationIDs)
	if err != nil {
		log.Printf("MarkNotificationsRead error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to mark notifications read: "+err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Notifications updated successfully"})
}

func (h *Handler) handleGetEventRevisions(w http.ResponseWriter, r *http.Request) {
	eventIDStr := r.PathValue("id")
	eventID, err := strconv.Atoi(eventIDStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	feedback, err := h.service.GetEventRevisions(r.Context(), eventID, userID)
	if err != nil {
		log.Printf("GetEventRevisions error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch event revisions: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, feedback)
}

func (h *Handler) handleRespondEventRevision(w http.ResponseWriter, r *http.Request) {
	eventIDStr := r.PathValue("id")
	eventID, err := strconv.Atoi(eventIDStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}
	revIDStr := r.PathValue("revId")
	revID, err := strconv.Atoi(revIDStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid revision ID")
		return
	}
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	var req RespondRevisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON body: "+err.Error())
		return
	}

	if err := h.service.RespondToEventRevision(r.Context(), eventID, revID, userID, req); err != nil {
		// A missing explanation, or a point already sent to the auditor, is the
		// organizer's mistake to correct — not a server fault.
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		log.Printf("RespondToEventRevision error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to submit revision response: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Revision response submitted successfully"})
}

// ============================================================================
// Per-event documents
// ============================================================================

func (h *Handler) handleListEventDocuments(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	docs, err := h.service.ListEventDocuments(r.Context(), eventID)
	if err != nil {
		log.Printf("ListEventDocuments error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load event documents")
		return
	}

	response.JSON(w, http.StatusOK, docs)
}

func (h *Handler) handleUploadEventDocument(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in claims")
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	// One document per request, keyed by its type. The 12MB reader leaves headroom
	// over the service's 10MB file cap for multipart framing.
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadRequestBytes)
	if err := r.ParseMultipartForm(maxUploadRequestBytes); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse upload: file too large or malformed")
		return
	}

	docType := r.FormValue("document_type")
	if docType == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "document_type is required")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "A file is required under the 'file' field")
		return
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to read uploaded file")
		return
	}

	doc, err := h.service.UploadEventDocument(r.Context(), eventID, userID, &EventDocumentUpload{
		Type:     docType,
		Filename: header.Filename,
		Content:  content,
	})
	if err != nil {
		if errors.Is(err, ErrValidation) {
			response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
			return
		}
		log.Printf("UploadEventDocument error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to upload document")
		return
	}

	response.JSON(w, http.StatusCreated, doc)
}

// handleGetEventDocumentURL mints a short-lived link for ONE document. Kept off
// the list endpoint deliberately: presigned URLs are bearer credentials, so one
// is created only when a specific file is explicitly opened.
func (h *Handler) handleGetEventDocumentURL(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}
	docID, err := strconv.Atoi(r.PathValue("docId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Document ID must be a valid integer")
		return
	}

	link, err := h.service.GetEventDocumentURL(r.Context(), eventID, docID)
	if err != nil {
		if errors.Is(err, ErrDocumentNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Document not found for this event")
			return
		}
		log.Printf("GetEventDocumentURL error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate a view link")
		return
	}

	// A live credential must never be cached by a proxy or the browser.
	w.Header().Set("Cache-Control", "no-store")
	response.JSON(w, http.StatusOK, link)
}

func (h *Handler) handleDeleteEventDocument(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}
	docID, err := strconv.Atoi(r.PathValue("docId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Document ID must be a valid integer")
		return
	}

	if err := h.service.DeleteEventDocument(r.Context(), eventID, docID); err != nil {
		if errors.Is(err, ErrDocumentNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Document not found for this event")
			return
		}
		log.Printf("DeleteEventDocument error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete document")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Document deleted successfully"})
}
