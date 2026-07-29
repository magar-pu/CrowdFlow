package scanner

import "time"

// ──────────── Request / Response ────────────

type CheckInRequest struct {
	QrToken     string `json:"qr_token"`
	DeviceToken string `json:"device_token"`
}

type VerifyDeviceRequest struct {
	Token string `json:"token"`
}

type VerifyDeviceResponse struct {
	Valid   bool           `json:"valid"`
	Device  *ScannerDevice `json:"device,omitempty"`
	Message string         `json:"message,omitempty"`
}

type CheckInResponse struct {
	Status       string `json:"status"`       // VALID, ALREADY_USED, INVALID, WRONG_EVENT, REFUNDED, CANCELLED, EXPIRED
	AttendeeName string `json:"attendeeName"` // Nama penonton
	TicketType   string `json:"ticketType"`   // Tier tiket (VIP, General Admission, dll)
	SeatNumber   string `json:"seatNumber"`   // Nomor kursi atau "General Seating"
	TicketID     string `json:"ticketId,omitempty"` // ID Tiket
	OrderID      string `json:"orderId,omitempty"`  // ID Order
	Message      string `json:"message"`      // Pesan deskriptif
	CheckInTime  string `json:"checkInTime"`  // Waktu check-in (untuk status ALREADY_USED)
	GateName     string `json:"gateName"`     // Nama gate (untuk status ALREADY_USED)
}

type ScannerStatusResponse struct {
	EventID   int    `json:"eventId"`
	EventName string `json:"eventName"`
	Status    string `json:"status"` // operational, closed
	TotalGates     int `json:"totalGates"`
	ActiveScanners int `json:"activeScanners"`
}

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

// ──────────── Database Entities ────────────

type EventGate struct {
	ID        int       `json:"id"`
	EventID   int       `json:"eventId"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

type ScannerDevice struct {
	ID          int       `json:"id"`
	EventID     int       `json:"eventId"`
	GateID      *int      `json:"gateId"`
	DeviceName  string    `json:"deviceName"`
	DeviceToken string    `json:"deviceToken"`
	StaffName   string    `json:"staffName"`
	Role        string    `json:"role"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
	GateName    string    `json:"gateName,omitempty"` // joined field
}

type TicketCheckIn struct {
	ID              int       `json:"id"`
	TicketID        string    `json:"ticketId"`
	EventID         int       `json:"eventId"`
	GateID          *int      `json:"gateId"`
	ScannerDeviceID *int      `json:"scannerDeviceId"`
	Status          string    `json:"status"`
	CheckedInAt     time.Time `json:"checkedInAt"`
}

// ──────────── Gate/Device Management Requests ────────────

type CreateGateRequest struct {
	Name string `json:"name"`
}

type RegisterDeviceRequest struct {
	DeviceName string `json:"deviceName"`
	GateID     *int   `json:"gateId"`
	StaffName  string `json:"staffName"`
	Role       string `json:"role"`
}

type RegisterDeviceResponse struct {
	Device      ScannerDevice `json:"device"`
	DeviceToken string        `json:"deviceToken"` // plaintext token returned once
	ScannerURL  string        `json:"scannerUrl"`  // URL to open on scanner device
}

// ──────────── Interfaces ────────────

type Repository interface {
	// Scanner Check-in
	CheckIn(eventID int, qrToken string, deviceID *int, gateID *int) (*CheckInResponse, error)

	// Event Info
	GetEventInfo(eventID int) (name string, err error)

	// Dashboard
	GetDashboardStats(eventID int) (*DashboardResponse, error)

	// Gate CRUD
	CreateGate(eventID int, name string) (*EventGate, error)
	ListGates(eventID int) ([]*EventGate, error)
	DeleteGate(gateID int, eventID int) error

	// Device CRUD
	RegisterDevice(eventID int, req *RegisterDeviceRequest, token string) (*ScannerDevice, error)
	ListDevices(eventID int) ([]*ScannerDevice, error)
	DeleteDevice(deviceID int, eventID int) error
	GetDeviceByToken(token string) (*ScannerDevice, error)

	// Logs
	LogScan(deviceID *int, eventID int, action string, detail string, ipAddress string, responseTimeMs int) error
}

type Service interface {
	CheckIn(eventID int, req *CheckInRequest) (*CheckInResponse, error)
	GetStatus(eventID int) (*ScannerStatusResponse, error)
	GetDashboard(eventID int) (*DashboardResponse, error)

	CreateGate(eventID int, name string) (*EventGate, error)
	ListGates(eventID int) ([]*EventGate, error)
	DeleteGate(gateID int, eventID int) error

	RegisterDevice(eventID int, req *RegisterDeviceRequest) (*RegisterDeviceResponse, error)
	ListDevices(eventID int) ([]*ScannerDevice, error)
	DeleteDevice(deviceID int, eventID int) error
}
