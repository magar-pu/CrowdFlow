package scanner

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

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

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	// Public scanner endpoints (no organizer auth required)
	mux.Handle("POST /api/scanner/checkin/{eventId}", http.HandlerFunc(h.handleCheckIn))
	mux.Handle("GET /api/scanner/status/{eventId}", http.HandlerFunc(h.handleGetStatus))
	mux.Handle("GET /api/scanner/dashboard/{eventId}", http.HandlerFunc(h.handleGetDashboard))

	// Scanner event info & verification (for standalone scanner page)
	mux.Handle("GET /api/scanner/event/{eventId}", http.HandlerFunc(h.handleGetEventInfo))
	mux.Handle("POST /api/scanner/verify-device", http.HandlerFunc(h.handleVerifyDevice))

	// Gate management (these will also be callable from organizer context)
	mux.Handle("POST /api/scanner/events/{eventId}/gates", http.HandlerFunc(h.handleCreateGate))
	mux.Handle("GET /api/scanner/events/{eventId}/gates", http.HandlerFunc(h.handleListGates))
	mux.Handle("DELETE /api/scanner/events/{eventId}/gates/{gateId}", http.HandlerFunc(h.handleDeleteGate))

	// Device management
	mux.Handle("POST /api/scanner/events/{eventId}/devices", http.HandlerFunc(h.handleRegisterDevice))
	mux.Handle("GET /api/scanner/events/{eventId}/devices", http.HandlerFunc(h.handleListDevices))
	mux.Handle("DELETE /api/scanner/events/{eventId}/devices/{deviceId}", http.HandlerFunc(h.handleDeleteDevice))
}

// ──────────── Check-In ────────────

func (h *Handler) handleCheckIn(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("eventId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}

	var req CheckInRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	result, err := h.service.CheckIn(eventID, &req)
	if err != nil {
		log.Printf("Scanner CheckIn error: %v", err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Check-in processing failed")
		return
	}

	// Return 200 for all responses (including ALREADY_USED, INVALID, etc.)
	// The frontend uses the `status` field to determine the outcome
	response.JSON(w, http.StatusOK, result)
}

// ──────────── Status ────────────

func (h *Handler) handleGetStatus(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("eventId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}

	status, err := h.service.GetStatus(eventID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, status)
}

// ──────────── Dashboard ────────────

func (h *Handler) handleGetDashboard(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("eventId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}

	dashboard, err := h.service.GetDashboard(eventID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, dashboard)
}

// ──────────── Event Info ────────────

func (h *Handler) handleGetEventInfo(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("eventId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}

	name, err := h.service.repo.GetEventInfo(eventID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "Event not found")
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"eventId":   eventID,
		"eventName": name,
	})
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

	err = h.service.DeleteGate(gateID, eventID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Gate deleted"})
}

// ──────────── Device CRUD ────────────

func (h *Handler) handleRegisterDevice(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("eventId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}

	var req RegisterDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	resp, err := h.service.RegisterDevice(eventID, &req)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, resp)
}

func (h *Handler) handleListDevices(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("eventId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}

	devices, err := h.service.ListDevices(eventID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, devices)
}

func (h *Handler) handleDeleteDevice(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("eventId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid event ID")
		return
	}
	deviceID, err := strconv.Atoi(r.PathValue("deviceId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid device ID")
		return
	}

	err = h.service.DeleteDevice(deviceID, eventID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Device deleted"})
}

func (h *Handler) handleVerifyDevice(w http.ResponseWriter, r *http.Request) {
	var req VerifyDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	result, err := h.service.VerifyDevice(req.Token)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Verification failed")
		return
	}

	if !result.Valid {
		response.JSON(w, http.StatusUnauthorized, result)
		return
	}

	response.JSON(w, http.StatusOK, result)
}
