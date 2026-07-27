package organizer

import (
	"context"
	"errors"
	"slices"
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

	// ErrVenueRequired guards the publish step. Drafts may carry no venue at all
	// (it is picked in the workspace, not the creation wizard), but an event
	// cannot be submitted for review without one.
	ErrVenueRequired = errors.New("event has no venue")

	// ErrDocumentsIncomplete guards the publish step alongside the venue and
	// seating gates: an auditor cannot evaluate an event without its proposal,
	// crowd permit and PIC identification.
	ErrDocumentsIncomplete = errors.New("required event documents are missing")

	ErrDocumentNotFound = errors.New("event document not found")

	// ErrNotDraft is returned when an operation restricted to drafts is
	// attempted on an event that has already been submitted. Distinct from
	// "not found" so the organizer is told WHY rather than that their event
	// vanished — the usual cause is a status change in another tab.
	ErrNotDraft = errors.New("only a draft event can be deleted")

	// ErrNotUnderReview guards withdrawal: only an event actually sitting in
	// pending_review can be pulled back.
	ErrNotUnderReview = errors.New("event is not awaiting review")

	// ErrReviewInProgress blocks withdrawal once an auditor has picked the
	// event up. Yanking it mid-review would discard their work and leave the
	// auditor console pointing at an event that silently became a draft.
	ErrReviewInProgress = errors.New("an auditor has already started reviewing this event")

	// ErrCannotArchive blocks archiving an event that is still live or in the
	// middle of review — archiving is for terminal events.
	ErrCannotArchive = errors.New("this event cannot be archived in its current status")

	// ErrNotApproved guards the public listing: only an event an auditor has
	// approved may be put on sale.
	ErrNotApproved = errors.New("event has not been approved yet")

	// ErrEventArchived blocks publishing an archived event — it would be live
	// publicly while hidden from the organizer's own list.
	ErrEventArchived = errors.New("event is archived")

	ErrEventNotFound = errors.New("event not found")
)

// Per-event document types. These are distinct from the ACCOUNT-level documents
// in organizer_documents (KTP/NPWP/NIB), which an organizer submits once when
// applying and which are reused across every event they run.
const (
	DocTypeEventProposal = "EVENT_PROPOSAL" // Proposal Kegiatan
	DocTypeCrowdPermit   = "CROWD_PERMIT"   // Izin Keramaian
	DocTypePICID         = "PIC_ID"         // Fotokopi KTP Penanggung Jawab
	DocTypeVenuePermit   = "VENUE_PERMIT"   // Izin Penggunaan Tempat
)

// RequiredEventDocumentTypes must all be present before an event may be submitted
// for review. VENUE_PERMIT is deliberately excluded — it only applies when the
// organizer does not own the venue, which nothing in the schema can determine.
var RequiredEventDocumentTypes = []string{
	DocTypeEventProposal,
	DocTypeCrowdPermit,
	DocTypePICID,
}

// AllEventDocumentTypes is the closed set the API accepts.
var AllEventDocumentTypes = []string{
	DocTypeEventProposal,
	DocTypeCrowdPermit,
	DocTypePICID,
	DocTypeVenuePermit,
}

func IsValidEventDocumentType(t string) bool {
	return slices.Contains(AllEventDocumentTypes, t)
}

// EventDocumentLabel renders a document type for humans. Error messages reach the
// organizer verbatim via the publish banner, so they cannot read EVENT_PROPOSAL.
func EventDocumentLabel(t string) string {
	switch t {
	case DocTypeEventProposal:
		return "Event Proposal"
	case DocTypeCrowdPermit:
		return "Crowd Permit (Izin Keramaian)"
	case DocTypePICID:
		return "PIC Identification (KTP)"
	case DocTypeVenuePermit:
		return "Venue Usage Permit"
	default:
		return t
	}
}

