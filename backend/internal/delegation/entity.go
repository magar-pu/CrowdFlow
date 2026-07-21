package delegation

import (
	"context"
	"errors"
	"time"
)

// Sentinel errors. Handlers map these onto HTTP status codes via errors.Is.
var (
	ErrValidation     = errors.New("validation failed")
	ErrNotFound       = errors.New("delegation not found")
	ErrForbidden      = errors.New("you are not permitted to act on this delegation")
	ErrConflict       = errors.New("a delegation already exists for this pair")
	ErrUserNotFound   = errors.New("target user not found")
	ErrNotOrganizer   = errors.New("the delegate must be a verified event organizer")
	ErrInvalidState   = errors.New("delegation is not in a state that allows this action")
	ErrSelfDelegation = errors.New("you cannot delegate to yourself")
	ErrEventNotOwned  = errors.New("one or more events are not owned by you")
)

// Scope values.
const (
	ScopeAll      = "all"      // covers every event where organizer_id = owner_id, incl. future (D5)
	ScopeSpecific = "specific" // covers only the events listed in organizer_delegation_events
)

// Status values (approval lifecycle).
const (
	StatusPending  = "pending"
	StatusActive   = "active"
	StatusDeclined = "declined"
	StatusRevoked  = "revoked"
)

// Delegation is one (owner, delegate) grant plus its approval state.
type Delegation struct {
	ID          int
	OwnerID     int
	DelegateID  int
	Scope       string
	Status      string
	RequestedBy int
	ApprovedBy  *int
	Note        *string
	CreatedAt   time.Time
	DecidedAt   *time.Time
	UpdatedAt   time.Time

	// Enriched from joins (not columns on organizer_delegations).
	OwnerName     string
	OwnerEmail    string
	DelegateName  string
	DelegateEmail string
	Events        []DelegationEvent // populated only for scope='specific'
}

// DelegationEvent is one covered event (scope='specific').
type DelegationEvent struct {
	EventID int
	Name    string
}

// InviteRequest: an owner invites a co-organizer (auto-active).
type InviteRequest struct {
	DelegateID    int    `json:"delegate_id"`
	DelegateEmail string `json:"delegate_email"`
	Scope         string `json:"scope"`
	EventIDs      []int  `json:"event_ids"`
	Note          string `json:"note"`
}

// RequestAccessRequest: a delegate requests access to an owner's events (→ pending).
type RequestAccessRequest struct {
	OwnerID    int    `json:"owner_id"`
	OwnerEmail string `json:"owner_email"`
	Scope      string `json:"scope"`
	EventIDs   []int  `json:"event_ids"`
	Note       string `json:"note"`
}

// ScopeRequest: an owner edits an existing delegation's scope/events.
type ScopeRequest struct {
	Scope    string `json:"scope"`
	EventIDs []int  `json:"event_ids"`
}

// Repository is the persistence contract for delegations.
type Repository interface {
	// Upsert inserts, or reactivates on the UNIQUE(owner_id, delegate_id) conflict,
	// then replaces the covered events for scope='specific'. Returns the stored row id.
	Upsert(ctx context.Context, d *Delegation, eventIDs []int) (int, error)
	GetByID(ctx context.Context, id int) (*Delegation, error)
	GetByOwnerAndDelegate(ctx context.Context, ownerID, delegateID int) (*Delegation, error)
	ListByOwner(ctx context.Context, ownerID int) ([]*Delegation, error)
	ListByDelegate(ctx context.Context, delegateID int) ([]*Delegation, error)
	UpdateStatus(ctx context.Context, id int, status string, approvedBy *int) error
	UpdateScope(ctx context.Context, id int, scope string, eventIDs []int) error

	// Lookups used by validation / D1.
	FindUserByEmail(ctx context.Context, email string) (id int, err error)
	UserExists(ctx context.Context, id int) (bool, error)
	IsVerifiedOrganizer(ctx context.Context, userID int) (bool, error)
	EventsOwnedBy(ctx context.Context, ownerID int, eventIDs []int) (allOwned bool, err error)

	// Notify writes a row into the notifications table (resource_type='delegation').
	Notify(ctx context.Context, userID int, title, detail string, delegationID int) error
}

// Service is the business-logic contract consumed by the HTTP handler.
type Service interface {
	// Owner-driven (D3).
	Invite(ctx context.Context, ownerID int, req InviteRequest) (*Delegation, error)
	ListForOwner(ctx context.Context, ownerID int) ([]*Delegation, error)
	EditScope(ctx context.Context, ownerID, delegationID int, req ScopeRequest) (*Delegation, error)
	Approve(ctx context.Context, ownerID, delegationID int) (*Delegation, error)
	Decline(ctx context.Context, ownerID, delegationID int) (*Delegation, error)
	Revoke(ctx context.Context, ownerID, delegationID int) error

	// Delegate-driven.
	RequestAccess(ctx context.Context, delegateID int, req RequestAccessRequest) (*Delegation, error)
	ListForDelegate(ctx context.Context, delegateID int) ([]*Delegation, error)
}
