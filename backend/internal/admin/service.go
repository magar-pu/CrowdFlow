package admin

type AdminService struct {
	repo Repository
}

func NewAdminService(repo Repository) *AdminService {
	return &AdminService{repo: repo}
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
	return s.repo.UpdateTicketTiers(eventID, tiers)
}

func (s *AdminService) GetVenueSections(eventID int) ([]*VenueSection, error) {
	return s.repo.GetVenueSections(eventID)
}

func (s *AdminService) UpdateVenueSections(eventID int, sections []*VenueSection) error {
	return s.repo.UpdateVenueSections(eventID, sections)
}

func (s *AdminService) UpdateUserStatus(userID int, status string, actorID int) error {
	return s.repo.UpdateUserStatus(userID, status, actorID)
}

func (s *AdminService) GrantUserRole(userID int, roleID int, eventID *int, actorID int) error {
	return s.repo.GrantUserRole(userID, roleID, eventID, actorID)
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

// ---------------------------------------------------------------------------
// PLACEHOLDERS - no backing tables exist yet for the features below.
//
//   - Scanners:       check-in device registry has no table.
//   - SecurityAlerts: fraud/anomaly detection has no table.
//
// These return empty slices (correct envelope, zero data) rather than
// fabricated rows, so the frontend can safely switch from local mock state to
// real fetches today without rendering fake numbers. Replace each with a real
// repository method once its table is designed and migrated.
// ---------------------------------------------------------------------------

func (s *AdminService) ListScanners(eventID int) ([]*Scanner, error) {
	return []*Scanner{}, nil
}

func (s *AdminService) ListSecurityAlerts() ([]*SecurityAlert, error) {
	return []*SecurityAlert{}, nil
}
