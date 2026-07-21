package auditor

import (
	"context"
	"time"
)

// ---- Sentinel Errors ----

var (
	ErrNotFound   = newAuditorError("not found")
	ErrValidation = newAuditorError("validation failed")
	ErrForbidden  = newAuditorError("forbidden")
)

type auditorError struct{ msg string }

func (e *auditorError) Error() string     { return e.msg }
func newAuditorError(msg string) error    { return &auditorError{msg: msg} }
func isAuditorError(target, err error) bool {
	te, ok1 := target.(*auditorError)
	ee, ok2 := err.(*auditorError)
	return ok1 && ok2 && te.msg == ee.msg
}

// ---- Shared enums / value types ----

type ReviewStage string

const (
	StageSubmitted            ReviewStage = "Submitted"
	StageDocumentVerification ReviewStage = "Document Verification"
	StageEventValidation      ReviewStage = "Event Validation"
	StageFinalApproval        ReviewStage = "Final Approval"
)

type RiskLevel string

const (
	RiskLow      RiskLevel = "Low"
	RiskMedium   RiskLevel = "Medium"
	RiskHigh     RiskLevel = "High"
	RiskCritical RiskLevel = "Critical"
)

// ---- Dashboard ----

type DashboardStats struct {
	PendingReviews      int     `json:"pendingReviews"`
	Approved            int     `json:"approved"`
	Rejected            int     `json:"rejected"`
	PendingOrganizers   int     `json:"pendingOrganizers"`
	DocumentsWaiting    int     `json:"documentsWaiting"`
	PendingPayouts      int     `json:"pendingPayouts"`
	PendingPayoutAmount float64 `json:"pendingPayoutAmount"`
	FraudAlerts         int     `json:"fraudAlerts"`
	AvgReviewTimeHours  float64 `json:"avgReviewTimeHours"`
}

type DashboardResponse struct {
	Stats        DashboardStats  `json:"stats"`
	RecentActivity []Activity    `json:"recentActivity"`
	ReviewQueue  []EventReview   `json:"reviewQueue"`
}

// ---- Activity ----

type Activity struct {
	ID        int    `json:"id"`
	ActorName string `json:"actor"`
	Action    string `json:"action"`
	Detail    string `json:"detail"`
	CreatedAt string `json:"timestamp"`
}

// ---- Event Reviews ----

type EventReview struct {
	ID              int            `json:"id"`
	EventName       string         `json:"eventName"`
	OrganizerName   string         `json:"organizerName"`
	OrganizerAvatar string         `json:"organizerAvatar"`
	BannerURL       string         `json:"bannerUrl"`
	Category        string         `json:"category"`
	SubmittedAt     string         `json:"submittedAt"`
	LastUpdated     string         `json:"lastUpdated"`
	Stage           ReviewStage    `json:"stage"`
	Status          string         `json:"status"` // pending_review, approved, rejected
	RiskLevel       RiskLevel      `json:"riskLevel"`
	ComplianceScore int            `json:"complianceScore"`
	MissingDocs     int            `json:"missingDocs"`
	AssignedAuditor string         `json:"assignedAuditor"`
	Venue           string         `json:"venue"`
	Date            string         `json:"date"`
	Capacity        int            `json:"capacity"`
	Notes           string         `json:"notes"`
	Documents       []ReviewDoc    `json:"documents"`
	Finance         ReviewFinance  `json:"finance"`
	History         []StatusEntry  `json:"history"`
	Revisions       []Revision     `json:"revisions"`
}

type ReviewDoc struct {
	ID           int    `json:"id"`
	DocumentType string `json:"name"`
	Category     string `json:"category"`
	Status       string `json:"status"`
	FileURL      string `json:"fileUrl"`
	UploadedAt   string `json:"uploadDate"`
}

type ReviewFinance struct {
	ProjectedRevenue float64            `json:"projectedRevenue"`
	PlatformFee      float64            `json:"platformFee"`
	GatewayFee       float64            `json:"gatewayFee"`
	TaxAmount        float64            `json:"taxAmount"`
	NetPayout        float64            `json:"netPayout"`
	TaxRate          float64            `json:"taxRate"`
	TicketTiers      []ReviewTicketTier `json:"ticketTiers"`
	TaxConfig        ReviewTaxConfig    `json:"taxConfig"`
	Payout           ReviewPayout       `json:"payout"`
}

type ReviewTicketTier struct {
	Category string  `json:"category"`
	Price    float64 `json:"price"`
	Seats    int     `json:"seats"`
	Status   string  `json:"status"` // Available, Sold Out
}

