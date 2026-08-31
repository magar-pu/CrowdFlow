package admin

import (
	"errors"
	"fmt"
	"strings"
)

// ErrValidation marks input-validation failures so handlers can map them to
// a 422 with the message intact, instead of the generic 500 used for
// repository/DB errors (whose raw text must not reach the client).
var ErrValidation = errors.New("validation failed")

// SecretRotator is the narrow capability internal/ticket's TicketService
// provides for M4's admin panic-revoke path — mirrors organizer.SecretRotator
// and payment.TicketIssuer: the interface lives in the consumer package,
// internal/ticket never imports internal/admin. TicketService.RotateSecret
// satisfies this structurally; wired in main.go.
type SecretRotator interface {
	RotateSecret(ticketID string) (string, error)
}

type AdminService struct {
	repo    Repository
	rotator SecretRotator
}

func NewAdminService(repo Repository, rotator SecretRotator) *AdminService {
	return &AdminService{repo: repo, rotator: rotator}
}

// RotateTicketSecret is M4's admin-authorized panic-revoke path. Super
// Admin only (enforced by the route's requirePlatformRole, not here) and no
// per-event ownership check — admin is platform-wide by design. The actual
// write is delegated to rotator so internal/admin, like internal/organizer,
// never writes tickets.secret_key itself.
func (s *AdminService) RotateTicketSecret(ticketID string) (string, error) {
	if s.rotator == nil {
		return "", fmt.Errorf("secret rotation is not configured")
	}
	return s.rotator.RotateSecret(ticketID)
}

func (s *AdminService) GetPlatformAnalytics(rangeKey string) (*PlatformAnalytics, error) {
	// Anything unrecognised falls through to the repository's 30d default rather
	// than erroring: a bad query string should not blank the dashboard.
	return s.repo.GetPlatformAnalytics(rangeKey)
}

func (s *AdminService) GetDashboardStats() (*DashboardStats, error) {
	return s.repo.GetDashboardStats()
}

func (s *AdminService) ListEvents(limit, offset int) ([]*Event, error) {
	if limit <= 0 {
		limit = 20
	}
	return s.repo.ListEvents(limit, offset)
}

// RejectEvent requires notes so the organizer has something actionable to
// see; ApproveEvent leaves notes optional (same asymmetry as verification
// approve/reject, which doesn't ask for a reason to approve).
func (s *AdminService) ApproveEvent(eventID, auditorID int, notes string) error {
	return s.repo.ApproveEvent(eventID, auditorID, notes)
}

func (s *AdminService) RejectEvent(eventID, auditorID int, notes string) error {
	if strings.TrimSpace(notes) == "" {
		return fmt.Errorf("%w: rejection notes are required", ErrValidation)
	}
	return s.repo.RejectEvent(eventID, auditorID, notes)
}

func (s *AdminService) SetEventStatus(eventID int, status string, actorID int) error {
	if status != "draft" && status != "pending_review" {
		return fmt.Errorf("%w: status must be draft or pending_review (use approve/reject for approved/rejected)", ErrValidation)
	}
	return s.repo.SetEventStatus(eventID, status, actorID)
}

func (s *AdminService) ListEventStatusLog(eventID int) ([]*EventStatusLogEntry, error) {
	return s.repo.ListEventStatusLog(eventID)
}

func (s *AdminService) ListUsers(limit, offset int) ([]*User, error) {
	if limit <= 0 {
		limit = 50
	}
	return s.repo.ListUsers(limit, offset)
}

func (s *AdminService) ListTransactions(limit, offset int) ([]*Transaction, error) {
	if limit <= 0 {
		limit = 50
	}
	return s.repo.ListTransactions(limit, offset)
}

func (s *AdminService) GetTicketTiers(eventID int) ([]*TicketTier, error) {
	return s.repo.GetTicketTiers(eventID)
}

func (s *AdminService) UpdateTicketTiers(eventID int, tiers []*TicketTier) error {
	for _, t := range tiers {
		name := strings.TrimSpace(t.Name)
		switch {
		case name == "":
			return fmt.Errorf("%w: tier name is required", ErrValidation)
		case len(name) > 100: // ticket_tiers.name is varchar(100)
			return fmt.Errorf("%w: tier name %q exceeds 100 characters", ErrValidation, name)
		case t.Price < 0:
			return fmt.Errorf("%w: tier %q cannot have a negative price", ErrValidation, name)
		case t.Capacity <= 0:
			return fmt.Errorf("%w: tier %q must have a capacity of at least 1", ErrValidation, name)
		}
	}
	return s.repo.UpdateTicketTiers(eventID, tiers)
}

func (s *AdminService) DeleteTicketTier(eventID, tierID int) error {
	return s.repo.DeleteTicketTier(eventID, tierID)
}

func (s *AdminService) UpdateUserStatus(userID int, status string, actorID int) error {
	return s.repo.UpdateUserStatus(userID, status, actorID)
}

func (s *AdminService) GrantUserRole(userID int, roleID int, eventID *int, actorID int) error {
	return s.repo.GrantUserRole(userID, roleID, eventID, actorID)
}

func (s *AdminService) RevokeUserRole(userID int, roleID int, eventID *int, actorID int) error {
	return s.repo.RevokeUserRole(userID, roleID, eventID, actorID)
}

func (s *AdminService) UpdateTransactionStatus(orderID string, status string, actorID int) error {
	return s.repo.UpdateTransactionStatus(orderID, status, actorID)
}

// ListVerifications is real - derived from users.verification_status in
// repository.go (no separate applications table exists; see the comment
// there). Approve/reject reuse UpdateUserStatus above.
func (s *AdminService) ListVerifications(limit, offset int) ([]*VerificationApplication, error) {
	if limit <= 0 {
		limit = 50
	}
	return s.repo.ListVerifications(limit, offset)
}

func (s *AdminService) ListPayouts(limit, offset int) ([]*Payout, error) {
	if limit <= 0 {
		limit = 50
	}
	return s.repo.ListPayouts(limit, offset)
}

func (s *AdminService) ProcessPayout(payoutID string, actorID int) error {
	return s.repo.ProcessPayout(payoutID, actorID)
}

func (s *AdminService) RejectPayout(payoutID string, actorID int) error {
	return s.repo.RejectPayout(payoutID, actorID)
}

func (s *AdminService) ListActivities() ([]*Activity, error) {
	return s.repo.ListActivities()
}

func (s *AdminService) ListNotifications(userID int) ([]*Notification, error) {
	return s.repo.ListNotifications(userID)
}

func (s *AdminService) MarkNotificationsRead(userID int, notificationIDs []int) error {
	return s.repo.MarkNotificationsRead(userID, notificationIDs)
}

// ---------------------------------------------------------------------------
// PLACEHOLDERS - no backing tables exist yet for the features below.
//
//   - SecurityAlerts: fraud/anomaly detection has no table.
//
// This returns an empty slice (correct envelope, zero data) rather than
// fabricated rows, so the frontend can safely switch from local mock state to
// a real fetch today without rendering fake numbers. Replace with a real
// repository method once its table is designed and migrated.
// ---------------------------------------------------------------------------

func (s *AdminService) ListSecurityAlerts() ([]*SecurityAlert, error) {
	return []*SecurityAlert{}, nil
}
