package scanner

import "time"

// ──────────── Check-In: Request / Response ────────────
// Shape is the frozen contract (CONTRACT.md section 2) — do not rename
// fields or add a fallback path.

type CheckInRequest struct {
	QrPayload string `json:"qr_payload"`
	GateID    *int   `json:"gate_id"`
}

// AttendeeInfo carries decrypted PII and is only ever populated on VALID and
// ALREADY_USED. Every other status leaves this nil — a rejected scan must
// not leak PII (CONTRACT.md section 2).
type AttendeeInfo struct {
	FullName string `json:"fullName"`
	Nik      string `json:"nik"`
	Phone    string `json:"phone"`
	Dob      string `json:"dob"`
}

type CheckInResponse struct {
	Status      string        `json:"status"`
	TicketID    string        `json:"ticketId,omitempty"`
	OrderID     string        `json:"orderId,omitempty"`
	Attendee    *AttendeeInfo `json:"attendee"`
	TierID      int           `json:"tierId,omitempty"`
	TierName    string        `json:"tierName,omitempty"`
	SeatLabel   string        `json:"seatLabel,omitempty"`
	CheckInTime string        `json:"checkInTime,omitempty"`
	GateName    string        `json:"gateName,omitempty"`
	Message     string        `json:"message"`
}

// ──────────── Manual Reject (mitigation M1) ────────────

type RejectRequest struct {
	TicketID string `json:"ticket_id"`
	Reason   string `json:"reason"`
	Note     string `json:"note"`
}

// ──────────── Dashboard ────────────

type DashboardResponse struct {
	EventID        int              `json:"eventId"`
	EventName      string           `json:"eventName"`
	TotalCheckedIn int              `json:"totalCheckedIn"`
	TotalCapacity  int              `json:"totalCapacity"`
	GateStats      []GateStat       `json:"gateStats"`
	RecentScans    []RecentScanItem `json:"recentScans"`
}

type GateStat struct {
	GateID   int    `json:"gateId"`
	GateName string `json:"gateName"`
	Scans    int    `json:"scans"`
	Status   string `json:"status"`
}

type RecentScanItem struct {
	AttendeeName string `json:"attendeeName"`
	TicketType   string `json:"ticketType"`
	GateName     string `json:"gateName"`
	Status       string `json:"status"`
	CheckedInAt  string `json:"checkedInAt"`
}

// ──────────── Own Scan Log (decision 13) ────────────

type ScanLogEntry struct {
	Action    string    `json:"action"`
	Detail    string    `json:"detail"`
	CreatedAt time.Time `json:"createdAt"`
}

// ──────────── Gate CRUD (organizer console) ────────────

type EventGate struct {
	ID        int       `json:"id"`
	EventID   int       `json:"eventId"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

type CreateGateRequest struct {
	Name string `json:"name"`
}

// ──────────── Interfaces ────────────

// ticketForCheckIn is everything CheckIn needs about the scanned ticket, read
// in one query so the check order in the service layer never needs a second
// round trip mid-decision.
type ticketForCheckIn struct {
	TicketID       string
	OrderID        string
	EventID        int
	TierID         int
	TierName       string
	TicketStatus   string
	SecretKey      string
	EventSeatsID   *int
	AttendeeName   string
	AttendeeNikEnc []byte
	AttendeePhone  string
	AttendeeDob    *time.Time
}

type Repository interface {
	FindTicketByID(ticketID string) (*ticketForCheckIn, error)
	StaffHasTierGrant(staffID, tierID int) (bool, error)
	StaffGateGrants(staffID int) ([]int, error)
	OriginalCheckIn(ticketID string) (checkedAt time.Time, gateName string, err error)
	SeatLabel(esmID int) (string, error)
	GateName(gateID int) (string, error)
	MarkUsedAndInsertCheckin(ticketID string, eventID int, gateID *int, staffID int) error
	LogScan(staffID int, eventID int, action string, detail string) error

	GetEventName(eventID int) (string, error)
	GetDashboardStats(eventID int) (*DashboardResponse, error)
	OwnScanLog(staffID int, limit int) ([]*ScanLogEntry, error)

	CreateGate(eventID int, name string) (*EventGate, error)
	ListGates(eventID int) ([]*EventGate, error)
	DeleteGate(gateID int, eventID int) error
}

type Service interface {
	CheckIn(eventID int, staffID int, req *CheckInRequest) (*CheckInResponse, error)
	Reject(eventID int, staffID int, req *RejectRequest) error
	GetDashboard(eventID int) (*DashboardResponse, error)
	GetOwnScanLog(staffID int) ([]*ScanLogEntry, error)

	CreateGate(eventID int, name string) (*EventGate, error)
	ListGates(eventID int) ([]*EventGate, error)
	DeleteGate(gateID int, eventID int) error
}
