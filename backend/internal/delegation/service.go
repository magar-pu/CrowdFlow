package delegation

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type DelegationService struct {
	repo Repository
}

func NewDelegationService(repo Repository) *DelegationService {
	return &DelegationService{repo: repo}
}

// Invite: an owner grants a co-organizer access. Auto-active (the owner is the
// approver). D1: the delegate must already be a verified Event Organizer.
func (s *DelegationService) Invite(ctx context.Context, ownerID int, req InviteRequest) (*Delegation, error) {
	delegateID, err := s.resolveUser(ctx, req.DelegateID, req.DelegateEmail)
	if err != nil {
		return nil, err
	}
	if delegateID == ownerID {
		return nil, ErrSelfDelegation
	}
	if err := s.validateScope(ctx, ownerID, req.Scope, req.EventIDs); err != nil {
		return nil, err
	}
	if err := s.checkSoD(ctx, delegateID, ownerID, req.Scope, req.EventIDs); err != nil {
		return nil, err
	}

	// D1 — require verified organizer.
	isOrg, err := s.repo.IsVerifiedOrganizer(ctx, delegateID)
	if err != nil {
		return nil, err
	}
	if !isOrg {
		return nil, ErrNotOrganizer
	}

	// Block clobbering an in-flight relationship; a fresh pending/active pair
	// should be approved, not re-invited.
	if existing, err := s.repo.GetByOwnerAndDelegate(ctx, ownerID, delegateID); err == nil {
		switch existing.Status {
		case StatusActive:
			return nil, fmt.Errorf("%w: this co-organizer is already active", ErrConflict)
		case StatusPending:
			return nil, fmt.Errorf("%w: a request is already pending your approval", ErrConflict)
		}
	} else if err != ErrNotFound {
		return nil, err
	}

	now := time.Now()
	d := &Delegation{
		OwnerID:     ownerID,
		DelegateID:  delegateID,
		Scope:       req.Scope,
		Status:      StatusActive,
		RequestedBy: ownerID,
		ApprovedBy:  &ownerID,
		DecidedAt:   &now,
		Note:        optionalText(req.Note),
	}
	id, err := s.repo.Upsert(ctx, d, req.EventIDs)
	if err != nil {
		return nil, err
	}

	_ = s.repo.Notify(ctx, delegateID,
		"Added as Co-Organizer",
		"You can now manage the events delegated to you.", id)

	return s.repo.GetByID(ctx, id)
}

// RequestAccess: a delegate asks an owner for access. Stored as pending until the
// owner approves (D2 — owner approval always required).
func (s *DelegationService) RequestAccess(ctx context.Context, delegateID int, req RequestAccessRequest) (*Delegation, error) {
	ownerID, err := s.resolveUser(ctx, req.OwnerID, req.OwnerEmail)
	if err != nil {
		return nil, err
	}
	if ownerID == delegateID {
		return nil, ErrSelfDelegation
	}
	if err := s.validateScope(ctx, ownerID, req.Scope, req.EventIDs); err != nil {
		return nil, err
	}
	if err := s.checkSoD(ctx, delegateID, ownerID, req.Scope, req.EventIDs); err != nil {
		return nil, err
	}

	if existing, err := s.repo.GetByOwnerAndDelegate(ctx, ownerID, delegateID); err == nil {
		switch existing.Status {
		case StatusActive:
			return nil, fmt.Errorf("%w: you already have access to this owner's events", ErrConflict)
		case StatusPending:
			return nil, fmt.Errorf("%w: a request is already pending", ErrConflict)
		}
	} else if err != ErrNotFound {
		return nil, err
	}

	d := &Delegation{
		OwnerID:     ownerID,
		DelegateID:  delegateID,
		Scope:       req.Scope,
		Status:      StatusPending,
		RequestedBy: delegateID,
		Note:        optionalText(req.Note),
	}
	id, err := s.repo.Upsert(ctx, d, req.EventIDs)
	if err != nil {
		return nil, err
	}

	_ = s.repo.Notify(ctx, ownerID,
		"New Co-Organizer Request",
		"An organizer has requested access to manage your events. Review and approve it.", id)

	return s.repo.GetByID(ctx, id)
}

func (s *DelegationService) ListForOwner(ctx context.Context, ownerID int) ([]*Delegation, error) {
	return s.repo.ListByOwner(ctx, ownerID)
}

func (s *DelegationService) ListForDelegate(ctx context.Context, delegateID int) ([]*Delegation, error) {
	return s.repo.ListByDelegate(ctx, delegateID)
}

func (s *DelegationService) EditScope(ctx context.Context, ownerID, delegationID int, req ScopeRequest) (*Delegation, error) {
	d, err := s.ownedDelegation(ctx, ownerID, delegationID)
	if err != nil {
		return nil, err
	}
	if err := s.validateScope(ctx, ownerID, req.Scope, req.EventIDs); err != nil {
		return nil, err
	}
	if err := s.checkSoD(ctx, d.DelegateID, ownerID, req.Scope, req.EventIDs); err != nil {
		return nil, err
	}
	if err := s.repo.UpdateScope(ctx, d.ID, req.Scope, req.EventIDs); err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, d.ID)
}

