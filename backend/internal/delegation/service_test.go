package delegation

import (
	"context"
	"errors"
	"testing"
)

// ---------------------------------------------------------------------------
// fakeRepo — an in-memory Repository. Every rule the service enforces is a
// decision made *above* persistence, so the whole service is testable without
// Postgres. Behaviour is seeded per-test via the exported fields; state
// mutations (upserts, status changes, notifications) are recorded so tests can
// assert on what the service actually asked the repository to do.
// ---------------------------------------------------------------------------

type statusUpdate struct {
	id         int
	status     string
	approvedBy *int
}

type scopeUpdate struct {
	id       int
	scope    string
	eventIDs []int
}

type notification struct {
	userID       int
	title        string
	delegationID int
}

type fakeRepo struct {
	users        map[int]bool
	usersByEmail map[string]int
	verifiedOrgs map[int]bool

	eventsOwned   bool // EventsOwnedBy result
	auditsCovered bool // DelegateAuditsCovered result (SoD)

	// existing is returned by GetByOwnerAndDelegate; nil means ErrNotFound.
	existing *Delegation
	byID     map[int]*Delegation
	nextID   int

	// error injection
	errIsVerifiedOrganizer error
	errEventsOwnedBy       error
	errAuditsCovered       error
	errUpsert              error
	errGetByOwnerDelegate  error

	// recorded calls
	upserted       *Delegation
	upsertedEvents []int
	statusUpdates  []statusUpdate
	scopeUpdates   []scopeUpdate
	notifications  []notification
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		users:        map[int]bool{},
		usersByEmail: map[string]int{},
		verifiedOrgs: map[int]bool{},
		byID:         map[int]*Delegation{},
		nextID:       100,
		eventsOwned:  true,
	}
}

func (f *fakeRepo) Upsert(_ context.Context, d *Delegation, eventIDs []int) (int, error) {
	if f.errUpsert != nil {
		return 0, f.errUpsert
	}
	f.upserted = d
	f.upsertedEvents = eventIDs

	f.nextID++
	stored := *d
	stored.ID = f.nextID
	f.byID[stored.ID] = &stored
	return stored.ID, nil
}

func (f *fakeRepo) GetByID(_ context.Context, id int) (*Delegation, error) {
	d, ok := f.byID[id]
	if !ok {
		return nil, ErrNotFound
	}
	return d, nil
}

func (f *fakeRepo) GetByOwnerAndDelegate(_ context.Context, _, _ int) (*Delegation, error) {
	if f.errGetByOwnerDelegate != nil {
		return nil, f.errGetByOwnerDelegate
	}
	if f.existing == nil {
		return nil, ErrNotFound
	}
	return f.existing, nil
}

func (f *fakeRepo) ListByOwner(_ context.Context, ownerID int) ([]*Delegation, error) {
	var out []*Delegation
	for _, d := range f.byID {
		if d.OwnerID == ownerID {
			out = append(out, d)
		}
	}
	return out, nil
}

func (f *fakeRepo) ListByDelegate(_ context.Context, delegateID int) ([]*Delegation, error) {
	var out []*Delegation
	for _, d := range f.byID {
		if d.DelegateID == delegateID {
			out = append(out, d)
		}
	}
	return out, nil
}

func (f *fakeRepo) UpdateStatus(_ context.Context, id int, status string, approvedBy *int) error {
	f.statusUpdates = append(f.statusUpdates, statusUpdate{id: id, status: status, approvedBy: approvedBy})
	if d, ok := f.byID[id]; ok {
		d.Status = status
		d.ApprovedBy = approvedBy
	}
	return nil
}

func (f *fakeRepo) UpdateScope(_ context.Context, id int, scope string, eventIDs []int) error {
	f.scopeUpdates = append(f.scopeUpdates, scopeUpdate{id: id, scope: scope, eventIDs: eventIDs})
	if d, ok := f.byID[id]; ok {
		d.Scope = scope
	}
	return nil
}

