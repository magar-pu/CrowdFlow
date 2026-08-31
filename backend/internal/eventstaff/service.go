package eventstaff

import (
	"crypto/rand"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type eventStaffService struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &eventStaffService{repo: repo}
}

// codeAlphabet excludes visually ambiguous characters (0/O, 1/I) since the
// event_code is read aloud and typed by hand at the gate.
const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

const passwordAlphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

func randomFromAlphabet(alphabet string, n int) string {
	raw := make([]byte, n)
	_, _ = rand.Read(raw)
	out := make([]byte, n)
	for i, v := range raw {
		out[i] = alphabet[int(v)%len(alphabet)]
	}
	return string(out)
}

// generateEventCode produces the opaque K7QM-2F9X account identifier. It is
// never derived from, or convertible back to, the numeric event_id.
func generateEventCode() string {
	return fmt.Sprintf("%s-%s", randomFromAlphabet(codeAlphabet, 4), randomFromAlphabet(codeAlphabet, 4))
}

func generatePassword() string {
	return randomFromAlphabet(passwordAlphabet, 14)
}

func (s *eventStaffService) generateUniqueEventCode() (string, error) {
	for i := 0; i < 20; i++ {
		candidate := generateEventCode()
		exists, err := s.repo.EventCodeExists(candidate)
		if err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("failed to generate a unique event code")
}

func hashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func validateGrants(gateIDs, tierIDs []int) error {
	if len(gateIDs) == 0 {
		return fmt.Errorf("at least one gate must be granted")
	}
	if len(tierIDs) == 0 {
		return fmt.Errorf("at least one tier must be granted")
	}
	return nil
}

func (s *eventStaffService) Create(eventID int, organizerID int, req *CreateStaffRequest) (*CreateStaffResponse, error) {
	if strings.TrimSpace(req.FullName) == "" {
		return nil, fmt.Errorf("full name is required")
	}
	if strings.TrimSpace(req.Email) == "" {
		return nil, fmt.Errorf("email is required")
	}
	if req.ValidUntil.IsZero() {
		return nil, fmt.Errorf("validUntil is required")
	}
	if req.ValidFrom.IsZero() {
		req.ValidFrom = time.Now()
	}
	if !req.ValidUntil.After(req.ValidFrom) {
		return nil, fmt.Errorf("validUntil must be after validFrom")
	}
	if err := validateGrants(req.GateIDs, req.TierIDs); err != nil {
		return nil, err
	}

	gatesOK, err := s.repo.GatesBelongToEvent(eventID, req.GateIDs)
	if err != nil {
		return nil, err
	}
	if !gatesOK {
		return nil, fmt.Errorf("one or more gate IDs do not belong to this event")
	}

	tiersOK, err := s.repo.TiersBelongToEvent(eventID, req.TierIDs)
	if err != nil {
		return nil, err
	}
	if !tiersOK {
		return nil, fmt.Errorf("one or more tier IDs do not belong to this event")
	}

	eventCode, err := s.generateUniqueEventCode()
	if err != nil {
		return nil, err
	}

	password := generatePassword()
	hash, err := hashPassword(password)
	if err != nil {
		return nil, err
	}

	staff, err := s.repo.Create(eventID, req, hash, eventCode, organizerID)
	if err != nil {
		return nil, err
	}

	if err := s.repo.SetGates(staff.ID, req.GateIDs); err != nil {
		return nil, err
	}
	if err := s.repo.SetTiers(staff.ID, req.TierIDs); err != nil {
		return nil, err
	}
	staff.GateIDs = req.GateIDs
	staff.TierIDs = req.TierIDs

	return &CreateStaffResponse{
		Staff:     staff,
		Email:     req.Email,
		Password:  password,
		EventCode: eventCode,
	}, nil
}

func (s *eventStaffService) List(eventID int) ([]*EventStaff, error) {
	return s.repo.List(eventID)
}

func (s *eventStaffService) Get(id, eventID int) (*EventStaff, error) {
	return s.repo.Get(id, eventID)
}

func (s *eventStaffService) UpdateGrants(id, eventID int, req *UpdateGrantsRequest) error {
	if err := validateGrants(req.GateIDs, req.TierIDs); err != nil {
		return err
	}

	if _, err := s.repo.Get(id, eventID); err != nil {
		return err
	}

	gatesOK, err := s.repo.GatesBelongToEvent(eventID, req.GateIDs)
	if err != nil {
		return err
	}
	if !gatesOK {
		return fmt.Errorf("one or more gate IDs do not belong to this event")
	}

	tiersOK, err := s.repo.TiersBelongToEvent(eventID, req.TierIDs)
	if err != nil {
		return err
	}
	if !tiersOK {
		return fmt.Errorf("one or more tier IDs do not belong to this event")
	}

	if err := s.repo.SetGates(id, req.GateIDs); err != nil {
		return err
	}
	return s.repo.SetTiers(id, req.TierIDs)
}

func (s *eventStaffService) SetStatus(id, eventID int, status string) error {
	switch status {
	case "active", "suspended", "revoked":
	default:
		return fmt.Errorf("invalid status %q", status)
	}
	return s.repo.SetStatus(id, eventID, status)
}

func (s *eventStaffService) UpdateValidity(id, eventID int, req *UpdateValidityRequest) error {
	if req.ValidFrom.IsZero() || req.ValidUntil.IsZero() {
		return fmt.Errorf("validFrom and validUntil are both required")
	}
	if !req.ValidUntil.After(req.ValidFrom) {
		return fmt.Errorf("validUntil must be after validFrom")
	}
	return s.repo.SetValidity(id, eventID, req.ValidFrom, req.ValidUntil)
}

// ResetCredentials is the only recovery path (locked decision 10): the
// organizer resets, a new password is generated and shown once. Nothing is
// ever emailed to the ticketman.
func (s *eventStaffService) ResetCredentials(id, eventID int) (*ResetCredentialsResponse, error) {
	staff, err := s.repo.Get(id, eventID)
	if err != nil {
		return nil, err
	}

	password := generatePassword()
	hash, err := hashPassword(password)
	if err != nil {
		return nil, err
	}

	if err := s.repo.UpdatePasswordHash(staff.ID, hash); err != nil {
		return nil, err
	}

	return &ResetCredentialsResponse{Email: staff.Email, Password: password}, nil
}

func (s *eventStaffService) Delete(id, eventID int) error {
	return s.repo.Delete(id, eventID)
}
