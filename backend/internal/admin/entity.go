package admin

import "time"

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

// AnalyticsPoint is one bucket of the platform analytics time series. Buckets
// are days for 7d, weeks for 30d, months for 90d — whatever keeps the bar count
// readable for the range.
type AnalyticsPoint struct {
	Label         string  `json:"label"`
	Revenue       float64 `json:"revenue"`
	Registrations int     `json:"registrations"`
	Events        int     `json:"events"`
	TicketsSold   int     `json:"ticketsSold"`
}

// RevenueBreakdown splits paid orders into the components the orders table
// actually records. Every field is a summed column, not an assumed percentage:
// the dashboard used to hardcode a 72/18/10 tickets/fees/resale split that
// corresponded to nothing.
type RevenueBreakdown struct {
	TicketFaceValue  float64 `json:"ticketFaceValue"`
	PlatformFee      float64 `json:"platformFee"`
	GatewayFee       float64 `json:"gatewayFee"`
	EntertainmentTax float64 `json:"entertainmentTax"`
	GrossTotal       float64 `json:"grossTotal"`
}

// PlatformAnalytics backs the admin dashboard's Platform Analytics chart and
// Revenue Breakdown donut.
type PlatformAnalytics struct {
	Range     string            `json:"range"`
	Series    []*AnalyticsPoint `json:"series"`
	Breakdown RevenueBreakdown  `json:"breakdown"`
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

// RoleAssignment is one of a user's user_roles rows, mapped to the admin
// frontend's display vocabulary: the role plus the event it is scoped to
// (nil for a platform-wide grant like Super Admin or a platform Event
// Organizer). Event-scoped Event Organizer / Auditor / Gate Scanner rows carry
// EventID + EventName so the profile can show "Organizer - Event A" etc.
type RoleAssignment struct {
	RoleID    int    `json:"roleId"`
	Role      string `json:"role"`
	EventID   *int   `json:"eventId"`
	EventName string `json:"eventName,omitempty"`
}

type User struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	// Role is a single collapsed label for list badges: the user's one console
	// role, "Mixed" when they hold more than one distinct console role, or
	// "Buyer" when they hold none. See RoleAssignments for the breakdown.
	Role              string           `json:"role"` // "Buyer" | "Organizer" | "Auditor" | "Gate Scanner" | "Admin" | "Mixed"
	RoleAssignments   []RoleAssignment `json:"roleAssignments"`
	Status            string           `json:"status"` // "Verified" | "Pending" | "Suspended"
	JoinedAt          string           `json:"joinedAt"`
	TransactionsCount int              `json:"transactionsCount"`
	ProfilePic        string           `json:"profilePic"`
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

// Scanner, VerificationApplication, and SecurityAlert have no backing tables
// yet. Structs kept here so handler.go can return correctly shaped
// placeholder payloads - see service.go for the TODO covering real
// implementations once the underlying schema exists. Payout and Activity are
// now backed by the payouts/activity_log tables (migrations/0001_payouts_and_activity_log.sql).

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
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Capacity    int     `json:"capacity"`
	Sold        int     `json:"sold"`
	PriceCap    float64 `json:"priceCap"` // not modeled in DB yet - see repository.go note
	Color       string  `json:"color"`    // UI-only, not persisted
}

type VenueSection struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Capacity int    `json:"capacity"`
	Occupied int    `json:"occupied"` // not computed yet - see repository.go note
	Color    string `json:"color"`    // UI-only, not persisted
}

type EventStatusLogEntry struct {
	ID         string `json:"id"`
	ActorName  string `json:"actorName"`
	FromStatus string `json:"fromStatus"`
	ToStatus   string `json:"toStatus"`
	Notes      string `json:"notes"`
	CreatedAt  string `json:"createdAt"`
}

