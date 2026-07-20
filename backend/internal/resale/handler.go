package resale

import (
	"encoding/json"
	"net/http"
	"strconv"

	"crowdflow-backend/internal/middleware"
	"crowdflow-backend/internal/response"
)

// Handler exposes HTTP endpoints for the resale marketplace.
type Handler struct {
	service Service
}

// NewHandler creates a new resale Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes mounts resale marketplace routes onto the given mux.
func (h *Handler) RegisterRoutes(
	mux *http.ServeMux,
	authenticate func(http.Handler) http.Handler,
) {
	// Public routes
	mux.Handle("GET /api/resale/listings", http.HandlerFunc(h.handleListActive))
	mux.Handle("GET /api/resale/listings/{id}", http.HandlerFunc(h.handleGetDetail))

	// Authenticated routes
	mux.Handle("GET /api/resale/my-listings", authenticate(http.HandlerFunc(h.handleMyListings)))
	mux.Handle("POST /api/resale/listings", authenticate(http.HandlerFunc(h.handleCreate)))
	mux.Handle("DELETE /api/resale/listings/{id}", authenticate(http.HandlerFunc(h.handleCancel)))
}

// handleListActive returns all active resale listings (paginated).
// GET /api/resale/listings?limit=20&offset=0
func (h *Handler) handleListActive(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 {
		limit = 20
	}

	listings, err := h.service.ListActiveListings(limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load resale listings")
		return
	}

	// Map domain entities to slim list DTOs
	result := make([]*ResaleListingListResponse, 0, len(listings))
	for _, l := range listings {
		result = append(result, MapToListResponse(l))
	}
	response.JSON(w, http.StatusOK, result)
}

// handleGetDetail returns a single resale listing's full details.
// GET /api/resale/listings/{id}
func (h *Handler) handleGetDetail(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Listing ID is required")
		return
	}

	listing, err := h.service.GetListingDetail(id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, MapToDetailResponse(listing))
}

// handleMyListings returns the authenticated user's own resale listings.
// GET /api/resale/my-listings
func (h *Handler) handleMyListings(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User is not authenticated")
		return
	}

	sellerID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in token")
		return
	}

	listings, err := h.service.GetMyListings(sellerID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load your listings")
		return
	}

	result := make([]*ResaleListingListResponse, 0, len(listings))
	for _, l := range listings {
		result = append(result, MapToListResponse(l))
	}
	response.JSON(w, http.StatusOK, result)
}

// handleCreate creates a new resale listing for the authenticated user.
// POST /api/resale/listings
func (h *Handler) handleCreate(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User is not authenticated")
		return
	}

	sellerID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in token")
		return
	}

	var req CreateListingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request body")
		return
	}

	listing, err := h.service.CreateListing(sellerID, req)
	if err != nil {
		response.Error(w, http.StatusConflict, "LISTING_FAILED", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, listing)
}

// handleCancel cancels an active resale listing owned by the authenticated user.
// DELETE /api/resale/listings/{id}
func (h *Handler) handleCancel(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User is not authenticated")
		return
	}

	sellerID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in token")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Listing ID is required")
		return
	}

	if err := h.service.CancelListing(id, sellerID); err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Listing cancelled"})
}
