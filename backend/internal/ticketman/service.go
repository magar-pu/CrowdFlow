package ticketman

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("invalid email, password, or event code")
var ErrAccountNotActive = errors.New("this ticketman account is not active")
var ErrAccountNotYetValid = errors.New("this ticketman account is not active yet")
var ErrAccountExpired = errors.New("this ticketman account's access window has ended")

type AuthService struct {
	repo      Repository
	jwtSecret []byte
	accessTTL time.Duration
}

func NewAuthService(repo Repository, jwtSecret string, accessTTL time.Duration) *AuthService {
	return &AuthService{
		repo:      repo,
		jwtSecret: []byte(jwtSecret),
		accessTTL: accessTTL,
	}
}

// Login verifies email + password + event_code together — the event_code
// selects the account row (it is globally unique), email and password are
// then checked against that specific row. A wrong event_code, wrong email on
// the right event_code, and a wrong password all fail identically to avoid
// leaking which part was wrong.
func (s *AuthService) Login(req LoginRequest) (token string, info *SessionInfo, err error) {
	eventCode := strings.TrimSpace(req.EventCode)
	if eventCode == "" {
		return "", nil, ErrInvalidCredentials
	}

	row, err := s.repo.GetByEventCode(eventCode)
	if err != nil {
		return "", nil, ErrInvalidCredentials
	}

	if !strings.EqualFold(strings.TrimSpace(req.Email), row.Email) {
		return "", nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(row.PasswordHash), []byte(req.Password)); err != nil {
		return "", nil, ErrInvalidCredentials
	}

	now := time.Now()
	if row.Status != "active" {
		return "", nil, ErrAccountNotActive
	}
	if now.Before(row.ValidFrom) {
		return "", nil, ErrAccountNotYetValid
	}
	if now.After(row.ValidUntil) {
		return "", nil, ErrAccountExpired
	}

	// The JWT's own expiry never outlives the account's valid_until, but the
	// hard cutoff is enforced by RequireTicketman re-reading the database on
	// every request regardless — this exp is a courtesy, not the boundary.
	exp := now.Add(s.accessTTL)
	if row.ValidUntil.Before(exp) {
		exp = row.ValidUntil
	}

	claims := jwt.MapClaims{
		"sub":      strconv.Itoa(row.ID),
		"event_id": row.EventID,
		"aud":      "ticketman",
		"iat":      now.Unix(),
		"exp":      exp.Unix(),
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.jwtSecret)
	if err != nil {
		return "", nil, err
	}

	sessionInfo, err := s.repo.GetSessionInfo(row.ID)
	if err != nil {
		return "", nil, err
	}

	return signed, sessionInfo, nil
}

func (s *AuthService) GetSessionInfo(staffID int) (*SessionInfo, error) {
	return s.repo.GetSessionInfo(staffID)
}