// Notification mirrors auditor.AuditorNotification field-for-field so the two
// consoles' header bells can share one frontend shape. Both read the same
// `notifications` table; Super Admins already receive rows from
// auditor.CreateNotificationForAuditors, which targets role_name IN
// ('Auditor', 'Super Admin').
type Notification struct {
	ID           int       `json:"id"`
	UserID       int       `json:"userId"`
	Title        string    `json:"title"`
	Detail       string    `json:"detail"`
	ResourceType string    `json:"resourceType"`
	ResourceID   string    `json:"resourceId"`
	IsRead       bool      `json:"isRead"`
	CreatedAt    time.Time `json:"createdAt"`
}

type MarkNotificationsReadRequest struct {
	NotificationIDs []int `json:"notificationIds"`
}

type Repository interface {
	GetDashboardStats() (*DashboardStats, error)
	GetPlatformAnalytics(rangeKey string) (*PlatformAnalytics, error)
	ListEvents(limit, offset int) ([]*Event, error)
	ApproveEvent(eventID, auditorID int, notes string) error
	RejectEvent(eventID, auditorID int, notes string) error
	SetEventStatus(eventID int, status string, actorID int) error
	ListEventStatusLog(eventID int) ([]*EventStatusLogEntry, error)
	ListUsers(limit, offset int) ([]*User, error)
	ListTransactions(limit, offset int) ([]*Transaction, error)
	GetTicketTiers(eventID int) ([]*TicketTier, error)
	UpdateTicketTiers(eventID int, tiers []*TicketTier) error
	DeleteTicketTier(eventID, tierID int) error
	UpdateUserStatus(userID int, status string, actorID int) error
	GrantUserRole(userID int, roleID int, eventID *int, actorID int) error
	RevokeUserRole(userID int, roleID int, eventID *int, actorID int) error
	UpdateTransactionStatus(orderID string, status string, actorID int) error
	ListVerifications(limit, offset int) ([]*VerificationApplication, error)

	ListPayouts(limit, offset int) ([]*Payout, error)
	ProcessPayout(payoutID string, actorID int) error
	RejectPayout(payoutID string, actorID int) error
	ListActivities() ([]*Activity, error)
	ListNotifications(userID int) ([]*Notification, error)
	MarkNotificationsRead(userID int, notificationIDs []int) error
}

type Service interface {
	GetDashboardStats() (*DashboardStats, error)
	GetPlatformAnalytics(rangeKey string) (*PlatformAnalytics, error)
	ListEvents(limit, offset int) ([]*Event, error)
	ApproveEvent(eventID, auditorID int, notes string) error
	RejectEvent(eventID, auditorID int, notes string) error
	SetEventStatus(eventID int, status string, actorID int) error
	ListEventStatusLog(eventID int) ([]*EventStatusLogEntry, error)
	ListUsers(limit, offset int) ([]*User, error)
	ListTransactions(limit, offset int) ([]*Transaction, error)
	GetTicketTiers(eventID int) ([]*TicketTier, error)
	UpdateTicketTiers(eventID int, tiers []*TicketTier) error
	DeleteTicketTier(eventID, tierID int) error
	UpdateUserStatus(userID int, status string, actorID int) error
	GrantUserRole(userID int, roleID int, eventID *int, actorID int) error
	RevokeUserRole(userID int, roleID int, eventID *int, actorID int) error
	UpdateTransactionStatus(orderID string, status string, actorID int) error
	ListVerifications(limit, offset int) ([]*VerificationApplication, error)

	ListPayouts(limit, offset int) ([]*Payout, error)
	ProcessPayout(payoutID string, actorID int) error
	RejectPayout(payoutID string, actorID int) error
	ListActivities() ([]*Activity, error)
	ListNotifications(userID int) ([]*Notification, error)
	MarkNotificationsRead(userID int, notificationIDs []int) error

	// Placeholder-backed - see service.go
	ListScanners(eventID int) ([]*Scanner, error)
	ListSecurityAlerts() ([]*SecurityAlert, error)
}