// EventDocument is one row of event_documents. FilePath is a private-bucket
// object key and is never serialised; readers get a short-lived PresignedURL.
type EventDocument struct {
	ID           int       `json:"id"`
	EventID      int       `json:"event_id"`
	DocumentType string    `json:"document_type"`
	FilePath     string    `json:"-"`
	FileName     string    `json:"file_name"`
	FileSize     int64     `json:"file_size"`
	ContentType  string    `json:"content_type"`
	Status      string    `json:"status"`
	ReviewNotes *string   `json:"review_notes,omitempty"`
	UploadedAt  time.Time `json:"uploaded_at"`
}

// EventDocumentURL is a freshly minted view link. Never embedded in a list
// response — a presigned URL is a bearer credential, so one is created only when
// a specific document is explicitly opened.
type EventDocumentURL struct {
	URL string `json:"url"`
	// Seconds until the link stops working, so the UI can say so.
	ExpiresIn int `json:"expires_in"`
}

// EventDocumentUpload carries a single file from the multipart handler to the
// service, which is what actually writes it to the private bucket.
type EventDocumentUpload struct {
	Type     string
	Filename string
	Content  []byte
}

// CoverImageUpload is one event cover-art file on its way to the PUBLIC bucket.
// Unlike EventDocumentUpload this is deliberately world-readable: the URL is
// rendered on the public event page.
type CoverImageUpload struct {
	Filename string
	Content  []byte
}

// CoverImageResponse returns the resolved public URL so the workspace can swap
// its local blob: preview for the persisted image.
type CoverImageResponse struct {
	ImageURL string `json:"imageUrl"`
}

// EventDocumentsResponse is the Documents tab payload: every slot the UI can
// render, whether filled or not, plus the derived submission readiness.
type EventDocumentsResponse struct {
	Documents []*EventDocument `json:"documents"`
	Required  []string         `json:"required"`
	Missing   []string         `json:"missing"`
	Complete  bool             `json:"complete"`
}

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
	// IsCurrent is false on superseded uploads. The organizer console only ever
	// shows current rows; the history exists so an auditor can see that an
	// earlier version was rejected.
	IsCurrent     bool      `json:"is_current"`
}

// AccountDocumentTypes are the account-level documents an organizer can file.
// Mirrors the multipart field names accepted by POST /api/organizer/apply, so
// the two paths cannot drift into accepting different sets.
//
// VENUE_AGREEMENT and EVENT_PROPOSAL used to sit here and were removed: both are
// per-EVENT artifacts, signed and written once per event rather than once per
// organizer. EVENT_PROPOSAL was worse than merely misplaced — it is also a
// REQUIRED event document type (see DocTypeEventProposal above), so the same
// document was being collected in two places and reviewed through two separate
// flows. The event-side equivalent of VENUE_AGREEMENT is DocTypeVenuePermit.
var AccountDocumentTypes = []string{"KTP", "NPWP", "NIB", "SIUP", "BUSINESS_LICENSE"}

func IsValidAccountDocumentType(t string) bool {
	for _, valid := range AccountDocumentTypes {
		if valid == t {
			return true
		}
	}
	return false
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

// PayoutDetails is the organizer's payout bank account plus everything the
// console needs to decide whether the form is editable and what to warn about.
//
// The account is organizer-level, not per-event: organizer_applications is
// UNIQUE (user_id) and the auditor payout screen joins to it via
// events.organizer_id, so one account receives every payout.
type PayoutDetails struct {
	BankName          string `json:"bankName"`
	BankAccountHolder string `json:"bankAccountHolder"`
	BankAccountNumber string `json:"bankAccountNumber"`

	// Complete reports whether all three fields are present. The publish gate
	// uses the same condition, so the console can pre-empt it.
	Complete           bool   `json:"complete"`
	VerificationStatus string `json:"verificationStatus"` // "unverified" | "verified"
	UpdatedAt          string `json:"updatedAt,omitempty"`

	// Editable is false once the details are committed to something: an event
	// awaiting an auditor, or a payout already in flight. LockReason says which,
	// so the console explains the lock instead of just disabling the form.
	Editable   bool   `json:"editable"`
	LockReason string `json:"lockReason,omitempty"`
}

// UpdatePayoutDetailsRequest is the payload of PUT /api/organizer/payout-details.
type UpdatePayoutDetailsRequest struct {
	BankName          string `json:"bankName"`
	BankAccountHolder string `json:"bankAccountHolder"`
	BankAccountNumber string `json:"bankAccountNumber"`
}

// ErrPayoutDetailsLocked is returned when bank details are edited while an
// event is under review or a payout is in flight. Distinct from
// ErrApplicationLocked, which is about the application wizard.
var ErrPayoutDetailsLocked = errors.New("payout details are locked")

// ErrPayoutDetailsRequired gates event submission: an event cannot go to an
// auditor until the organizer has an account for the money to land in.
var ErrPayoutDetailsRequired = errors.New("payout bank details are required")

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
	// Published distinguishes an approved event that is on sale from one the
	// organizer has not listed yet.
	Published bool `json:"published"`
}