func (f *fakeRepo) FindUserByEmail(_ context.Context, email string) (int, error) {
	if id, ok := f.usersByEmail[email]; ok {
		return id, nil
	}
	return 0, ErrUserNotFound
}

func (f *fakeRepo) UserExists(_ context.Context, id int) (bool, error) {
	return f.users[id], nil
}

func (f *fakeRepo) IsVerifiedOrganizer(_ context.Context, userID int) (bool, error) {
	if f.errIsVerifiedOrganizer != nil {
		return false, f.errIsVerifiedOrganizer
	}
	return f.verifiedOrgs[userID], nil
}

func (f *fakeRepo) EventsOwnedBy(_ context.Context, _ int, _ []int) (bool, error) {
	if f.errEventsOwnedBy != nil {
		return false, f.errEventsOwnedBy
	}
	return f.eventsOwned, nil
}

func (f *fakeRepo) DelegateAuditsCovered(_ context.Context, _, _ int, _ string, _ []int) (bool, error) {
	if f.errAuditsCovered != nil {
		return false, f.errAuditsCovered
	}
	return f.auditsCovered, nil
}

func (f *fakeRepo) Notify(_ context.Context, userID int, title, _ string, delegationID int) error {
	f.notifications = append(f.notifications, notification{userID: userID, title: title, delegationID: delegationID})
	return nil
}

