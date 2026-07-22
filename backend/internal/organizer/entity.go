package organizer

import (
	"context"
	"errors"
	"time"
)

var (
	ErrApplicationNotFound      = errors.New("organizer application not found")
	ErrApplicationAlreadyExists = errors.New("an application has already been submitted for this user")
	ErrValidation               = errors.New("validation failed")
	ErrApplicationLocked        = errors.New("cannot modify application in its current status")

	// Seat-overlay (Phase 4/5)
	ErrNoLayoutBound     = errors.New("no venue layout is bound to this event")
	ErrSeatNotInLayout   = errors.New("seat does not belong to the event's layout")
	ErrTierNotInEvent    = errors.New("ticket tier does not belong to this event")
	ErrSeatingIncomplete = errors.New("event seating is incomplete")
)

type OrganizerApplication struct {
	ID                int                  `json:"id"`
	UserID            int                  `json:"user_id"`
	BusinessName      string               `json:"business_name"`
	BusinessType      string               `json:"business_type"`
	BusinessEmail     string               `json:"business_email"`
	BusinessPhone     string               `json:"business_phone"`
	Website           *string              `json:"website,omitempty"`
	Description       *string              `json:"description,omitempty"`
	Status            string               `json:"status"` // 'pending', 'in_review', 'approved', 'rejected'
	SubmittedAt       time.Time            `json:"submitted_at"`
	ReviewedAt        *time.Time           `json:"reviewed_at,omitempty"`
	ReviewedBy        *int                 `json:"reviewed_by,omitempty"`
	Notes             *string              `json:"notes,omitempty"`
	BankName          *string              `json:"bank_name,omitempty"`
	BankAccountHolder *string              `json:"bank_account_holder,omitempty"`
	BankAccountNumber *string              `json:"bank_account_number,omitempty"`
	BusinessAddress   *string              `json:"business_address,omitempty"`
	Documents         []*OrganizerDocument `json:"documents,omitempty"`
}

type OrganizerDocument struct {
	ID            int       `json:"id"`
	ApplicationID int       `json:"application_id"`
	DocumentType  string    `json:"document_type"` // 'KTP', 'NPWP', 'NIB', etc.
	FilePath      string    `json:"-"`             // private storage object key
	PresignedURL  string    `json:"url,omitempty"` // populated dynamically at runtime
	Status        string    `json:"status"`        // 'pending_verification', 'verified', 'rejected'
	UploadedAt    time.Time `json:"uploaded_at"`
}

type ApplyRequest struct {
	BusinessName      string `json:"business_name"`
	BusinessType      string `json:"business_type"`
	BusinessEmail     string `json:"business_email"`
	BusinessPhone     string `json:"business_phone"`
	Website           string `json:"website"`
	Description       string `json:"description"`
	BankName          string `json:"bank_name"`
	BankAccountHolder string `json:"bank_account_holder"`
	BankAccountNumber string `json:"bank_account_number"`
	BusinessAddress   string `json:"business_address"`
}

type DocumentUpload struct {
	Type     string
	Filename string
	Content  []byte
}

type ApplicationResponse struct {
	ID                int                 `json:"id"`
	BusinessName      string              `json:"business_name"`
	BusinessType      string              `json:"business_type"`
	BusinessEmail     string              `json:"business_email"`
	BusinessPhone     string              `json:"business_phone"`
	Website           string              `json:"website,omitempty"`
	Description       string              `json:"description,omitempty"`
	Status            string              `json:"status"`
	SubmittedAt       string              `json:"submitted_at"`
	ReviewedAt        string              `json:"reviewed_at,omitempty"`
	Notes             string              `json:"notes,omitempty"`
	BankName          string              `json:"bank_name,omitempty"`
	BankAccountHolder string              `json:"bank_account_holder,omitempty"`
	BankAccountNumber string              `json:"bank_account_number,omitempty"`
	BusinessAddress   string              `json:"business_address,omitempty"`
	Documents         []*DocumentResponse `json:"documents"`
}

