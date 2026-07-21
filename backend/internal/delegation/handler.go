package delegation

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

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
) {
	// All co-organizer delegation routes require a verified Event Organizer (D1:
	// both owner and delegate are organizers). Super Admin bypasses inside the guard.
	verifiedOrganizer := requirePlatformRole("Event Organizer")
	guard := func(fn http.HandlerFunc) http.Handler {
		return authenticate(verifiedOrganizer(fn))
	}

	// Owner-driven (D3).
	mux.Handle("GET /api/organizer/delegations", guard(h.handleListForOwner))
	mux.Handle("POST /api/organizer/delegations", guard(h.handleInvite))
	// More specific literal routes are matched ahead of the {id} patterns by ServeMux.
	mux.Handle("GET /api/organizer/delegations/received", guard(h.handleListForDelegate))
	mux.Handle("POST /api/organizer/delegations/request", guard(h.handleRequestAccess))
	mux.Handle("PUT /api/organizer/delegations/{id}", guard(h.handleEditScope))
	mux.Handle("DELETE /api/organizer/delegations/{id}", guard(h.handleRevoke))
	mux.Handle("POST /api/organizer/delegations/{id}/approve", guard(h.handleApprove))
	mux.Handle("POST /api/organizer/delegations/{id}/decline", guard(h.handleDecline))
}

// RegisterAdminRoutes mounts Super Admin oversight routes on the admin
// sub-router (paths are relative to /api/v1/admin). The caller supplies the
// authenticate + Super Admin guard.
func (h *Handler) RegisterAdminRoutes(mux *http.ServeMux, guard func(http.HandlerFunc) http.Handler) {
	mux.Handle("GET /users/{id}/delegations", guard(h.handleAdminListForUser))
	mux.Handle("DELETE /delegations/{id}", guard(h.handleAdminRevoke))
}

func (h *Handler) handleAdminListForUser(w http.ResponseWriter, r *http.Request) {
	targetID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "User ID must be an integer")
		return
	}
	owned, received, err := h.service.ListForUser(r.Context(), targetID)
	if err != nil {
		writeErr(w, "list user delegations", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string][]delegationDTO{
		"owned":    mapDelegations(owned),
		"received": mapDelegations(received),
	})
}

func (h *Handler) handleAdminRevoke(w http.ResponseWriter, r *http.Request) {
	actorID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	if err := h.service.AdminRevoke(r.Context(), id, actorID); err != nil {
		writeErr(w, "revoke delegation", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]bool{"revoked": true})
}

func (h *Handler) handleListForOwner(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	ds, err := h.service.ListForOwner(r.Context(), userID)
	if err != nil {
		writeErr(w, "list delegations (owner)", err)
		return
	}
	response.JSON(w, http.StatusOK, mapDelegations(ds))
}

func (h *Handler) handleListForDelegate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	ds, err := h.service.ListForDelegate(r.Context(), userID)
	if err != nil {
		writeErr(w, "list delegations (delegate)", err)
		return
	}
	response.JSON(w, http.StatusOK, mapDelegations(ds))
}

func (h *Handler) handleInvite(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var req InviteRequest
	if !decode(w, r, &req) {
		return
	}
	d, err := h.service.Invite(r.Context(), userID, req)
	if err != nil {
		writeErr(w, "invite co-organizer", err)
		return
	}
	response.JSON(w, http.StatusCreated, mapDelegation(d))
}

func (h *Handler) handleRequestAccess(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var req RequestAccessRequest
	if !decode(w, r, &req) {
		return
	}
	d, err := h.service.RequestAccess(r.Context(), userID, req)
	if err != nil {
		writeErr(w, "request delegation", err)
		return
	}
	response.JSON(w, http.StatusCreated, mapDelegation(d))
}

func (h *Handler) handleEditScope(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var req ScopeRequest
	if !decode(w, r, &req) {
		return
	}
	d, err := h.service.EditScope(r.Context(), userID, id, req)
	if err != nil {
		writeErr(w, "edit delegation scope", err)
		return
	}
	response.JSON(w, http.StatusOK, mapDelegation(d))
}

func (h *Handler) handleApprove(w http.ResponseWriter, r *http.Request) {
	h.decide(w, r, h.service.Approve, "approve delegation")
}

func (h *Handler) handleDecline(w http.ResponseWriter, r *http.Request) {
	h.decide(w, r, h.service.Decline, "decline delegation")
}

