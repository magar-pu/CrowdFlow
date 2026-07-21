package organizer

import (
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
	mux.Handle("PATCH /api/organizer/events/{id}/publish", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handlePublishEvent)))))
	mux.Handle("DELETE /api/organizer/events/{id}", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleDeleteEvent)))))
	mux.Handle("GET /api/organizer/events/{id}/venue", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleGetVenueLayout)))))
	mux.Handle("POST /api/organizer/events/{id}/venue", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleCreateVenueSection)))))
	mux.Handle("PUT /api/organizer/events/{id}/venue/{secId}", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleUpdateVenueSection)))))
	mux.Handle("DELETE /api/organizer/events/{id}/venue/{secId}", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleDeleteVenueSection)))))
	mux.Handle("POST /api/organizer/events/{id}/checkin", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleCheckInAttendee)))))
	mux.Handle("GET /api/organizer/events/{id}/analytics", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleGetEventAnalytics)))))
	mux.Handle("GET /api/organizer/events/{id}/revisions", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleGetEventRevisions)))))
	mux.Handle("POST /api/organizer/events/{id}/revisions/{revId}/respond", authenticate(verifiedOrganizer(requireEventOwnership(http.HandlerFunc(h.handleRespondEventRevision)))))

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
	mux.Handle("GET /api/organizer/finance", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleGetFinanceSummary))))
	mux.Handle("GET /api/organizer/payouts", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleListPayouts))))
	mux.Handle("POST /api/organizer/payout-request", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleCreatePayoutRequest))))
	
	// Analytics
	mux.Handle("GET /api/organizer/analytics", authenticate(verifiedOrganizer(http.HandlerFunc(h.handleGetAnalytics))))
}

func (h *Handler) handleApply(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 15<<20)
	err := r.ParseMultipartForm(15 << 20)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse multipart form: Payload too large or malformed")
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

	docTypes := []string{"ktp", "npwp", "nib", "siup", "business_license", "venue_agreement", "event_proposal"}
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
	r.Body = http.MaxBytesReader(w, r.Body, 15<<20)
	err := r.ParseMultipartForm(15 << 20)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse multipart form: Payload too large or malformed")
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

	docTypes := []string{"ktp", "npwp", "nib", "siup", "business_license", "venue_agreement", "event_proposal"}
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

	events, err := h.service.ListOrganizerEvents(r.Context(), userID)
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
		if errors.Is(err, ErrSeatingIncomplete) {
			response.Error(w, http.StatusUnprocessableEntity, "SEATING_INCOMPLETE", err.Error())
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
		log.Printf("DeleteOrganizerEvent error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete event")
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Event deleted successfully"})
}

func (h *Handler) handleGetVenueLayout(w http.ResponseWriter, r *http.Request) {
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

	sections, err := h.service.GetVenueLayout(r.Context(), eventID, userID)
	if err != nil {
		log.Printf("GetVenueLayout error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load venue layout")
		return
	}
	response.JSON(w, http.StatusOK, sections)
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

func (h *Handler) handleCreateVenueSection(w http.ResponseWriter, r *http.Request) {
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

	var req VenueSection
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse layout payload: "+err.Error())
		return
	}

	err = h.service.CreateVenueSection(r.Context(), eventID, userID, &req)
	if err != nil {
		log.Printf("CreateVenueSection error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create venue section: "+err.Error())
		return
	}
	response.JSON(w, http.StatusCreated, map[string]string{"message": "Venue section layout created successfully"})
}

func (h *Handler) handleUpdateVenueSection(w http.ResponseWriter, r *http.Request) {
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

	sectionID, err := strconv.Atoi(r.PathValue("secId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Section ID must be a valid integer")
		return
	}

	var req VenueSection
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse layout payload: "+err.Error())
		return
	}

	err = h.service.UpdateVenueSection(r.Context(), eventID, userID, sectionID, &req)
	if err != nil {
		log.Printf("UpdateVenueSection error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update venue section: "+err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Venue section layout updated successfully"})
}

func (h *Handler) handleDeleteVenueSection(w http.ResponseWriter, r *http.Request) {
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

	sectionID, err := strconv.Atoi(r.PathValue("secId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Section ID must be a valid integer")
		return
	}

	err = h.service.DeleteVenueSection(r.Context(), eventID, userID, sectionID)
	if err != nil {
		log.Printf("DeleteVenueSection error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete venue section: "+err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Venue section layout deleted successfully"})
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
		log.Printf("RespondToEventRevision error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to submit revision response: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Revision response submitted successfully"})
}
