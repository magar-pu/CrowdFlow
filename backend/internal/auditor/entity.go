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
	ComplianceScore int            `json:"complianceScore"`
	MissingDocs     int            `json:"missingDocs"`
	AssignedAuditor string         `json:"assignedAuditor"`
	Venue           string         `json:"venue"`
	VenueAddress    string         `json:"venueAddress"`
	Date            string         `json:"date"`
	Capacity        int            `json:"capacity"`
	TicketSold      int            `json:"ticketSold"`
	Notes           string         `json:"notes"`
	Documents       []ReviewDoc    `json:"documents"`
	Finance         ReviewFinance  `json:"finance"`
	History         []StatusEntry  `json:"history"`
	Revisions       []Revision     `json:"revisions"`

	OrganizerDetail   ReviewOrganizerDetail   `json:"organizerDetail"`
	Checklist         []ChecklistItem         `json:"checklist"`
	ComplianceHistory ReviewComplianceHistory `json:"complianceHistory"`
}

// ChecklistItem is a single derived pass/fail signal shown on the review
// overview. Every item must be computed from real state — a checklist that is
// always green tells the auditor nothing.
type ChecklistItem struct {
	Label string `json:"label"`
	Done  bool   `json:"done"`
}

// ReviewOrganizerDetail is the organizer's account-level identity as attached to
// the event under review. It comes from organizer_applications, which is
// UNIQUE (user_id) — one business per organizer.
type ReviewOrganizerDetail struct {
	// ApplicationID lets the console deep-link into the organizer verification
	// page. Zero when the organizer has no application row.
	ApplicationID int `json:"applicationId"`
	CompanyName   string `json:"companyName"`
	// BusinessLicense is NOT a stored licence number — no such column exists.
	// It reports the verification state of the organizer's NIB/SIUP document,
	// which is the signal an auditor actually needs.
	BusinessLicense string `json:"businessLicense"`
	Pic             string `json:"pic"`
	Email           string `json:"email"`
	Phone           string `json:"phone"`
	Address         string `json:"address"`
}

// ReviewComplianceHistory summarises the organizer's track record across their
// OTHER events, so an auditor can weigh this submission against past behaviour.
type ReviewComplianceHistory struct {
	PreviousAudits         int `json:"previousAudits"`
	PreviousViolations     int `json:"previousViolations"`
	PreviousRevisions      int `json:"previousRevisions"`
	PreviousApprovedEvents int `json:"previousApprovedEvents"`
}

// Document sources feeding a review. IDs are only unique WITHIN a source —
// organizer_documents and event_documents are separate SERIAL sequences, so an id
// alone is ambiguous and every mutation must carry the source alongside it.
const (
	DocSourceOrganizer = "organizer" // organizer_documents: account-level, reused across events
	DocSourceEvent     = "event"     // event_documents: submitted for this event specifically
)

type ReviewDoc struct {
	ID           int    `json:"id"`
	Source       string `json:"source"`
	DocumentType string `json:"name"`
	Category     string `json:"category"`
	Status       string `json:"status"`
	// FileURL is the private-bucket object key, NOT a fetchable link. Call the
	// document url endpoint to mint a short-lived signed URL for it.
	FileURL    string `json:"fileUrl"`
	UploadedAt string `json:"uploadDate"`
	// ReviewNotes carries the rejection reason for event documents.
	ReviewNotes string `json:"reviewNotes,omitempty"`
}

// DocumentURL is a freshly minted, short-lived view link.
type DocumentURL struct {
	URL       string `json:"url"`
	ExpiresIn int    `json:"expires_in"`
}

type ReviewFinance struct {
	ProjectedRevenue float64            `json:"projectedRevenue"`
	PlatformFee      float64            `json:"platformFee"`
	GatewayFee       float64            `json:"gatewayFee"`
	TaxAmount        float64            `json:"taxAmount"`
	NetPayout        float64            `json:"netPayout"`
	// TaxRate is events.entertainment_tax_rate — the only tax figure that is
	// actually stored per event. The old TaxConfig block reported a hardcoded
	// 11% PPN, a hardcoded "DKI Jakarta" region and three always-true
	// applicability flags, none of which existed in the schema.
	TaxRate     float64            `json:"taxRate"`
	TicketTiers []ReviewTicketTier `json:"ticketTiers"`
	Payout      ReviewPayout       `json:"payout"`
}

type ReviewTicketTier struct {
	Category string  `json:"category"`
	Price    float64 `json:"price"`
	// Seats is the tier's real sellable capacity: the number of seats painted
	// with this tier for assigned-seating tiers, otherwise allocation_limit.
	Seats int `json:"seats"`
	Sold  int `json:"sold"`
	// AssignedSeating reports which of those two rules applied, because
	// allocation_limit is never consulted once a tier has seats.
	AssignedSeating bool   `json:"assignedSeating"`
	Status          string `json:"status"` // Available, Sold Out
}

// ReviewPayout is the organizer's payout destination. Sourced from
// user_bank_accounts (which carries a real verification flag) and falling back
// to the bank columns on organizer_applications. Empty strings mean the
// organizer has not provided one — the console must say so rather than invent
// an account.
type ReviewPayout struct {
	Bank            string  `json:"bank"`
	AccountName     string  `json:"accountName"`
	AccountNumber   string  `json:"accountNumber"`
	EstimatedPayout float64 `json:"estimatedPayout"`
	Verified        bool    `json:"verified"`
	// HasAccount is false when no bank details exist in either source.
	HasAccount bool `json:"hasAccount"`
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
	RespondedAt          string `json:"respondedAt,omitempty"`
	// DocumentsChanged lists the event documents the organizer actually
	// re-uploaded in response to this revision, snapshotted when they replied.
	// It replaces the old organizer_file, which held a filename for a file that
	// was never uploaded anywhere.
	DocumentsChanged []RevisionDocumentChange `json:"documentsChanged"`
}