// decide wraps the owner approve/decline handlers (identical plumbing).
func (h *Handler) decide(w http.ResponseWriter, r *http.Request, action func(context.Context, int, int) (*Delegation, error), label string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	d, err := action(r.Context(), userID, id)
	if err != nil {
		writeErr(w, label, err)
		return
	}
	response.JSON(w, http.StatusOK, mapDelegation(d))
}

func (h *Handler) handleRevoke(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	if err := h.service.Revoke(r.Context(), userID, id); err != nil {
		writeErr(w, "revoke delegation", err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]bool{"revoked": true})
}

// ---- shared plumbing ----

func requireUserID(w http.ResponseWriter, r *http.Request) (int, bool) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return 0, false
	}
	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in token claims")
		return 0, false
	}
	return userID, true
}

func pathID(w http.ResponseWriter, r *http.Request) (int, bool) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Delegation ID must be an integer")
		return 0, false
	}
	return id, true
}

func decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid or malformed JSON body")
		return false
	}
	return true
}

func writeErr(w http.ResponseWriter, label string, err error) {
	switch {
	case errors.Is(err, ErrValidation):
		response.Error(w, http.StatusUnprocessableEntity, "VALIDATION_FAILED", err.Error())
	case errors.Is(err, ErrEventNotOwned):
		response.Error(w, http.StatusUnprocessableEntity, "EVENT_NOT_OWNED", err.Error())
	case errors.Is(err, ErrSelfDelegation):
		response.Error(w, http.StatusUnprocessableEntity, "SELF_DELEGATION", err.Error())
	case errors.Is(err, ErrNotOrganizer):
		response.Error(w, http.StatusUnprocessableEntity, "NOT_VERIFIED_ORGANIZER", err.Error())
	case errors.Is(err, ErrSoDConflict):
		response.Error(w, http.StatusUnprocessableEntity, "SEPARATION_OF_DUTIES", err.Error())
	case errors.Is(err, ErrUserNotFound):
		response.Error(w, http.StatusNotFound, "USER_NOT_FOUND", err.Error())
	case errors.Is(err, ErrNotFound):
		response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
	case errors.Is(err, ErrForbidden):
		response.Error(w, http.StatusForbidden, "FORBIDDEN", err.Error())
	case errors.Is(err, ErrInvalidState):
		response.Error(w, http.StatusConflict, "INVALID_STATE", err.Error())
	case errors.Is(err, ErrConflict):
		response.Error(w, http.StatusConflict, "CONFLICT", err.Error())
	default:
		log.Printf("delegation %s error: %v", label, err)
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to "+label)
	}
}

// ---- DTO mapping ----

type eventDTO struct {
	EventID int    `json:"event_id"`
	Name    string `json:"name"`
}

type delegationDTO struct {
	ID            int        `json:"id"`
	OwnerID       int        `json:"owner_id"`
	OwnerName     string     `json:"owner_name"`
	OwnerEmail    string     `json:"owner_email"`
	DelegateID    int        `json:"delegate_id"`
	DelegateName  string     `json:"delegate_name"`
	DelegateEmail string     `json:"delegate_email"`
	Scope         string     `json:"scope"`
	Status        string     `json:"status"`
	RequestedBy   int        `json:"requested_by"`
	ApprovedBy    *int       `json:"approved_by,omitempty"`
	Note          *string    `json:"note,omitempty"`
	Events        []eventDTO `json:"events"`
	CreatedAt     time.Time  `json:"created_at"`
	DecidedAt     *time.Time `json:"decided_at,omitempty"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

func mapDelegation(d *Delegation) delegationDTO {
	events := make([]eventDTO, 0, len(d.Events))
	for _, e := range d.Events {
		events = append(events, eventDTO{EventID: e.EventID, Name: e.Name})
	}
	return delegationDTO{
		ID:            d.ID,
		OwnerID:       d.OwnerID,
		OwnerName:     d.OwnerName,
		OwnerEmail:    d.OwnerEmail,
		DelegateID:    d.DelegateID,
		DelegateName:  d.DelegateName,
		DelegateEmail: d.DelegateEmail,
		Scope:         d.Scope,
		Status:        d.Status,
		RequestedBy:   d.RequestedBy,
		ApprovedBy:    d.ApprovedBy,
		Note:          d.Note,
		Events:        events,
		CreatedAt:     d.CreatedAt,
		DecidedAt:     d.DecidedAt,
		UpdatedAt:     d.UpdatedAt,
	}
}

func mapDelegations(ds []*Delegation) []delegationDTO {
	out := make([]delegationDTO, 0, len(ds))
	for _, d := range ds {
		out = append(out, mapDelegation(d))
	}
	return out
}