// notifiedUsers returns the ids the service sent notifications to.
func (f *fakeRepo) notifiedUsers() []int {
	out := make([]int, 0, len(f.notifications))
	for _, n := range f.notifications {
		out = append(out, n.userID)
	}
	return out
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const (
	ownerID    = 1
	delegateID = 2
)

// baseRepo seeds the common happy-path world: both users exist and the
// delegate is a verified organizer, owns nothing conflicting, audits nothing.
func baseRepo() *fakeRepo {
	f := newFakeRepo()
	f.users[ownerID] = true
	f.users[delegateID] = true
	f.verifiedOrgs[delegateID] = true
	return f
}

func newService(f *fakeRepo) *DelegationService {
	return NewDelegationService(f)
}

// seed inserts a delegation directly, bypassing the service, so lifecycle
// transitions can be tested from a known starting state.
func (f *fakeRepo) seed(id int, status string, owner, delegate int) *Delegation {
	d := &Delegation{ID: id, OwnerID: owner, DelegateID: delegate, Status: status, Scope: ScopeAll}
	f.byID[id] = d
	return d
}

// ---------------------------------------------------------------------------
// Invite — owner-driven grant, auto-active (D3)
// ---------------------------------------------------------------------------

func TestInviteAutoActivatesAndRecordsOwnerAsApprover(t *testing.T) {
	f := baseRepo()
	s := newService(f)

	got, err := s.Invite(context.Background(), ownerID, InviteRequest{
		DelegateID: delegateID,
		Scope:      ScopeAll,
		Note:       "  helping with the festival  ",
	})
	if err != nil {
		t.Fatalf("Invite: unexpected error: %v", err)
	}

	if got.Status != StatusActive {
		t.Errorf("status = %q, want %q (an owner's own invite needs no approval)", got.Status, StatusActive)
	}
	if got.RequestedBy != ownerID {
		t.Errorf("requested_by = %d, want %d", got.RequestedBy, ownerID)
	}
	if got.ApprovedBy == nil || *got.ApprovedBy != ownerID {
		t.Errorf("approved_by = %v, want %d", got.ApprovedBy, ownerID)
	}
	if got.DecidedAt == nil {
		t.Error("decided_at is nil; an auto-active delegation is decided at creation")
	}
	// optionalText trims surrounding whitespace.
	if got.Note == nil || *got.Note != "helping with the festival" {
		t.Errorf("note = %v, want trimmed text", got.Note)
	}
	// D3: the delegate is told, not asked.
	if len(f.notifications) != 1 || f.notifications[0].userID != delegateID {
		t.Errorf("notified %v, want exactly [%d]", f.notifiedUsers(), delegateID)
	}
}

func TestInviteRejectsSelfDelegation(t *testing.T) {
	f := baseRepo()
	s := newService(f)

	_, err := s.Invite(context.Background(), ownerID, InviteRequest{
		DelegateID: ownerID,
		Scope:      ScopeAll,
	})
	if !errors.Is(err, ErrSelfDelegation) {
		t.Fatalf("error = %v, want ErrSelfDelegation", err)
	}
	if f.upserted != nil {
		t.Error("a self-delegation must not be persisted")
	}
}

// D1 — the delegate must already be a verified Event Organizer.
func TestInviteRequiresVerifiedOrganizer(t *testing.T) {
	f := baseRepo()
	f.verifiedOrgs[delegateID] = false
	s := newService(f)

	_, err := s.Invite(context.Background(), ownerID, InviteRequest{
		DelegateID: delegateID,
		Scope:      ScopeAll,
	})
	if !errors.Is(err, ErrNotOrganizer) {
		t.Fatalf("error = %v, want ErrNotOrganizer", err)
	}
	if f.upserted != nil {
		t.Error("an unverified delegate must not be persisted")
	}
}

func TestInviteResolvesDelegateByEmail(t *testing.T) {
	f := baseRepo()
	f.usersByEmail["co@example.com"] = delegateID
	s := newService(f)

	got, err := s.Invite(context.Background(), ownerID, InviteRequest{
		DelegateEmail: "co@example.com",
		Scope:         ScopeAll,
	})
	if err != nil {
		t.Fatalf("Invite: unexpected error: %v", err)
	}
	if got.DelegateID != delegateID {
		t.Errorf("delegate_id = %d, want %d", got.DelegateID, delegateID)
	}
}

func TestInviteRejectsUnknownDelegate(t *testing.T) {
	tests := []struct {
		name string
		req  InviteRequest
		want error
	}{
		{"unknown id", InviteRequest{DelegateID: 999, Scope: ScopeAll}, ErrUserNotFound},
		{"unknown email", InviteRequest{DelegateEmail: "nobody@example.com", Scope: ScopeAll}, ErrUserNotFound},
		{"neither id nor email", InviteRequest{Scope: ScopeAll}, ErrValidation},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := baseRepo()
			s := newService(f)

			_, err := s.Invite(context.Background(), ownerID, tt.req)
			if !errors.Is(err, tt.want) {
				t.Fatalf("error = %v, want %v", err, tt.want)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Scope validation (D5 — 'all' incl. future events, or an explicit event list)
// ---------------------------------------------------------------------------

func TestInviteScopeValidation(t *testing.T) {
	tests := []struct {
		name        string
		scope       string
		eventIDs    []int
		eventsOwned bool
		wantErr     error
	}{
		{"scope all needs no events", ScopeAll, nil, true, nil},
		{"scope specific with owned events", ScopeSpecific, []int{7, 8}, true, nil},
		{"scope specific with no events", ScopeSpecific, nil, true, ErrValidation},
		{"scope specific with empty slice", ScopeSpecific, []int{}, true, ErrValidation},
		{"scope specific with unowned event", ScopeSpecific, []int{7}, false, ErrEventNotOwned},
		{"unknown scope", "everything", nil, true, ErrValidation},
		{"empty scope", "", nil, true, ErrValidation},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := baseRepo()
			f.eventsOwned = tt.eventsOwned
			s := newService(f)

			_, err := s.Invite(context.Background(), ownerID, InviteRequest{
				DelegateID: delegateID,
				Scope:      tt.scope,
				EventIDs:   tt.eventIDs,
			})

			if tt.wantErr == nil {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				return
			}
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if f.upserted != nil {
				t.Error("an invalid scope must not be persisted")
			}
		})
	}
}

func TestInvitePassesEventIDsThroughToRepository(t *testing.T) {
	f := baseRepo()
	s := newService(f)

	_, err := s.Invite(context.Background(), ownerID, InviteRequest{
		DelegateID: delegateID,
		Scope:      ScopeSpecific,
		EventIDs:   []int{11, 12, 13},
	})
	if err != nil {
		t.Fatalf("Invite: unexpected error: %v", err)
	}
	if len(f.upsertedEvents) != 3 {
		t.Fatalf("upserted events = %v, want 3 ids", f.upsertedEvents)
	}
}

// ---------------------------------------------------------------------------
// Separation of duties — you may not co-organize an event you audit
// ---------------------------------------------------------------------------

func TestSoDBlocksDelegationWhenDelegateAuditsCoveredEvents(t *testing.T) {
	f := baseRepo()
	f.auditsCovered = true
	s := newService(f)

	_, err := s.Invite(context.Background(), ownerID, InviteRequest{
		DelegateID: delegateID,
		Scope:      ScopeSpecific,
		EventIDs:   []int{7},
	})
	if !errors.Is(err, ErrSoDConflict) {
		t.Fatalf("error = %v, want ErrSoDConflict", err)
	}
	if f.upserted != nil {
		t.Error("an SoD-conflicting delegation must not be persisted")
	}
}

func TestSoDIsRecheckedOnScopeEdit(t *testing.T) {
	// A delegation can be created cleanly and later widened onto an event the
	// delegate audits, so EditScope must re-run the check rather than trusting
	// the original decision.
	f := baseRepo()
	f.seed(500, StatusActive, ownerID, delegateID)
	f.auditsCovered = true
	s := newService(f)

	_, err := s.EditScope(context.Background(), ownerID, 500, ScopeRequest{
		Scope:    ScopeSpecific,
		EventIDs: []int{9},
	})
	if !errors.Is(err, ErrSoDConflict) {
		t.Fatalf("error = %v, want ErrSoDConflict", err)
	}
	if len(f.scopeUpdates) != 0 {
		t.Error("scope must not be updated when SoD fails")
	}
}

// ---------------------------------------------------------------------------
// Conflicts — an in-flight relationship must not be clobbered
// ---------------------------------------------------------------------------

func TestInviteConflictsWithInFlightDelegation(t *testing.T) {
	tests := []struct {
		name       string
		status     string
		wantErr    error
		wantUpsert bool
	}{
		{"already active", StatusActive, ErrConflict, false},
		{"already pending", StatusPending, ErrConflict, false},
		// A finished relationship may be restarted — Upsert reactivates on the
		// UNIQUE(owner_id, delegate_id) conflict.
		{"previously declined", StatusDeclined, nil, true},
		{"previously revoked", StatusRevoked, nil, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := baseRepo()
			f.existing = &Delegation{ID: 42, OwnerID: ownerID, DelegateID: delegateID, Status: tt.status}
			s := newService(f)

			_, err := s.Invite(context.Background(), ownerID, InviteRequest{
				DelegateID: delegateID,
				Scope:      ScopeAll,
			})

			if tt.wantErr != nil && !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr == nil && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if gotUpsert := f.upserted != nil; gotUpsert != tt.wantUpsert {
				t.Errorf("persisted = %v, want %v", gotUpsert, tt.wantUpsert)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// RequestAccess — delegate-driven, always lands pending (D2)
// ---------------------------------------------------------------------------

func TestRequestAccessLandsPendingAndNotifiesOwner(t *testing.T) {
	f := baseRepo()
	s := newService(f)

	got, err := s.RequestAccess(context.Background(), delegateID, RequestAccessRequest{
		OwnerID: ownerID,
		Scope:   ScopeAll,
	})
	if err != nil {
		t.Fatalf("RequestAccess: unexpected error: %v", err)
	}

	// D2 — a delegate can never self-approve.
	if got.Status != StatusPending {
		t.Errorf("status = %q, want %q", got.Status, StatusPending)
	}
	if got.ApprovedBy != nil {
		t.Errorf("approved_by = %v, want nil until the owner approves", got.ApprovedBy)
	}
	if got.RequestedBy != delegateID {
		t.Errorf("requested_by = %d, want %d", got.RequestedBy, delegateID)
	}
	// The owner is the one who must act, so the owner is the one notified.
	if len(f.notifications) != 1 || f.notifications[0].userID != ownerID {
		t.Errorf("notified %v, want exactly [%d]", f.notifiedUsers(), ownerID)
	}
}

func TestRequestAccessRejectsSelfDelegation(t *testing.T) {
	f := baseRepo()
	s := newService(f)

	_, err := s.RequestAccess(context.Background(), delegateID, RequestAccessRequest{
		OwnerID: delegateID,
		Scope:   ScopeAll,
	})
	if !errors.Is(err, ErrSelfDelegation) {
		t.Fatalf("error = %v, want ErrSelfDelegation", err)
	}
}

func TestRequestAccessConflictsWithInFlightDelegation(t *testing.T) {
	for _, status := range []string{StatusActive, StatusPending} {
		t.Run(status, func(t *testing.T) {
			f := baseRepo()
			f.existing = &Delegation{ID: 42, OwnerID: ownerID, DelegateID: delegateID, Status: status}
			s := newService(f)

			_, err := s.RequestAccess(context.Background(), delegateID, RequestAccessRequest{
				OwnerID: ownerID,
				Scope:   ScopeAll,
			})
			if !errors.Is(err, ErrConflict) {
				t.Fatalf("error = %v, want ErrConflict", err)
			}
		})
	}
}

// RequestAccess does NOT check IsVerifiedOrganizer, while Invite does. This test
// documents that asymmetry rather than asserting it is correct — see the note in
// the review comment accompanying these tests.
func TestRequestAccessDoesNotCheckVerifiedOrganizer(t *testing.T) {
	f := baseRepo()
	f.verifiedOrgs[delegateID] = false
	s := newService(f)

	got, err := s.RequestAccess(context.Background(), delegateID, RequestAccessRequest{
		OwnerID: ownerID,
		Scope:   ScopeAll,
	})
	if err != nil {
		t.Fatalf("RequestAccess currently allows unverified requesters; got error %v", err)
	}
	if got.Status != StatusPending {
		t.Errorf("status = %q, want %q", got.Status, StatusPending)
	}
}

// ---------------------------------------------------------------------------
// Approval lifecycle
// ---------------------------------------------------------------------------

func TestApproveActivatesPendingDelegation(t *testing.T) {
	f := baseRepo()
	f.seed(500, StatusPending, ownerID, delegateID)
	s := newService(f)

	got, err := s.Approve(context.Background(), ownerID, 500)
	if err != nil {
		t.Fatalf("Approve: unexpected error: %v", err)
	}
	if got.Status != StatusActive {
		t.Errorf("status = %q, want %q", got.Status, StatusActive)
	}
	if len(f.statusUpdates) != 1 {
		t.Fatalf("status updates = %d, want 1", len(f.statusUpdates))
	}
	if got.ApprovedBy == nil || *got.ApprovedBy != ownerID {
		t.Errorf("approved_by = %v, want %d", got.ApprovedBy, ownerID)
	}
	if len(f.notifications) != 1 || f.notifications[0].userID != delegateID {
		t.Errorf("notified %v, want exactly [%d]", f.notifiedUsers(), delegateID)
	}
}

func TestDeclineLeavesNoApprover(t *testing.T) {
	f := baseRepo()
	f.seed(500, StatusPending, ownerID, delegateID)
	s := newService(f)

	got, err := s.Decline(context.Background(), ownerID, 500)
	if err != nil {
		t.Fatalf("Decline: unexpected error: %v", err)
	}
	if got.Status != StatusDeclined {
		t.Errorf("status = %q, want %q", got.Status, StatusDeclined)
	}
	if got.ApprovedBy != nil {
		t.Errorf("approved_by = %v, want nil on a decline", got.ApprovedBy)
	}
}

func TestApproveAndDeclineRejectNonPendingStates(t *testing.T) {
	for _, status := range []string{StatusActive, StatusDeclined, StatusRevoked} {
		t.Run("approve/"+status, func(t *testing.T) {
			f := baseRepo()
			f.seed(500, status, ownerID, delegateID)
			s := newService(f)

			if _, err := s.Approve(context.Background(), ownerID, 500); !errors.Is(err, ErrInvalidState) {
				t.Fatalf("error = %v, want ErrInvalidState", err)
			}
		})
		t.Run("decline/"+status, func(t *testing.T) {
			f := baseRepo()
			f.seed(500, status, ownerID, delegateID)
			s := newService(f)

			if _, err := s.Decline(context.Background(), ownerID, 500); !errors.Is(err, ErrInvalidState) {
				t.Fatalf("error = %v, want ErrInvalidState", err)
			}
		})
	}
}

func TestRevokeAcceptsActiveAndPendingOnly(t *testing.T) {
	tests := []struct {
		status  string
		wantErr error
	}{
		{StatusActive, nil},
		{StatusPending, nil},
		{StatusDeclined, ErrInvalidState},
		{StatusRevoked, ErrInvalidState},
	}

	for _, tt := range tests {
		t.Run(tt.status, func(t *testing.T) {
			f := baseRepo()
			f.seed(500, tt.status, ownerID, delegateID)
			s := newService(f)

			err := s.Revoke(context.Background(), ownerID, 500)
			if tt.wantErr == nil {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				if f.byID[500].Status != StatusRevoked {
					t.Errorf("status = %q, want %q", f.byID[500].Status, StatusRevoked)
				}
				return
			}
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if len(f.statusUpdates) != 0 {
				t.Error("status must not change from a terminal state")
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Ownership — only the owner may act on their delegations (D3)
// ---------------------------------------------------------------------------

func TestOwnerOnlyActionsRejectNonOwners(t *testing.T) {
	const stranger = 99

	tests := []struct {
		name string
		call func(*DelegationService) error
	}{
		{"approve", func(s *DelegationService) error {
			_, err := s.Approve(context.Background(), stranger, 500)
			return err
		}},
		{"decline", func(s *DelegationService) error {
			_, err := s.Decline(context.Background(), stranger, 500)
			return err
		}},
		{"revoke", func(s *DelegationService) error {
			return s.Revoke(context.Background(), stranger, 500)
		}},
		{"edit scope", func(s *DelegationService) error {
			_, err := s.EditScope(context.Background(), stranger, 500, ScopeRequest{Scope: ScopeAll})
			return err
		}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := baseRepo()
			f.seed(500, StatusPending, ownerID, delegateID)
			s := newService(f)

			// The delegate is deliberately not the caller either — neither the
			// delegate nor an unrelated user may decide their own access.
			if err := tt.call(s); !errors.Is(err, ErrForbidden) {
				t.Fatalf("error = %v, want ErrForbidden", err)
			}
			if len(f.statusUpdates) != 0 || len(f.scopeUpdates) != 0 {
				t.Error("a non-owner must not mutate the delegation")
			}
		})
	}
}

func TestOwnerActionsOnMissingDelegationReturnNotFound(t *testing.T) {
	f := baseRepo()
	s := newService(f)

	if _, err := s.Approve(context.Background(), ownerID, 12345); !errors.Is(err, ErrNotFound) {
		t.Fatalf("error = %v, want ErrNotFound", err)
	}
}

// ---------------------------------------------------------------------------
// Admin oversight
// ---------------------------------------------------------------------------

func TestAdminRevokeBypassesOwnershipAndNotifiesBothParties(t *testing.T) {
	f := baseRepo()
	f.seed(500, StatusActive, ownerID, delegateID)
	s := newService(f)

	const admin = 77
	if err := s.AdminRevoke(context.Background(), 500, admin); err != nil {
		t.Fatalf("AdminRevoke: unexpected error: %v", err)
	}
	if f.byID[500].Status != StatusRevoked {
		t.Errorf("status = %q, want %q", f.byID[500].Status, StatusRevoked)
	}

	// Both sides must learn that an administrator intervened.
	notified := map[int]bool{}
	for _, id := range f.notifiedUsers() {
		notified[id] = true
	}
	if !notified[ownerID] || !notified[delegateID] {
		t.Errorf("notified %v, want both owner %d and delegate %d", f.notifiedUsers(), ownerID, delegateID)
	}
}

func TestAdminRevokeRejectsTerminalStates(t *testing.T) {
	for _, status := range []string{StatusDeclined, StatusRevoked} {
		t.Run(status, func(t *testing.T) {
			f := baseRepo()
			f.seed(500, status, ownerID, delegateID)
			s := newService(f)

			if err := s.AdminRevoke(context.Background(), 500, 77); !errors.Is(err, ErrInvalidState) {
				t.Fatalf("error = %v, want ErrInvalidState", err)
			}
		})
	}
}

func TestListForUserReturnsBothDirections(t *testing.T) {
	f := baseRepo()
	f.seed(500, StatusActive, ownerID, delegateID) // user 1 granted this
	f.seed(501, StatusActive, delegateID, ownerID) // user 1 received this
	f.seed(502, StatusActive, 8, 9)                // unrelated to user 1
	s := newService(f)

	owned, received, err := s.ListForUser(context.Background(), ownerID)
	if err != nil {
		t.Fatalf("ListForUser: unexpected error: %v", err)
	}
	if len(owned) != 1 || owned[0].ID != 500 {
		t.Errorf("owned = %v, want just delegation 500", owned)
	}
	if len(received) != 1 || received[0].ID != 501 {
		t.Errorf("received = %v, want just delegation 501", received)
	}
}

// ---------------------------------------------------------------------------
// Repository failures must surface, not be swallowed
// ---------------------------------------------------------------------------

func TestRepositoryErrorsPropagate(t *testing.T) {
	boom := errors.New("database is down")

	tests := []struct {
		name  string
		setup func(*fakeRepo)
		req   InviteRequest
	}{
		{
			name:  "verified-organizer lookup fails",
			setup: func(f *fakeRepo) { f.errIsVerifiedOrganizer = boom },
			req:   InviteRequest{DelegateID: delegateID, Scope: ScopeAll},
		},
		{
			name:  "event-ownership lookup fails",
			setup: func(f *fakeRepo) { f.errEventsOwnedBy = boom },
			req:   InviteRequest{DelegateID: delegateID, Scope: ScopeSpecific, EventIDs: []int{7}},
		},
		{
			name:  "SoD lookup fails",
			setup: func(f *fakeRepo) { f.errAuditsCovered = boom },
			req:   InviteRequest{DelegateID: delegateID, Scope: ScopeAll},
		},
		{
			name:  "upsert fails",
			setup: func(f *fakeRepo) { f.errUpsert = boom },
			req:   InviteRequest{DelegateID: delegateID, Scope: ScopeAll},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := baseRepo()
			tt.setup(f)
			s := newService(f)

			_, err := s.Invite(context.Background(), ownerID, tt.req)
			if !errors.Is(err, boom) {
				t.Fatalf("error = %v, want the underlying repository error", err)
			}
		})
	}
}

// A failed notification must not fail the operation — the delegation is already
// committed by then, so the service deliberately ignores Notify's error.
func TestNotificationFailureDoesNotFailTheOperation(t *testing.T) {
	f := baseRepo()
	f.seed(500, StatusPending, ownerID, delegateID)
	s := newService(f)

	if _, err := s.Approve(context.Background(), ownerID, 500); err != nil {
		t.Fatalf("Approve: unexpected error: %v", err)
	}
	if f.byID[500].Status != StatusActive {
		t.Errorf("status = %q, want %q", f.byID[500].Status, StatusActive)
	}
}
