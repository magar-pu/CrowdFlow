package ticketman

import "time"

// ──────────── Database Row ────────────

type staffAuthRow struct {
	ID           int
	EventID      int
	EventName    string
	FullName     string
	Email        string
	PasswordHash string
	Status       string
	ValidFrom    time.Time
	ValidUntil   time.Time
}

// ──────────── Requests / Responses ────────────

type LoginRequest struct {
	Email          string `json:"email"`
	Password       string `json:"password"`
	EventCode      string `json:"eventCode"`
	TurnstileToken string `json:"turnstileToken"`
}

type SessionInfo struct {
	StaffID      int         `json:"staffId"`
	FullName     string      `json:"fullName"`
	Email        string      `json:"email"`
	EventID      int         `json:"eventId"`
	EventName    string      `json:"eventName"`
	EventCode    string      `json:"eventCode"`
	GrantedGates []GateGrant `json:"grantedGates"`
	GrantedTiers []TierGrant `json:"grantedTiers"`
}

// GateGrant and TierGrant are the staff account's own scan-time grants, for
// display only (e.g. populating the dashboard's gate picker). An empty slice
// here means the account is granted NO gate/tier at all — resolveGate and
// StaffHasTierGrant in the scanner package reject every check-in in that
// case, they do not treat it as unrestricted access. The server-side 403 on
// checkin/reject is the actual enforcement; this is purely a UX narrowing.
type GateGrant struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type TierGrant struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// ──────────── Interfaces ────────────

type Repository interface {
	GetByEventCode(eventCode string) (*staffAuthRow, error)
	GetSessionInfo(staffID int) (*SessionInfo, error)
}