type DocumentResponse struct {
	ID           int    `json:"id"`
	DocumentType string `json:"document_type"`
	PresignedURL string `json:"url"`
	Status       string `json:"status"`
	UploadedAt   string `json:"uploaded_at"`
}

// eorganizer Dashboard models
type DashboardStats struct {
	TotalRevenue      float64 `json:"totalRevenue"`
	ActiveEvents      int     `json:"activeEvents"`
	TicketsSold       int     `json:"ticketsSold"`
	GrossSales        float64 `json:"grossSales"`
	VerificationQueue int     `json:"verificationQueue"`
	ActiveResale      int     `json:"activeResale"`
}

type RecentOrder struct {
	ID            string  `json:"id"`
	CustomerName  string  `json:"customerName"`
	CustomerEmail string  `json:"customerEmail"`
	EventName     string  `json:"eventName"`
	TicketType    string  `json:"ticketType"`
	PaymentMethod string  `json:"paymentMethod"`
	Amount        float64 `json:"amount"`
	Status        string  `json:"status"`
	Time          string  `json:"time"`
}

type RecentEvent struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Category  string  `json:"category"`
	Location  string  `json:"location"`
	VenueName string  `json:"venueName"`
	Capacity  int     `json:"capacity"`
	Sold      int     `json:"sold"`
	Revenue   float64 `json:"revenue"`
	Status    string  `json:"status"`
	Image     string  `json:"image"`
}

type DashboardResponse struct {
	Stats        DashboardStats `json:"stats"`
	RecentOrders []RecentOrder  `json:"recentOrders"`
	RecentEvents []RecentEvent  `json:"recentEvents"`
}

// eorganizer Event models
type OrganizerEvent struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Category        string  `json:"category"`
	Description     string  `json:"description"`
	Date            string  `json:"date"`
	StartDate       string  `json:"startDate"`
	StartTime       string  `json:"startTime"`
	EndDate         string  `json:"endDate"`
	EndTime         string  `json:"endTime"`
	LocationType    string  `json:"locationType"`
	Location        string  `json:"location"`
	LocationAddress string  `json:"locationAddress"`
	VenueName       string  `json:"venueName"`
	Capacity        int     `json:"capacity"`
	Sold            int     `json:"sold"`
	Revenue         float64 `json:"revenue"`
	Status          string  `json:"status"`
	Image           string  `json:"image"`
}

// Ticket Tier model
type OrganizerTicketTier struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Price       float64 `json:"price"`
	Sold        int     `json:"sold"`
	Capacity    int     `json:"capacity"`
	Status      string  `json:"status,omitempty"`
	MaxPerOrder int     `json:"maxPerOrder,omitempty"`
	SalesStart  string  `json:"salesStart,omitempty"`
	SalesEnd    string  `json:"salesEnd,omitempty"`
	Description string  `json:"description,omitempty"`
}

// Venue Section model
type VenueSection struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Type     string  `json:"type"` // "seats" | "standing"
	Capacity int     `json:"capacity"`
	Sold     int     `json:"sold"`
	Price    float64 `json:"price"`
	X        int     `json:"x"`
	Y        int     `json:"y"`
	Width    int     `json:"width"`
	Height   int     `json:"height"`
	Rows     int     `json:"rows,omitempty"`
	Cols     int     `json:"cols,omitempty"`
	Gate     string  `json:"gate"`
}

type CheckInRequest struct {
	QrToken string `json:"qr_token"`
}

type CheckInResponse struct {
	AttendeeName string `json:"attendeeName"`
	TicketType   string `json:"ticketType"`
	SeatNumber   string `json:"seatNumber"`
	Status       string `json:"status"`
}

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

type MarkReadRequest struct {
	NotificationIDs []int `json:"notificationIds"`
}

type EventRevisionFeedback struct {
	EventID             int                    `json:"eventId"`
	EventStatus         string                 `json:"eventStatus"`
	AuditorNotes        string                 `json:"auditorNotes,omitempty"`
	AssignedAuditorName string                 `json:"assignedAuditorName,omitempty"`
	Stage               string                 `json:"stage,omitempty"`
	Revisions           []*AuditorRevisionItem `json:"revisions"`
	StatusLogs          []*EventStatusLogItem  `json:"statusLogs"`
}

