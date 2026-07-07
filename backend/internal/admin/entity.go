package admin

// NOTE: JSON field names in this package intentionally use camelCase (not the
// snake_case convention used by the public event/auth APIs) because they mirror
// frontend/src/types/admin.ts exactly - that admin frontend was already built
// against this exact shape.

type DashboardStats struct {
	TotalEvents  int     `json:"totalEvents"`
	TotalUsers   int     `json:"totalUsers"`
	TotalRevenue float64 `json:"totalRevenue"`
	TicketsSold  int     `json:"ticketsSold"`
}

type Event struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Date         string  `json:"date"`
	Venue        string  `json:"venue"`
	Location     string  `json:"location"`
	Status       string  `json:"status"` // "Active" | "Draft" | "Completed"
	Image        string  `json:"image"`
	Capacity     int     `json:"capacity"`
	TicketsSold  int     `json:"ticketsSold"`
	TotalRevenue float64 `json:"totalRevenue"`
	Category     string  `json:"category"`
	Description  string  `json:"description"`
}

type User struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Email             string `json:"email"`
	Role              string `json:"role"`   // "Buyer" | "Seller" | "Organizer" | "Admin"
	Status            string `json:"status"` // "Verified" | "Pending" | "Suspended"
	JoinedAt          string `json:"joinedAt"`
	TransactionsCount int    `json:"transactionsCount"`
	ProfilePic        string `json:"profilePic"`
}

type Transaction struct {
	ID           string  `json:"id"`
	CustomerName string  `json:"customerName"`
	EventName    string  `json:"eventName"`
	Amount       float64 `json:"amount"`
	Method       string  `json:"method"` // raw payment_method value from DB - see repository.go note
	Status       string  `json:"status"` // "Success" | "Pending" | "Refunded"
	Date         string  `json:"date"`
}

// Payout, Scanner, VerificationApplication, SecurityAlert, and Activity have no
// backing tables yet. Structs kept here so handler.go can return correctly
// shaped placeholder payloads - see service.go for the TODO covering real
// implementations once the underlying schema exists.

type Payout struct {
	ID            string  `json:"id"`
	OrganizerName string  `json:"organizerName"`
	EventName     string  `json:"eventName"`
	Amount        float64 `json:"amount"`
	Status        string  `json:"status"`
	RequestedDate string  `json:"requestedDate"`
}

type Scanner struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	DeviceName      string `json:"deviceName"`
	Status          string `json:"status"`
	ScansCount      int    `json:"scansCount"`
	LastSync        string `json:"lastSync"`
	BatteryLevel    int    `json:"batteryLevel"`
	AssignedSection string `json:"assignedSection"`
}

type VerificationApplication struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	BusinessType string `json:"businessType"`
	DocumentType string `json:"documentType"`
	SubmittedAt  string `json:"submittedAt"`
	Status       string `json:"status"`
}

type SecurityAlert struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Type        string `json:"type"`
	Description string `json:"description"`
	Severity    string `json:"severity"`
	Timestamp   string `json:"timestamp"`
}

type Activity struct {
	ID        string `json:"id"`
	UserName  string `json:"userName"`
	Action    string `json:"action"`
	Detail    string `json:"detail"`
	Timestamp string `json:"timestamp"`
}

type TicketTier struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Price    float64 `json:"price"`
	Capacity int     `json:"capacity"`
	Sold     int     `json:"sold"`
	PriceCap float64 `json:"priceCap"` // not modeled in DB yet - see repository.go note
	Color    string  `json:"color"`    // UI-only, not persisted
}

type VenueSection struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Capacity int    `json:"capacity"`
	Occupied int    `json:"occupied"` // not computed yet - see repository.go note
	Color    string `json:"color"`    // UI-only, not persisted
}

type Repository interface {
	GetDashboardStats() (*DashboardStats, error)
	ListEvents(limit, offset int) ([]*Event, error)
	ListUsers() ([]*User, error)
	ListTransactions() ([]*Transaction, error)
	GetTicketTiers(eventID int) ([]*TicketTier, error)
	UpdateTicketTiers(eventID int, tiers []*TicketTier) error
	GetVenueSections(eventID int) ([]*VenueSection, error)
	UpdateVenueSections(eventID int, sections []*VenueSection) error
	UpdateUserStatus(userID int, status string) error
	UpdateTransactionStatus(orderID string, status string) error
}

type Service interface {
	GetDashboardStats() (*DashboardStats, error)
	ListEvents(limit, offset int) ([]*Event, error)
	ListUsers() ([]*User, error)
	ListTransactions() ([]*Transaction, error)
	GetTicketTiers(eventID int) ([]*TicketTier, error)
	UpdateTicketTiers(eventID int, tiers []*TicketTier) error
	GetVenueSections(eventID int) ([]*VenueSection, error)
	UpdateVenueSections(eventID int, sections []*VenueSection) error
	UpdateUserStatus(userID int, status string) error
	UpdateTransactionStatus(orderID string, status string) error

	// Placeholder-backed - see service.go
	ListPayouts() ([]*Payout, error)
	ListScanners(eventID int) ([]*Scanner, error)
	ListSecurityAlerts() ([]*SecurityAlert, error)
	ListActivities() ([]*Activity, error)
	ListVerifications() ([]*VerificationApplication, error)
}