type ReviewTaxConfig struct {
	EntertainmentTax float64 `json:"entertainmentTax"`
	Ppn              float64 `json:"ppn"`
	Region           string  `json:"region"`
	TaxPercentage    float64 `json:"taxPercentage"`
	RegionMatch      bool    `json:"regionMatch"`
	TaxApplied       bool    `json:"taxApplied"`
	PpnApplied       bool    `json:"ppnApplied"`
}

type ReviewPayout struct {
	Bank            string  `json:"bank"`
	AccountName     string  `json:"accountName"`
	AccountNumber   string  `json:"accountNumber"`
	EstimatedPayout float64 `json:"estimatedPayout"`
	Verified        bool    `json:"verified"`
}

type StatusEntry struct {
	ActorName  string `json:"actorName"`
	FromStatus string `json:"fromStatus"`
	ToStatus   string `json:"toStatus"`
	Notes      string `json:"notes"`
	CreatedAt  string `json:"createdAt"`
}

type Revision struct {
	ID                   int    `json:"id"`
	Category             string `json:"category"`
	Title                string `json:"title"`
	Description          string `json:"description"`
	RequiredAction       string `json:"requiredAction"`
	Priority             string `json:"priority"`
	Status               string `json:"status"`
	Deadline             string `json:"deadline"`
	CreatedAt            string `json:"createdAt"`
	OrganizerComment     string `json:"organizerComment,omitempty"`
	OrganizerActionTaken string `json:"organizerActionTaken,omitempty"`
	OrganizerFile        string `json:"organizerFile,omitempty"`
	RespondedAt          string `json:"respondedAt,omitempty"`
}

type EventReviewFilters struct {
	Status    string
	RiskLevel string
	Search    string
	Page      int
	Limit     int
}

// ---- Event Review Requests ----

type ApproveEventRequest struct {
	Notes string `json:"notes"`
}

type RejectEventRequest struct {
	Reason string `json:"reason"`
	Notes  string `json:"notes"`
}

type RequestChangesRequest struct {
	Notes string `json:"notes"`
}

type UpdateStageRequest struct {
	Stage ReviewStage `json:"stage"`
}

