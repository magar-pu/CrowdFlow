package eventstaff

import "time"

// ──────────── Database Entity ────────────

type EventStaff struct {
	ID         int       `json:"id"`
	EventID    int       `json:"eventId"`
	EventCode  string    `json:"eventCode"`
	FullName   string    `json:"fullName"`
	Email      string    `json:"email"`
	Status     string    `json:"status"` // active | suspended | revoked
	ValidFrom  time.Time `json:"validFrom"`
	ValidUntil time.Time `json:"validUntil"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
	GateIDs    []int     `json:"gateIds"`
	TierIDs    []int     `json:"tierIds"`
}

// ──────────── Requests / Responses ────────────

type CreateStaffRequest struct {
	FullName   string    `json:"fullName"`
	Email      string    `json:"email"`
	GateIDs    []int     `json:"gateIds"`
	TierIDs    []int     `json:"tierIds"`
	ValidFrom  time.Time `json:"validFrom"`
	ValidUntil time.Time `json:"validUntil"`
}

// CreateStaffResponse carries the plaintext password exactly once — it is
// never stored and never retrievable again after this response.
type CreateStaffResponse struct {
	Staff     *EventStaff `json:"staff"`
	Email     string      `json:"email"`
	Password  string      `json:"password"`
	EventCode string      `json:"eventCode"`
}

type UpdateGrantsRequest struct {
	GateIDs []int `json:"gateIds"`
	TierIDs []int `json:"tierIds"`
}

type UpdateStatusRequest struct {
	Status string `json:"status"`
}

type UpdateValidityRequest struct {
	ValidFrom  time.Time `json:"validFrom"`
	ValidUntil time.Time `json:"validUntil"`
}

type ResetCredentialsResponse struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// ──────────── Interfaces ────────────

type Repository interface {
	Create(eventID int, req *CreateStaffRequest, passwordHash, eventCode string, createdByOrganizerID int) (*EventStaff, error)
	List(eventID int) ([]*EventStaff, error)
	Get(id int, eventID int) (*EventStaff, error)
	SetGates(staffID int, gateIDs []int) error
	SetTiers(staffID int, tierIDs []int) error
	SetStatus(id int, eventID int, status string) error
	SetValidity(id int, eventID int, validFrom, validUntil time.Time) error
	UpdatePasswordHash(id int, passwordHash string) error
	Delete(id int, eventID int) error
	EventCodeExists(eventCode string) (bool, error)
	GatesBelongToEvent(eventID int, gateIDs []int) (bool, error)
	TiersBelongToEvent(eventID int, tierIDs []int) (bool, error)
}

type Service interface {
	Create(eventID int, organizerID int, req *CreateStaffRequest) (*CreateStaffResponse, error)
	List(eventID int) ([]*EventStaff, error)
	Get(id, eventID int) (*EventStaff, error)
	UpdateGrants(id, eventID int, req *UpdateGrantsRequest) error
	SetStatus(id, eventID int, status string) error
	UpdateValidity(id, eventID int, req *UpdateValidityRequest) error
	ResetCredentials(id, eventID int) (*ResetCredentialsResponse, error)
	Delete(id, eventID int) error
}
