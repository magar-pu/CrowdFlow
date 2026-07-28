package booking

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

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
) {
	mux.Handle("GET /events/{id}/ticket-tiers", http.HandlerFunc(h.handleListTicketTiers))
	mux.Handle("GET /events/{id}/seatmap", http.HandlerFunc(h.handleGetSeatMap))
	mux.Handle("POST /booking/holds", authenticate(http.HandlerFunc(h.handleCreateHold)))
	mux.Handle("GET /booking/holds/{token}", authenticate(http.HandlerFunc(h.handleGetHold)))
	mux.Handle("DELETE /booking/holds/{token}", authenticate(http.HandlerFunc(h.handleReleaseHold)))
}

func (h *Handler) handleListTicketTiers(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	tiers, err := h.service.ListTicketTiers(eventID)
	if err != nil {
		if errors.Is(err, ErrEventNotOnSale) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Event not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load ticket tiers")
		return
	}
	response.JSON(w, http.StatusOK, tiers)
}

func (h *Handler) handleGetSeatMap(w http.ResponseWriter, r *http.Request) {
	eventID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_ID", "Event ID must be a valid integer")
		return
	}

	seatMap, err := h.service.GetSeatMap(eventID)
	if err != nil {
		if errors.Is(err, ErrEventNotOnSale) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Event not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load seat map")
		return
	}
	response.JSON(w, http.StatusOK, seatMap)
}

func (h *Handler) handleCreateHold(w http.ResponseWriter, r *http.Request) {
	var req HoldRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body")
		return
	}

	hold, err := h.service.CreateHold(req)
	if err != nil {
		log.Printf("Failed to create hold: %v", err)
		response.Error(w, http.StatusConflict, "HOLD_FAILED", "Failed to process hold request")
		return
	}
	response.JSON(w, http.StatusCreated, hold)
}

// handleGetHold lets checkout rebuild the buyer's cart from the hold token,
// with prices read from the database rather than the query string.
func (h *Handler) handleGetHold(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	if token == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Hold token is required")
		return
	}

	detail, err := h.service.GetHold(token)
	if err != nil {
		// An expired hold is the ordinary case here, not a fault: the seats are
		// already back on the map by the time this is hit.
		log.Printf("GetHold failed for token: %v", err)
		response.Error(w, http.StatusNotFound, "HOLD_EXPIRED", "This seat hold has expired. Please pick your seats again.")
		return
	}
	response.JSON(w, http.StatusOK, detail)
}

func (h *Handler) handleReleaseHold(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	if token == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Hold token is required")
		return
	}

	if err := h.service.ReleaseHold(token); err != nil {
		log.Printf("Failed to release hold: %v", err)
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "Failed to release ticket hold")
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Hold released"})
}
