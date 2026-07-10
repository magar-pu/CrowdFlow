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

func (s *AdminService) ListUsers() ([]*User, error) {
	return s.repo.ListUsers()
}

func (s *AdminService) ListTransactions() ([]*Transaction, error) {
	return s.repo.ListTransactions()
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

func (s *AdminService) UpdateUserStatus(userID int, status string) error {
	return s.repo.UpdateUserStatus(userID, status)
}

func (s *AdminService) GrantUserRole(userID int, roleID int, eventID *int) error {
	return s.repo.GrantUserRole(userID, roleID, eventID)
}

func (s *AdminService) UpdateTransactionStatus(orderID string, status string) error {
	return s.repo.UpdateTransactionStatus(orderID, status)
}

// ListVerifications is real - derived from users.verification_status in
// repository.go (no separate applications table exists; see the comment
// there). Approve/reject reuse UpdateUserStatus above.
func (s *AdminService) ListVerifications() ([]*VerificationApplication, error) {
	return s.repo.ListVerifications()
}

// ---------------------------------------------------------------------------
// PLACEHOLDERS - no backing tables exist yet for the features below.
//
// Each one is documented in the audit as a genuinely missing feature, not
// just a missing endpoint:
//   - Payouts:        organizer payout requests/settlement have no table.
//   - Scanners:       check-in device registry has no table.
//   - SecurityAlerts: fraud/anomaly detection has no table.
//   - Activities:     admin action audit trail has no table (event_approval_log
//                      exists but only covers event approve/reject decisions).
//
// These return empty slices (correct envelope, zero data) rather than
// fabricated rows, so the frontend can safely switch from local mock state to
// real fetches today without rendering fake numbers. Replace each with a real
// repository method once its table is designed and migrated.
// ---------------------------------------------------------------------------

func (s *AdminService) ListPayouts() ([]*Payout, error) {
	return []*Payout{}, nil
}

func (s *AdminService) ListScanners(eventID int) ([]*Scanner, error) {
	return []*Scanner{}, nil
}

func (s *AdminService) ListSecurityAlerts() ([]*SecurityAlert, error) {
	return []*SecurityAlert{}, nil
}

func (s *AdminService) ListActivities() ([]*Activity, error) {
	return []*Activity{}, nil
}