type AddRevisionRequest struct {
	Category       string `json:"category"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	RequiredAction string `json:"requiredAction"`
	Priority       string `json:"priority"`
	Deadline       string `json:"deadline"`
}

type UpdateRevisionStatusRequest struct {
	Status string `json:"status"`
}

type RejectDocumentRequest struct {
	Reason string `json:"reason"`
}

// ---- Organizer Verification ----

type OrganizerVerification struct {
	ID                int                  `json:"id"`
	Name              string               `json:"name"`
	CompanyName       string               `json:"companyName"`
	Status            string               `json:"status"` // pending, in_review, approved, rejected
	RegistrationDate  string               `json:"registrationDate"`
	LastActivity      string               `json:"lastActivity"`
	BusinessType      string               `json:"businessType"`
	PicEmail          string               `json:"picEmail"`
	PicPhone          string               `json:"picPhone"`
	Website           string               `json:"website"`
	Description       string               `json:"description"`
	InternalNotes     string               `json:"internalNotes"`
	PendingDocCount   int                  `json:"pendingDocCount"`
	Documents         []ReviewDoc          `json:"documents"`
	History           []OrganizerHistoryEntry `json:"history"`
	BankName          string               `json:"bankName"`
	BankAccountHolder string               `json:"bankAccountHolder"`
	BankAccountNumber string               `json:"bankAccountNumber"`
	Address           string               `json:"address"`
}

type OrganizerHistoryEntry struct {
	Action    string `json:"action"`
	Actor     string `json:"actor"`
	Timestamp string `json:"timestamp"`
	Notes     string `json:"details"`
}

type OrganizerFilters struct {
	Status string
	Search string
	Page   int
	Limit  int
}

type UpdateOrganizerStatusRequest struct {
	Status            string `json:"status"`
	InternalNotes     string `json:"internalNotes"`
	OrganizerFeedback string `json:"organizerFeedback"`
}

type ApproveOrganizerRequest struct {
	Notes string `json:"notes"`
}

type RejectOrganizerRequest struct {
	Reason string `json:"reason"`
	Notes  string `json:"notes"`
}

// ---- Documents ----

type Document struct {
	ID             int    `json:"id"`
	ApplicationID  int    `json:"applicationId"`
	DocumentType   string `json:"fileName"`
	Category       string `json:"category"`
	EventName      string `json:"eventName"`
	OrganizerName  string `json:"organizerName"`
	Status         string `json:"status"`
	FileURL        string `json:"fileUrl"`
	UploadedAt     string `json:"uploadedAt"`
}

type DocumentFilters struct {
	Status   string
	Category string
	Search   string
	Page     int
	Limit    int
}

// ---- Payout Verification ----

type AuditorPayout struct {
	ID              int            `json:"id"`
	OrganizerName   string         `json:"organizerName"`
	OrganizerEmail  string         `json:"organizerEmail"`
	EventName       string         `json:"eventName"`
	EventDate       string         `json:"eventDate"`
	RequestedAmount float64        `json:"requestedAmount"`
	RequestDate     string         `json:"requestDate"`
	Status          string         `json:"status"`
	RiskLevel       RiskLevel      `json:"riskLevel"`
	RiskScore       int            `json:"riskScore"`
	SalesSummary    PayoutSales    `json:"salesSummary"`
	BankName                  string         `json:"bankName"`
	BankAccountNum            string         `json:"bankAccountNumber"`
	BankHolder                string         `json:"bankAccountHolder"`
	OrganizerPhone            string         `json:"organizerPhone"`
	OrganizerBusinessLicense  string         `json:"organizerBusinessLicense"`
	OrganizerStatus           string         `json:"organizerStatus"`
	FraudDetection            FraudSignals   `json:"fraudDetection"`
	InternalNotes             string         `json:"internalNotes"`
	Timeline                  []Activity     `json:"timeline"`
}

type PayoutSales struct {
	TicketsSold     int     `json:"ticketsSold"`
	GrossRevenue    float64 `json:"grossRevenue"`
	PlatformFee     float64 `json:"platformFee"`
	GatewayFee      float64 `json:"paymentGatewayFee"`
	EntertainmentTax float64 `json:"entertainmentTax"`
	RefundAmount    float64 `json:"refundAmount"`
	NetRevenue      float64 `json:"netRevenue"`
}

type FraudSignals struct {
	DuplicatePayout     bool   `json:"duplicatePayout"`
	SuspiciousRevenue   bool   `json:"suspiciousRevenue"`
	UnusualRefundRate   bool   `json:"unusualRefundRate"`
	HighChargeback      bool   `json:"highChargeback"`
	HasAlert            bool   `json:"hasAlert"`
	AlertMessage        string `json:"alertMessage"`
}

type PayoutFilters struct {
	Status    string
	RiskLevel string
	Search    string
	Page      int
	Limit     int
}

type ApprovePayoutRequest struct {
	InternalNotes string `json:"internalNotes"`
	FinanceNotes  string `json:"financeNotes"`
}

type RejectPayoutRequest struct {
	Reason        string `json:"reason"`
	InternalNotes string `json:"internalNotes"`
}

type HoldPayoutRequest struct {
	Reason string `json:"reason"`
}

// ---- Notifications ----

type AuditorNotification struct {
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

// ---- Repository Interface ----

type Repository interface {
	// Dashboard
	GetDashboardStats(ctx context.Context) (*DashboardStats, error)
	ListRecentActivity(ctx context.Context, limit int) ([]*Activity, error)
	ListReviewQueue(ctx context.Context, limit int) ([]*EventReview, error)

	// Event Reviews
	ListEventReviews(ctx context.Context, filters EventReviewFilters) ([]*EventReview, error)
	GetEventReview(ctx context.Context, eventID int) (*EventReview, error)
	ApproveEventReview(ctx context.Context, eventID, actorID int, notes string) error
	RejectEventReview(ctx context.Context, eventID, actorID int, reason, notes string) error
	RequestEventChanges(ctx context.Context, eventID, actorID int, notes string) error
	UpdateEventReviewStage(ctx context.Context, eventID, actorID int, stage ReviewStage) error
	AddEventRevision(ctx context.Context, eventID, actorID int, req AddRevisionRequest) error
	UpdateRevisionStatus(ctx context.Context, revID, actorID int, status string) error
	VerifyReviewDocument(ctx context.Context, docID, actorID int) error
	RejectReviewDocument(ctx context.Context, docID, actorID int, reason string) error

	// Documents
	ListDocuments(ctx context.Context, filters DocumentFilters) ([]*Document, error)
	GetDocument(ctx context.Context, docID int) (*Document, error)
	VerifyDocument(ctx context.Context, docID, actorID int) error
	RejectDocument(ctx context.Context, docID, actorID int, reason string) error

	// Organizer Verification
	ListOrganizers(ctx context.Context, filters OrganizerFilters) ([]*OrganizerVerification, error)
	GetOrganizer(ctx context.Context, appID int) (*OrganizerVerification, error)
	ApproveOrganizer(ctx context.Context, appID, actorID int, notes string) error
	RejectOrganizer(ctx context.Context, appID, actorID int, reason, notes string) error
	UpdateOrganizerStatus(ctx context.Context, appID, actorID int, req UpdateOrganizerStatusRequest) error

	// Payout Verification
	ListPayouts(ctx context.Context, filters PayoutFilters) ([]*AuditorPayout, error)
	GetPayout(ctx context.Context, payoutID int) (*AuditorPayout, error)
	ApprovePayout(ctx context.Context, payoutID, actorID int, req ApprovePayoutRequest) error
	RejectPayout(ctx context.Context, payoutID, actorID int, req RejectPayoutRequest) error
	HoldPayout(ctx context.Context, payoutID, actorID int, req HoldPayoutRequest) error

	// Notifications
	ListNotifications(ctx context.Context, userID int) ([]*AuditorNotification, error)
	MarkNotificationsRead(ctx context.Context, userID int, notificationIDs []int) error
	CreateNotification(ctx context.Context, userID int, title, detail, resourceType, resourceID string) error
	CreateNotificationForAuditors(ctx context.Context, title, detail, resourceType, resourceID string) error
}

// ---- Service Interface ----

type Service interface {
	// Dashboard
	GetDashboard(ctx context.Context) (*DashboardResponse, error)
	ListActivity(ctx context.Context, page, limit int) ([]*Activity, error)

	// Event Reviews
	ListEventReviews(ctx context.Context, filters EventReviewFilters) ([]*EventReview, error)
	GetEventReview(ctx context.Context, eventID int) (*EventReview, error)
	ApproveEventReview(ctx context.Context, eventID, actorID int, notes string) error
	RejectEventReview(ctx context.Context, eventID, actorID int, reason, notes string) error
	RequestEventChanges(ctx context.Context, eventID, actorID int, notes string) error
	UpdateEventReviewStage(ctx context.Context, eventID, actorID int, stage ReviewStage) error
	AddEventRevision(ctx context.Context, eventID, actorID int, req AddRevisionRequest) error
	UpdateRevisionStatus(ctx context.Context, revID, actorID int, status string) error
	ListEventRevisions(ctx context.Context, eventID int) ([]Revision, error)
	VerifyReviewDocument(ctx context.Context, docID, actorID int) error
	RejectReviewDocument(ctx context.Context, docID, actorID int, reason string) error

	// Documents
	ListDocuments(ctx context.Context, filters DocumentFilters) ([]*Document, error)
	GetDocument(ctx context.Context, docID int) (*Document, error)
	VerifyDocument(ctx context.Context, docID, actorID int) error
	RejectDocument(ctx context.Context, docID, actorID int, reason string) error

	// Organizer Verification
	ListOrganizers(ctx context.Context, filters OrganizerFilters) ([]*OrganizerVerification, error)
	GetOrganizer(ctx context.Context, appID int) (*OrganizerVerification, error)
	ApproveOrganizer(ctx context.Context, appID, actorID int, notes string) error
	RejectOrganizer(ctx context.Context, appID, actorID int, reason, notes string) error
	UpdateOrganizerStatus(ctx context.Context, appID, actorID int, req UpdateOrganizerStatusRequest) error

	// Payout Verification
	ListPayouts(ctx context.Context, filters PayoutFilters) ([]*AuditorPayout, error)
	GetPayout(ctx context.Context, payoutID int) (*AuditorPayout, error)
	ApprovePayout(ctx context.Context, payoutID, actorID int, req ApprovePayoutRequest) error
	RejectPayout(ctx context.Context, payoutID, actorID int, req RejectPayoutRequest) error
	HoldPayout(ctx context.Context, payoutID, actorID int, req HoldPayoutRequest) error

	// Notifications
	ListNotifications(ctx context.Context, userID int) ([]*AuditorNotification, error)
	MarkNotificationsRead(ctx context.Context, userID int, notificationIDs []int) error
}

// ---- Helpers ----

func computeRiskLevel(score int) RiskLevel {
	switch {
	case score < 30:
		return RiskLow
	case score < 60:
		return RiskMedium
	case score < 85:
		return RiskHigh
	default:
		return RiskCritical
	}
}

func formatTime(t time.Time) string {
	return t.Format("2006-01-02T15:04:05Z07:00")
}

func mapEventReviewStatus(dbStatus string) string {
	switch dbStatus {
	case "pending_review":
		return "Pending"
	case "approved":
		return "Approved"
	case "rejected":
		return "Rejected"
	default:
		return "Pending"
	}
}

func mapVerificationStatus(dbStatus string) string {
	switch dbStatus {
	case "pending_verification":
		return "pending"
	case "verified":
		return "verified"
	case "rejected":
		return "rejected"
	default:
		return "pending"
	}
}

func mapOrganizerStatus(dbStatus string) string {
	switch dbStatus {
	case "pending":
		return "Pending"
	case "approved":
		return "Verified"
	case "in_review", "needs_revision":
		return "Need Revision"
	case "rejected":
		return "Rejected"
	default:
		return "Pending"
	}
}