type DashboardResponse struct {
	Stats        DashboardStats `json:"stats"`
	RecentOrders []RecentOrder  `json:"recentOrders"`
	RecentEvents []RecentEvent  `json:"recentEvents"`
}

// NewVenueInput carries a venue the organizer is creating inline from the event
// wizard, when the one they want isn't in the catalogue yet. Nil on the common
// path, where VenueID already points at an existing row.
//
// Plain text throughout: the address is typed, not geocoded, so there are no
// coordinates and no external place id here.
type NewVenueInput struct {
	Name          string `json:"name"`
	Address       string `json:"address"`
	City          string `json:"city"`
	Province      string `json:"province"`
	PostalCode    string `json:"postalCode"`
	TotalCapacity int    `json:"totalCapacity"`
}

// eorganizer Event models
//
// This struct is both the request and the response shape for the organizer
// event endpoints. On the way IN, the venue is identified by VenueID (picked
// from the catalogue) or NewVenue (created inline). On the way OUT, the Venue*
// and Location* fields are read back off the joined venues row.
//
// Events are physical-venue-only. The old "virtual" locationType was an
// application fiction built on an auto-created 'Virtual Venue' row, and the
// read paths hardcoded every event back to "physical" anyway.
//
// The venue is OPTIONAL on a draft (migration 0015 made events.venue_id
// nullable): it is chosen in the event workspace, not the creation wizard. On a
// venue-less event VenueID is 0 and the Venue*/Location* fields are empty.
// Publishing is gated on a venue being set.
type OrganizerEvent struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	Description string `json:"description"`
	Date        string `json:"date"`
	StartDate   string `json:"startDate"`
	StartTime   string `json:"startTime"`
	EndDate     string `json:"endDate"`
	EndTime     string `json:"endTime"`

	VenueID  int            `json:"venueId"`
	NewVenue *NewVenueInput `json:"newVenue,omitempty"`

	VenueName string `json:"venueName"` // venues.name
	VenueCity string `json:"venueCity"` // venues.city
	// LocationAddress is the real venues.address street line. Location is the
	// composed "Name, City" display string the console renders.
	LocationAddress string `json:"locationAddress"`
	Location        string `json:"location"`

	Capacity int     `json:"capacity"`
	Sold     int     `json:"sold"`
	Revenue  float64 `json:"revenue"`
	Status   string  `json:"status"`
	Image    string  `json:"image"`

	// Published reports whether the organizer has put the approved event on the
	// public listing. Approval alone no longer implies it.
	Published bool `json:"published"`
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

// RespondRevisionRequest carries the organizer's reply to one revision point.
// There is deliberately no file field: the old `proofFile` only ever transmitted
// a filename the browser never uploaded, so the auditor was shown an attachment
// that did not exist. Evidence now comes from the documents the organizer
// actually replaced, recorded automatically as RevisionDocumentChange.
type RespondRevisionRequest struct {
	Comment     string `json:"comment"`
	ActionTaken string `json:"actionTaken"`
}