func (s *DelegationService) Approve(ctx context.Context, ownerID, delegationID int) (*Delegation, error) {
	d, err := s.ownedDelegation(ctx, ownerID, delegationID)
	if err != nil {
		return nil, err
	}
	if d.Status != StatusPending {
		return nil, ErrInvalidState
	}
	if err := s.repo.UpdateStatus(ctx, d.ID, StatusActive, &ownerID); err != nil {
		return nil, err
	}
	_ = s.repo.Notify(ctx, d.DelegateID,
		"Co-Organizer Request Approved",
		"You can now manage the events delegated to you.", d.ID)
	return s.repo.GetByID(ctx, d.ID)
}

func (s *DelegationService) Decline(ctx context.Context, ownerID, delegationID int) (*Delegation, error) {
	d, err := s.ownedDelegation(ctx, ownerID, delegationID)
	if err != nil {
		return nil, err
	}
	if d.Status != StatusPending {
		return nil, ErrInvalidState
	}
	if err := s.repo.UpdateStatus(ctx, d.ID, StatusDeclined, nil); err != nil {
		return nil, err
	}
	_ = s.repo.Notify(ctx, d.DelegateID,
		"Co-Organizer Request Declined",
		"Your co-organizer access request was not approved.", d.ID)
	return s.repo.GetByID(ctx, d.ID)
}

func (s *DelegationService) Revoke(ctx context.Context, ownerID, delegationID int) error {
	d, err := s.ownedDelegation(ctx, ownerID, delegationID)
	if err != nil {
		return err
	}
	if d.Status != StatusActive && d.Status != StatusPending {
		return ErrInvalidState
	}
	if err := s.repo.UpdateStatus(ctx, d.ID, StatusRevoked, nil); err != nil {
		return err
	}
	_ = s.repo.Notify(ctx, d.DelegateID,
		"Co-Organizer Access Revoked",
		"Your access to manage this event has been revoked by the owner.", d.ID)
	return nil
}

// ---- admin oversight ----

// ListForUser returns the delegations a user has granted (as owner) and received
// (as delegate). Read-only oversight for the Super Admin Users panel.
func (s *DelegationService) ListForUser(ctx context.Context, userID int) (owned, received []*Delegation, err error) {
	owned, err = s.repo.ListByOwner(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	received, err = s.repo.ListByDelegate(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	return owned, received, nil
}

// AdminRevoke revokes any delegation for moderation, bypassing the owner check.
// Both the owner and the delegate are notified.
func (s *DelegationService) AdminRevoke(ctx context.Context, delegationID, actorID int) error {
	d, err := s.repo.GetByID(ctx, delegationID)
	if err != nil {
		return err
	}
	if d.Status != StatusActive && d.Status != StatusPending {
		return ErrInvalidState
	}
	if err := s.repo.UpdateStatus(ctx, d.ID, StatusRevoked, nil); err != nil {
		return err
	}
	_ = s.repo.Notify(ctx, d.DelegateID,
		"Co-Organizer Access Revoked",
		"Your co-organizer access has been revoked by an administrator.", d.ID)
	_ = s.repo.Notify(ctx, d.OwnerID,
		"Co-Organizer Delegation Revoked",
		"A co-organizer delegation on your account was revoked by an administrator.", d.ID)
	return nil
}

// ---- helpers ----

// ownedDelegation loads a delegation and asserts the caller is its owner.
func (s *DelegationService) ownedDelegation(ctx context.Context, ownerID, delegationID int) (*Delegation, error) {
	d, err := s.repo.GetByID(ctx, delegationID)
	if err != nil {
		return nil, err
	}
	if d.OwnerID != ownerID {
		return nil, ErrForbidden
	}
	return d, nil
}

// resolveUser accepts an explicit id, otherwise looks the user up by email.
func (s *DelegationService) resolveUser(ctx context.Context, id int, email string) (int, error) {
	if id > 0 {
		exists, err := s.repo.UserExists(ctx, id)
		if err != nil {
			return 0, err
		}
		if !exists {
			return 0, ErrUserNotFound
		}
		return id, nil
	}
	if strings.TrimSpace(email) == "" {
		return 0, fmt.Errorf("%w: a target user id or email is required", ErrValidation)
	}
	return s.repo.FindUserByEmail(ctx, email)
}

// validateScope checks the scope value and, for 'specific', that the listed
// events are non-empty and all owned by the owner.
func (s *DelegationService) validateScope(ctx context.Context, ownerID int, scope string, eventIDs []int) error {
	switch scope {
	case ScopeAll:
		return nil
	case ScopeSpecific:
		if len(eventIDs) == 0 {
			return fmt.Errorf("%w: at least one event is required for a specific-scope delegation", ErrValidation)
		}
		owned, err := s.repo.EventsOwnedBy(ctx, ownerID, eventIDs)
		if err != nil {
			return err
		}
		if !owned {
			return ErrEventNotOwned
		}
		return nil
	default:
		return fmt.Errorf("%w: scope must be 'all' or 'specific'", ErrValidation)
	}
}

// checkSoD blocks a delegation that would let a user co-organize an event they
// audit (separation of duties). Mirrors the admin-side rule that blocks granting
// Auditor to a co-organizer.
func (s *DelegationService) checkSoD(ctx context.Context, delegateID, ownerID int, scope string, eventIDs []int) error {
	audits, err := s.repo.DelegateAuditsCovered(ctx, delegateID, ownerID, scope, eventIDs)
	if err != nil {
		return err
	}
	if audits {
		return ErrSoDConflict
	}
	return nil
}

func optionalText(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}