type RespondRevisionRequest struct {
	Comment     string `json:"comment"`
	ActionTaken string `json:"actionTaken"`
	ProofFile   string `json:"proofFile"`
}

type AuditorRevisionItem struct {
	ID                   int       `json:"id"`
	Category             string    `json:"category"`
	Title                string    `json:"title"`
	Description          string    `json:"description"`
	RequiredAction       string    `json:"requiredAction"`
	Priority             string    `json:"priority"`
	Status               string    `json:"status"`
	CreatedAt            time.Time `json:"createdAt"`
	OrganizerComment     string    `json:"organizerComment,omitempty"`
	OrganizerActionTaken string    `json:"organizerActionTaken,omitempty"`
	OrganizerFile        string    `json:"organizerFile,omitempty"`
	RespondedAt          string    `json:"respondedAt,omitempty"`
}

type EventStatusLogItem struct {
	FromStatus string    `json:"fromStatus"`
	ToStatus   string    `json:"toStatus"`
	Notes      string    `json:"notes,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

// Organizer Order model
type OrganizerOrder struct {
	ID            string  `json:"id"`
	CustomerName  string  `json:"customerName"`
	CustomerEmail string  `json:"customerEmail"`
	EventName     string  `json:"eventName"`
	TicketType    string  `json:"ticketType"`
	PaymentMethod string  `json:"paymentMethod"`
	Amount        float64 `json:"amount"`
	Status        string  `json:"status"`
	Time          string  `json:"time"`
}

// Organizer Refund model
type OrganizerRefund struct {
	ID           string  `json:"id"`
	OrderID      string  `json:"orderId"`
	CustomerName string  `json:"customerName"`
	EventName    string  `json:"eventName"`
	Amount       float64 `json:"amount"`
	Reason       string  `json:"reason"`
	Status       string  `json:"status"`
	Time         string  `json:"time"`
}

// Organizer Attendee model
type OrganizerAttendee struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	TicketType  string `json:"ticketType"`
	Status      string `json:"status"`
	CheckInTime string `json:"checkInTime,omitempty"`
	SeatNumber  string `json:"seatNumber,omitempty"`
}

// Organizer Finance model
type OrganizerFinance struct {
	GrossSales       float64 `json:"grossSales"`
	NetRevenue       float64 `json:"netRevenue"`
	PlatformFeeTotal float64 `json:"platformFeeTotal"`
	GatewayFeeTotal  float64 `json:"gatewayFeeTotal"`
	TaxTotal         float64 `json:"taxTotal"`
	RefundedAmount   float64 `json:"refundedAmount"`
	PayoutBalance    float64 `json:"payoutBalance"`
}

// Organizer Payout model
type OrganizerPayout struct {
	ID          int     `json:"id"`
	EventID     int     `json:"eventId"`
	EventName   string  `json:"eventName"`
	Amount      float64 `json:"amount"`
	Status      string  `json:"status"`
	RequestedAt string  `json:"requestedAt"`
	ProcessedAt string  `json:"processedAt,omitempty"`
}

// Organizer Analytics model
type AnalyticsPoint struct {
	Date    string  `json:"date"`
	Sales   float64 `json:"sales"`
	Tickets int     `json:"tickets"`
}

type OrganizerAnalytics struct {
	Points []AnalyticsPoint `json:"points"`
}

type Repository interface {
	Create(ctx context.Context, app *OrganizerApplication, docs []*OrganizerDocument) error
	GetByUserID(ctx context.Context, userID int) (*OrganizerApplication, error)
	GetByID(ctx context.Context, id int) (*OrganizerApplication, error)
	Update(ctx context.Context, app *OrganizerApplication) error
	Delete(ctx context.Context, id int) error

	// eorganizer methods
	GetDashboardData(ctx context.Context, organizerID int) (*DashboardResponse, error)
	ListOrganizerEvents(ctx context.Context, organizerID int) ([]*OrganizerEvent, error)
	GetOrganizerEvent(ctx context.Context, eventID int, organizerID int) (*OrganizerEvent, error)
	CreateOrganizerEvent(ctx context.Context, organizerID int, event *OrganizerEvent) error
	UpdateOrganizerEvent(ctx context.Context, eventID int, organizerID int, event *OrganizerEvent) error
	PublishOrganizerEvent(ctx context.Context, eventID int, organizerID int) error
	DeleteOrganizerEvent(ctx context.Context, eventID int, organizerID int) error
	ListTicketTiers(ctx context.Context, eventID int, organizerID int) ([]*OrganizerTicketTier, error)
	CreateTicketTier(ctx context.Context, eventID int, organizerID int, tier *OrganizerTicketTier) error
	UpdateTicketTier(ctx context.Context, eventID int, organizerID int, tierID int, tier *OrganizerTicketTier) error
	DeleteTicketTier(ctx context.Context, eventID int, organizerID int, tierID int) error
	ListOrders(ctx context.Context, organizerID int) ([]*OrganizerOrder, error)
	GetOrderDetails(ctx context.Context, orderID string, organizerID int) (*OrganizerOrder, error)
	ListRefunds(ctx context.Context, organizerID int) ([]*OrganizerRefund, error)
	ListAttendees(ctx context.Context, organizerID int) ([]*OrganizerAttendee, error)
	ListEventAttendees(ctx context.Context, eventID int, organizerID int) ([]*OrganizerAttendee, error)
	GetFinanceSummary(ctx context.Context, organizerID int) (*OrganizerFinance, error)
	ListPayouts(ctx context.Context, organizerID int) ([]*OrganizerPayout, error)
	CreatePayoutRequest(ctx context.Context, eventID int, organizerID int, amount float64) error
	GetAnalytics(ctx context.Context, organizerID int, dateRange string) (*OrganizerAnalytics, error)
	GetEventAnalytics(ctx context.Context, eventID int, organizerID int, dateRange string) (*OrganizerAnalytics, error)
	GetEventSeating(ctx context.Context, eventID int, organizerID int) (*EventSeatingResponse, error)
	SeedEventSeating(ctx context.Context, eventID int, organizerID int, assignments []SeatingAssignment) error
	CheckInAttendee(ctx context.Context, eventID int, organizerID int, qrToken string) (*CheckInResponse, error)
	ListNotifications(ctx context.Context, userID int) ([]*Notification, error)
	MarkNotificationsRead(ctx context.Context, userID int, notificationIDs []int) error
	GetEventRevisions(ctx context.Context, eventID int, organizerID int) (*EventRevisionFeedback, error)
	RespondToEventRevision(ctx context.Context, eventID, revID, organizerID int, req RespondRevisionRequest) error
}

type Service interface {
	Apply(ctx context.Context, userID int, req ApplyRequest, docs []*DocumentUpload) (*OrganizerApplication, error)
	GetApplication(ctx context.Context, userID int) (*OrganizerApplication, error)
	UpdateApplication(ctx context.Context, userID int, req ApplyRequest, newDocs []*DocumentUpload) (*OrganizerApplication, error)
	DeleteApplication(ctx context.Context, userID int) error

	// eorganizer methods
	GetDashboardData(ctx context.Context, organizerID int) (*DashboardResponse, error)
	ListOrganizerEvents(ctx context.Context, organizerID int) ([]*OrganizerEvent, error)
	GetOrganizerEvent(ctx context.Context, eventID int, organizerID int) (*OrganizerEvent, error)
	CreateOrganizerEvent(ctx context.Context, organizerID int, event *OrganizerEvent) error
	UpdateOrganizerEvent(ctx context.Context, eventID int, organizerID int, event *OrganizerEvent) error
	PublishOrganizerEvent(ctx context.Context, eventID int, organizerID int) error
	DeleteOrganizerEvent(ctx context.Context, eventID int, organizerID int) error
	GetEventSeating(ctx context.Context, eventID int, organizerID int) (*EventSeatingResponse, error)
	SeedEventSeating(ctx context.Context, eventID int, organizerID int, req SeedSeatingRequest) error
	CheckInAttendee(ctx context.Context, eventID int, organizerID int, qrToken string) (*CheckInResponse, error)
	ListTicketTiers(ctx context.Context, eventID int, organizerID int) ([]*OrganizerTicketTier, error)
	CreateTicketTier(ctx context.Context, eventID int, organizerID int, tier *OrganizerTicketTier) error
	UpdateTicketTier(ctx context.Context, eventID int, organizerID int, tierID int, tier *OrganizerTicketTier) error
	DeleteTicketTier(ctx context.Context, eventID int, organizerID int, tierID int) error
	ListOrders(ctx context.Context, organizerID int) ([]*OrganizerOrder, error)
	GetOrderDetails(ctx context.Context, orderID string, organizerID int) (*OrganizerOrder, error)
	ListRefunds(ctx context.Context, organizerID int) ([]*OrganizerRefund, error)
	ListAttendees(ctx context.Context, organizerID int) ([]*OrganizerAttendee, error)
	ListEventAttendees(ctx context.Context, eventID int, organizerID int) ([]*OrganizerAttendee, error)
	GetFinanceSummary(ctx context.Context, organizerID int) (*OrganizerFinance, error)
	ListPayouts(ctx context.Context, organizerID int) ([]*OrganizerPayout, error)
	CreatePayoutRequest(ctx context.Context, eventID int, organizerID int, amount float64) error
	GetAnalytics(ctx context.Context, organizerID int, dateRange string) (*OrganizerAnalytics, error)
	GetEventAnalytics(ctx context.Context, eventID int, organizerID int, dateRange string) (*OrganizerAnalytics, error)
	GetEventRevisions(ctx context.Context, eventID int, organizerID int) (*EventRevisionFeedback, error)
	RespondToEventRevision(ctx context.Context, eventID, revID, organizerID int, req RespondRevisionRequest) error
	ListNotifications(ctx context.Context, userID int) ([]*Notification, error)
	MarkNotificationsRead(ctx context.Context, userID int, notificationIDs []int) error
}

func MapApplication(app *OrganizerApplication) *ApplicationResponse {
	websiteVal := ""
	if app.Website != nil {
		websiteVal = *app.Website
	}
	descVal := ""
	if app.Description != nil {
		descVal = *app.Description
	}
	reviewedVal := ""
	if app.ReviewedAt != nil {
		reviewedVal = app.ReviewedAt.Format(time.RFC3339)
	}
	notesVal := ""
	if app.Notes != nil {
		notesVal = *app.Notes
	}
	bankNameVal := ""
	if app.BankName != nil {
		bankNameVal = *app.BankName
	}
	bankAccountHolderVal := ""
	if app.BankAccountHolder != nil {
		bankAccountHolderVal = *app.BankAccountHolder
	}
	bankAccountNumberVal := ""
	if app.BankAccountNumber != nil {
		bankAccountNumberVal = *app.BankAccountNumber
	}
	businessAddressVal := ""
	if app.BusinessAddress != nil {
		businessAddressVal = *app.BusinessAddress
	}

	docResponses := make([]*DocumentResponse, len(app.Documents))
	for i, d := range app.Documents {
		docResponses[i] = &DocumentResponse{
			ID:           d.ID,
			DocumentType: d.DocumentType,
			PresignedURL: d.PresignedURL,
			Status:       d.Status,
			UploadedAt:   d.UploadedAt.Format(time.RFC3339),
		}
	}

	return &ApplicationResponse{
		ID:                app.ID,
		BusinessName:      app.BusinessName,
		BusinessType:      app.BusinessType,
		BusinessEmail:     app.BusinessEmail,
		BusinessPhone:     app.BusinessPhone,
		Website:           websiteVal,
		Description:       descVal,
		Status:            app.Status,
		SubmittedAt:       app.SubmittedAt.Format(time.RFC3339),
		ReviewedAt:        reviewedVal,
		Notes:             notesVal,
		BankName:          bankNameVal,
		BankAccountHolder: bankAccountHolderVal,
		BankAccountNumber: bankAccountNumberVal,
		BusinessAddress:   businessAddressVal,
		Documents:         docResponses,
	}
}