// RevisionDocumentChange is one event document that was re-uploaded after the
// auditor raised the revision, captured at the moment the organizer responded.
type RevisionDocumentChange struct {
	DocumentType string `json:"documentType"`
	Label        string `json:"label"`
	UploadedAt   string `json:"uploadedAt"`
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
	RespondedAt          string    `json:"respondedAt,omitempty"`
	// DocumentsChanged is never nil — an empty list means the organizer
	// answered without touching any paperwork, which is a meaningful answer.
	DocumentsChanged []RevisionDocumentChange `json:"documentsChanged"`
	// PendingDocumentChanges previews, for an unanswered revision, which
	// documents have already been re-uploaded since it was raised.
	PendingDocumentChanges []RevisionDocumentChange `json:"pendingDocumentChanges,omitempty"`
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

// Live gate/check-in figures for one event, read from ticket_checkins and
// scanner_logs. The scanner package exposes similar numbers but its routes carry
// no auth middleware, so the organizer console reads them through here instead.
type EventCheckInStats struct {
	TotalCheckedIn int                `json:"totalCheckedIn"`
	TotalTickets   int                `json:"totalTickets"`
	// Mean scanner round-trip in milliseconds; 0 when nothing has been scanned.
	AvgScanMs int                  `json:"avgScanMs"`
	Gates     []GateCheckInStat    `json:"gates"`
	Devices   []DeviceCheckInStat  `json:"devices"`
	Hourly    []HourlyCheckInPoint `json:"hourly"`
}

type DeviceCheckInStat struct {
	DeviceID int `json:"deviceId"`
	Scans    int `json:"scans"`
}

type GateCheckInStat struct {
	GateID      int    `json:"gateId"`
	GateName    string `json:"gateName"`
	Status      string `json:"status"`
	Scans       int    `json:"scans"`
	DeviceCount int    `json:"deviceCount"`
}

type HourlyCheckInPoint struct {
	// Local hour bucket, "08:00".
	Hour  string `json:"hour"`
	Scans int    `json:"scans"`
}

type Repository interface {
	Create(ctx context.Context, app *OrganizerApplication, docs []*OrganizerDocument) error
	GetByUserID(ctx context.Context, userID int) (*OrganizerApplication, error)
	// ListAccountDocuments returns only the CURRENT version of each document
	// type. organizer_documents keeps superseded rows so a rejection stays on
	// the record, so anything counting or listing must filter is_current.
	ListAccountDocuments(ctx context.Context, userID int) ([]*OrganizerDocument, error)
	ReplaceAccountDocument(ctx context.Context, userID int, doc *OrganizerDocument) error
	GetAccountDocumentPath(ctx context.Context, userID, docID int) (string, error)
	GetByID(ctx context.Context, id int) (*OrganizerApplication, error)
	Update(ctx context.Context, app *OrganizerApplication) error
	Delete(ctx context.Context, id int) error

	// eorganizer methods
	GetDashboardData(ctx context.Context, organizerID int) (*DashboardResponse, error)
	ListOrganizerEvents(ctx context.Context, organizerID int, archived bool) ([]*OrganizerEvent, error)
	GetOrganizerEvent(ctx context.Context, eventID int, organizerID int) (*OrganizerEvent, error)
	CreateOrganizerEvent(ctx context.Context, organizerID int, event *OrganizerEvent) error
	UpdateOrganizerEvent(ctx context.Context, eventID int, organizerID int, event *OrganizerEvent) error
	SetEventVenue(ctx context.Context, eventID int, organizerID int, event *OrganizerEvent) error
	SetEventCoverImage(ctx context.Context, eventID int, organizerID int, url string) error
	WithdrawEventFromReview(ctx context.Context, eventID int, organizerID int) error
	SetEventArchived(ctx context.Context, eventID int, organizerID int, archived bool) error
	SetEventListed(ctx context.Context, eventID int, organizerID int, listed bool) error
	PublishOrganizerEvent(ctx context.Context, eventID int, organizerID int) error
	GetPayoutDetails(ctx context.Context, organizerID int) (*PayoutDetails, error)
	UpdatePayoutDetails(ctx context.Context, organizerID int, req UpdatePayoutDetailsRequest) (*PayoutDetails, error)
	DeleteOrganizerEvent(ctx context.Context, eventID int, organizerID int) error
	ListTicketTiers(ctx context.Context, eventID int, organizerID int) ([]*OrganizerTicketTier, error)
	CreateTicketTier(ctx context.Context, eventID int, organizerID int, tier *OrganizerTicketTier) error
	UpdateTicketTier(ctx context.Context, eventID int, organizerID int, tierID int, tier *OrganizerTicketTier) error
	DeleteTicketTier(ctx context.Context, eventID int, organizerID int, tierID int) error
	ListOrders(ctx context.Context, organizerID int) ([]*OrganizerOrder, error)
	ListEventOrders(ctx context.Context, eventID int, organizerID int) ([]*OrganizerOrder, error)
	GetOrderDetails(ctx context.Context, orderID string, organizerID int) (*OrganizerOrder, error)
	ListRefunds(ctx context.Context, organizerID int) ([]*OrganizerRefund, error)
	ListAttendees(ctx context.Context, organizerID int) ([]*OrganizerAttendee, error)
	ListEventAttendees(ctx context.Context, eventID int, organizerID int) ([]*OrganizerAttendee, error)
	GetFinanceSummary(ctx context.Context, organizerID int) (*OrganizerFinance, error)
	ListPayouts(ctx context.Context, organizerID int) ([]*OrganizerPayout, error)
	CreatePayoutRequest(ctx context.Context, eventID int, organizerID int, amount float64) error
	GetAnalytics(ctx context.Context, organizerID int, dateRange string) (*OrganizerAnalytics, error)
	GetEventAnalytics(ctx context.Context, eventID int, organizerID int, dateRange string) (*OrganizerAnalytics, error)
	GetEventCheckInStats(ctx context.Context, eventID int, organizerID int) (*EventCheckInStats, error)
	GetEventSeating(ctx context.Context, eventID int, organizerID int) (*EventSeatingResponse, error)
	SeedEventSeating(ctx context.Context, eventID int, organizerID int, assignments []SeatingAssignment) error
	CheckInAttendee(ctx context.Context, eventID int, organizerID int, qrToken string) (*CheckInResponse, error)
	ListNotifications(ctx context.Context, userID int) ([]*Notification, error)
	MarkNotificationsRead(ctx context.Context, userID int, notificationIDs []int) error
	GetEventRevisions(ctx context.Context, eventID int, organizerID int) (*EventRevisionFeedback, error)
	RespondToEventRevision(ctx context.Context, eventID, revID, organizerID int, req RespondRevisionRequest) error

	// Per-event documents
	ListEventDocuments(ctx context.Context, eventID int) ([]*EventDocument, error)
	UpsertEventDocument(ctx context.Context, doc *EventDocument, uploadedBy int) (string, error)
	GetEventDocument(ctx context.Context, eventID int, docID int) (*EventDocument, error)
	DeleteEventDocument(ctx context.Context, eventID int, docID int) (string, error)
}

type Service interface {
	Apply(ctx context.Context, userID int, req ApplyRequest, docs []*DocumentUpload) (*OrganizerApplication, error)
	GetApplication(ctx context.Context, userID int) (*OrganizerApplication, error)
	UpdateApplication(ctx context.Context, userID int, req ApplyRequest, newDocs []*DocumentUpload) (*OrganizerApplication, error)
	ListAccountDocuments(ctx context.Context, userID int) ([]*OrganizerDocument, error)
	UploadAccountDocument(ctx context.Context, userID int, doc *DocumentUpload) (*OrganizerDocument, error)
	GetAccountDocumentURL(ctx context.Context, userID, docID int) (string, error)
	DeleteApplication(ctx context.Context, userID int) error

	// eorganizer methods
	GetDashboardData(ctx context.Context, organizerID int) (*DashboardResponse, error)
	ListOrganizerEvents(ctx context.Context, organizerID int, archived bool) ([]*OrganizerEvent, error)
	GetOrganizerEvent(ctx context.Context, eventID int, organizerID int) (*OrganizerEvent, error)
	CreateOrganizerEvent(ctx context.Context, organizerID int, event *OrganizerEvent) error
	UpdateOrganizerEvent(ctx context.Context, eventID int, organizerID int, event *OrganizerEvent) error
	SetEventVenue(ctx context.Context, eventID int, organizerID int, event *OrganizerEvent) error
	UploadEventCover(ctx context.Context, eventID int, organizerID int, upload *CoverImageUpload) (string, error)
	WithdrawEventFromReview(ctx context.Context, eventID int, organizerID int) error
	SetEventArchived(ctx context.Context, eventID int, organizerID int, archived bool) error
	SetEventListed(ctx context.Context, eventID int, organizerID int, listed bool) error
	PublishOrganizerEvent(ctx context.Context, eventID int, organizerID int) error
	GetPayoutDetails(ctx context.Context, organizerID int) (*PayoutDetails, error)
	UpdatePayoutDetails(ctx context.Context, organizerID int, req UpdatePayoutDetailsRequest) (*PayoutDetails, error)
	DeleteOrganizerEvent(ctx context.Context, eventID int, organizerID int) error
	GetEventSeating(ctx context.Context, eventID int, organizerID int) (*EventSeatingResponse, error)
	SeedEventSeating(ctx context.Context, eventID int, organizerID int, req SeedSeatingRequest) error
	CheckInAttendee(ctx context.Context, eventID int, organizerID int, qrToken string) (*CheckInResponse, error)
	ListTicketTiers(ctx context.Context, eventID int, organizerID int) ([]*OrganizerTicketTier, error)
	CreateTicketTier(ctx context.Context, eventID int, organizerID int, tier *OrganizerTicketTier) error
	UpdateTicketTier(ctx context.Context, eventID int, organizerID int, tierID int, tier *OrganizerTicketTier) error
	DeleteTicketTier(ctx context.Context, eventID int, organizerID int, tierID int) error
	ListOrders(ctx context.Context, organizerID int) ([]*OrganizerOrder, error)
	ListEventOrders(ctx context.Context, eventID int, organizerID int) ([]*OrganizerOrder, error)
	GetOrderDetails(ctx context.Context, orderID string, organizerID int) (*OrganizerOrder, error)
	ListRefunds(ctx context.Context, organizerID int) ([]*OrganizerRefund, error)
	ListAttendees(ctx context.Context, organizerID int) ([]*OrganizerAttendee, error)
	ListEventAttendees(ctx context.Context, eventID int, organizerID int) ([]*OrganizerAttendee, error)
	GetFinanceSummary(ctx context.Context, organizerID int) (*OrganizerFinance, error)
	ListPayouts(ctx context.Context, organizerID int) ([]*OrganizerPayout, error)
	CreatePayoutRequest(ctx context.Context, eventID int, organizerID int, amount float64) error
	GetAnalytics(ctx context.Context, organizerID int, dateRange string) (*OrganizerAnalytics, error)
	GetEventAnalytics(ctx context.Context, eventID int, organizerID int, dateRange string) (*OrganizerAnalytics, error)
	GetEventCheckInStats(ctx context.Context, eventID int, organizerID int) (*EventCheckInStats, error)
	GetEventRevisions(ctx context.Context, eventID int, organizerID int) (*EventRevisionFeedback, error)
	RespondToEventRevision(ctx context.Context, eventID, revID, organizerID int, req RespondRevisionRequest) error
	ListNotifications(ctx context.Context, userID int) ([]*Notification, error)
	MarkNotificationsRead(ctx context.Context, userID int, notificationIDs []int) error

	// Per-event documents
	ListEventDocuments(ctx context.Context, eventID int) (*EventDocumentsResponse, error)
	UploadEventDocument(ctx context.Context, eventID int, userID int, upload *EventDocumentUpload) (*EventDocument, error)
	GetEventDocumentURL(ctx context.Context, eventID int, docID int) (*EventDocumentURL, error)
	DeleteEventDocument(ctx context.Context, eventID int, docID int) error
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