type RevisionDocumentChange struct {
	DocumentType string `json:"documentType"`
	Label        string `json:"label"`
	UploadedAt   string `json:"uploadedAt"`
}

type EventReviewFilters struct {
	Status    string
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
	SalesSummary    PayoutSales    `json:"salesSummary"`
	BankName                  string         `json:"bankName"`
	BankAccountNum            string         `json:"bankAccountNumber"`
	BankHolder                string         `json:"bankAccountHolder"`
	// BankVerificationStatus is "verified" only while an auditor has confirmed
	// the CURRENT account. Any organizer edit resets it, so a payout whose
	// destination moved since the last check arrives flagged.
	BankVerificationStatus    string         `json:"bankVerificationStatus"`
	OrganizerPhone            string         `json:"organizerPhone"`
	OrganizerBusinessLicense  string         `json:"organizerBusinessLicense"`
	OrganizerStatus           string         `json:"organizerStatus"`
	// OrganizerViolations counts the organizer's rejected events, the same rule
	// GetEventReview applies for compliance history. It excludes this payout's
	// own event so a rejection here is not counted as prior history.
	OrganizerViolations       int            `json:"organizerPreviousViolations"`
	// ApplicationID and EventID let the console deep-link to the organizer
	// profile and the event review; both screens already exist.
	ApplicationID             int            `json:"applicationId"`
	EventID                   int            `json:"eventId"`
	VenueName                 string         `json:"venueName"`
	EventStatus               string         `json:"eventStatus"`
	TicketCapacity            int            `json:"ticketCapacity"`
	FraudDetection            FraudSignals   `json:"fraudDetection"`
	InternalNotes             string         `json:"internalNotes"`
	Timeline                  []Activity     `json:"timeline"`
}

// PayoutSales is derived from `orders`, not from ticket_tiers.tickets_sold —
// nothing in the codebase ever writes that counter, so every figure computed
// from it was structurally zero. Each order also carries the fee rates that
// applied when it was placed, so a historic payout is no longer recomputed at
// today's percentages.
type PayoutSales struct {
	TicketsSold      int     `json:"ticketsSold"`
	GrossRevenue     float64 `json:"grossRevenue"`
	PlatformFee      float64 `json:"platformFee"`
	GatewayFee       float64 `json:"paymentGatewayFee"`
	// PPN is the VAT actually charged on the two fees (platform_fee_ppn +
	// gateway_fee_ppn). The rate is per-order, so it is never assumed to be 11%.
	PPN              float64 `json:"ppn"`
	EntertainmentTax float64 `json:"entertainmentTax"`
	RefundAmount     float64 `json:"refundAmount"`
	NetRevenue       float64 `json:"netRevenue"`
}

type FraudSignals struct {
	DuplicatePayout     bool   `json:"duplicatePayout"`
	SuspiciousRevenue   bool   `json:"suspiciousRevenue"`
	HasAlert            bool   `json:"hasAlert"`
	AlertMessage        string `json:"alertMessage"`
}

type PayoutFilters struct {
	Status    string
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

	// Per-event documents (event_documents; separate id space from organizer_documents)
	VerifyEventDocument(ctx context.Context, docID, actorID int) error
	RejectEventDocument(ctx context.Context, docID, actorID int, reason string) error
	GetDocumentPath(ctx context.Context, source string, docID int) (string, error)

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

	// Per-event documents (event_documents; separate id space from organizer_documents)
	VerifyEventDocument(ctx context.Context, docID, actorID int) error
	RejectEventDocument(ctx context.Context, docID, actorID int, reason string) error
	GetDocumentViewURL(ctx context.Context, source string, docID int) (*DocumentURL, error)

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
	case "needs_revision":
		// Matches the 'Changes Requested' member of the frontend's status union
		// and its filter tab in ReviewsView.
		return "Changes Requested"
	default:
		return "Pending"
	}
}

// requiredEventDocTypes mirrors organizer.RequiredEventDocumentTypes. Duplicated
// rather than imported to keep the auditor package free of a dependency on the
// organizer package; if the organizer's required set changes, change this too.
var requiredEventDocTypes = []string{"EVENT_PROPOSAL", "CROWD_PERMIT", "PIC_ID"}

// eventDocLabel renders a per-event document type for the review UI.
func eventDocLabel(t string) string {
	switch t {
	case "EVENT_PROPOSAL":
		return "Event Proposal (Proposal Kegiatan)"
	case "CROWD_PERMIT":
		return "Crowd Permit (Izin Keramaian)"
	case "PIC_ID":
		return "PIC Identification (KTP Penanggung Jawab)"
	case "VENUE_PERMIT":
		return "Venue Usage Permit (Izin Penggunaan Tempat)"
	default:
		return t
	}
}

// eventDocCategory buckets a per-event document into the console's existing
// category vocabulary.
func eventDocCategory(t string) string {
	switch t {
	case "CROWD_PERMIT", "VENUE_PERMIT":
		return "Permits & Licenses"
	case "PIC_ID":
		return "Business License"
	default:
		return "Supporting Documents"
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

