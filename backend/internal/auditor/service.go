package auditor

import (
	"context"
	"fmt"
	"strings"
	"time"

	"crowdflow-backend/internal/storage"
)

// documentURLTTL matches the organizer console's window. A presigned URL is a
// bearer credential — whoever holds it reads the file with no identity check —
// and these documents carry NIK, so links are minted per view and die quickly.
const documentURLTTL = 2 * time.Minute

// AuditorService implements Service with business validation.
type AuditorService struct {
	repo    Repository
	storage *storage.S3Storage
}

func NewAuditorService(repo Repository, storage *storage.S3Storage) *AuditorService {
	return &AuditorService{repo: repo, storage: storage}
}

// ---- Dashboard ----

func (s *AuditorService) GetDashboard(ctx context.Context) (*DashboardResponse, error) {
	stats, err := s.repo.GetDashboardStats(ctx)
	if err != nil {
		return nil, err
	}

	activity, err := s.repo.ListRecentActivity(ctx, 10)
	if err != nil {
		return nil, err
	}

	queue, err := s.repo.ListReviewQueue(ctx, 4)
	if err != nil {
		return nil, err
	}

	return &DashboardResponse{
		Stats:          *stats,
		RecentActivity: dereferenceActivity(activity),
		ReviewQueue:    dereferenceReviews(queue),
	}, nil
}

func (s *AuditorService) ListActivity(ctx context.Context, page, limit int) ([]*Activity, error) {
	if limit <= 0 {
		limit = 20
	}
	if page <= 0 {
		page = 1
	}
	return s.repo.ListRecentActivity(ctx, limit)
}

// ---- Event Reviews ----

func (s *AuditorService) ListEventReviews(ctx context.Context, filters EventReviewFilters) ([]*EventReview, error) {
	if filters.Limit <= 0 {
		filters.Limit = 20
	}
	if filters.Page <= 0 {
		filters.Page = 1
	}
	return s.repo.ListEventReviews(ctx, filters)
}

func (s *AuditorService) GetEventReview(ctx context.Context, eventID int) (*EventReview, error) {
	if eventID <= 0 {
		return nil, ErrNotFound
	}
	return s.repo.GetEventReview(ctx, eventID)
}

func (s *AuditorService) ApproveEventReview(ctx context.Context, eventID, actorID int, notes string) error {
	if eventID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	return s.repo.ApproveEventReview(ctx, eventID, actorID, notes)
}

func (s *AuditorService) RejectEventReview(ctx context.Context, eventID, actorID int, reason, notes string) error {
	if eventID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	if strings.TrimSpace(reason) == "" {
		return ErrValidation
	}
	return s.repo.RejectEventReview(ctx, eventID, actorID, reason, notes)
}

func (s *AuditorService) RequestEventChanges(ctx context.Context, eventID, actorID int, notes string) error {
	if eventID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	if strings.TrimSpace(notes) == "" {
		return ErrValidation
	}
	return s.repo.RequestEventChanges(ctx, eventID, actorID, notes)
}

func (s *AuditorService) UpdateEventReviewStage(ctx context.Context, eventID, actorID int, stage ReviewStage) error {
	if eventID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	validStages := map[ReviewStage]bool{
		StageSubmitted:            true,
		StageDocumentVerification: true,
		StageEventValidation:      true,
		StageFinalApproval:        true,
	}
	if !validStages[stage] {
		return ErrValidation
	}
	return s.repo.UpdateEventReviewStage(ctx, eventID, actorID, stage)
}

func (s *AuditorService) AddEventRevision(ctx context.Context, eventID, actorID int, req AddRevisionRequest) error {
	if eventID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	if strings.TrimSpace(req.Title) == "" {
		return ErrValidation
	}
	if strings.TrimSpace(req.Description) == "" {
		return ErrValidation
	}
	if strings.TrimSpace(req.RequiredAction) == "" {
		return ErrValidation
	}
	return s.repo.AddEventRevision(ctx, eventID, actorID, req)
}

// validRevisionStatuses mirrors the auditor_revisions_status_check constraint
// (migration 0020). Without this an unknown status reaches Postgres and comes
// back as an opaque 500 constraint violation instead of a 422.
var validRevisionStatuses = map[string]bool{
	"Draft": true, "Sent": true, "Viewed": true, "In Progress": true,
	"Resubmitted": true, "Verified": true, "Resolved": true,
	"Rejected": true, "Expired": true,
}

func (s *AuditorService) UpdateRevisionStatus(ctx context.Context, revID, actorID int, status string) error {
	status = strings.TrimSpace(status)
	if revID <= 0 || actorID <= 0 || status == "" {
		return ErrValidation
	}
	if !validRevisionStatuses[status] {
		return ErrValidation
	}
	return s.repo.UpdateRevisionStatus(ctx, revID, actorID, status)
}

func (s *AuditorService) VerifyReviewDocument(ctx context.Context, docID, actorID int) error {
	if docID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	return s.repo.VerifyReviewDocument(ctx, docID, actorID)
}

func (s *AuditorService) RejectReviewDocument(ctx context.Context, docID, actorID int, reason string) error {
	if docID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	if strings.TrimSpace(reason) == "" {
		return ErrValidation
	}
	return s.repo.RejectReviewDocument(ctx, docID, actorID, reason)
}

// ---- Per-event documents ----
//
// Kept separate from the ReviewDocument pair above because event_documents and
// organizer_documents are distinct tables with overlapping SERIAL ids. The
// (source, id) pair is what identifies a document; an id alone does not.

func (s *AuditorService) VerifyEventDocument(ctx context.Context, docID, actorID int) error {
	if docID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	return s.repo.VerifyEventDocument(ctx, docID, actorID)
}

func (s *AuditorService) RejectEventDocument(ctx context.Context, docID, actorID int, reason string) error {
	if docID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	// The reason is not optional: it is what the organizer sees in the Documents
	// tab explaining what to fix, and a rejected document blocks resubmission.
	if strings.TrimSpace(reason) == "" {
		return ErrValidation
	}
	return s.repo.RejectEventDocument(ctx, docID, actorID, reason)
}

// GetDocumentViewURL mints a short-lived link for one document from either
// source. Until this existed the review payload carried raw object keys in
// `fileUrl`, which are not fetchable — the auditor could not open anything.
func (s *AuditorService) GetDocumentViewURL(ctx context.Context, source string, docID int) (*DocumentURL, error) {
	if docID <= 0 {
		return nil, ErrValidation
	}
	if source != DocSourceEvent && source != DocSourceOrganizer {
		return nil, ErrValidation
	}

	path, err := s.repo.GetDocumentPath(ctx, source, docID)
	if err != nil {
		return nil, err
	}

	url, err := s.storage.GetPresignedURL(ctx, path, documentURLTTL)
	if err != nil {
		return nil, err
	}

	return &DocumentURL{URL: url, ExpiresIn: int(documentURLTTL.Seconds())}, nil
}

// ---- Documents ----

func (s *AuditorService) ListDocuments(ctx context.Context, filters DocumentFilters) ([]*Document, error) {
	if filters.Limit <= 0 {
		filters.Limit = 20
	}
	if filters.Page <= 0 {
		filters.Page = 1
	}
	return s.repo.ListDocuments(ctx, filters)
}

func (s *AuditorService) GetDocument(ctx context.Context, docID int) (*Document, error) {
	if docID <= 0 {
		return nil, ErrNotFound
	}
	return s.repo.GetDocument(ctx, docID)
}

func (s *AuditorService) VerifyDocument(ctx context.Context, docID, actorID int) error {
	if docID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	return s.repo.VerifyDocument(ctx, docID, actorID)
}

func (s *AuditorService) RejectDocument(ctx context.Context, docID, actorID int, reason string) error {
	if docID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	if strings.TrimSpace(reason) == "" {
		return ErrValidation
	}
	return s.repo.RejectDocument(ctx, docID, actorID, reason)
}

// ---- Organizer Verification ----

func (s *AuditorService) ListOrganizers(ctx context.Context, filters OrganizerFilters) ([]*OrganizerVerification, error) {
	if filters.Limit <= 0 {
		filters.Limit = 20
	}
	if filters.Page <= 0 {
		filters.Page = 1
	}
	return s.repo.ListOrganizers(ctx, filters)
}

func (s *AuditorService) GetOrganizer(ctx context.Context, appID int) (*OrganizerVerification, error) {
	if appID <= 0 {
		return nil, ErrNotFound
	}
	return s.repo.GetOrganizer(ctx, appID)
}

func (s *AuditorService) ApproveOrganizer(ctx context.Context, appID, actorID int, notes string) error {
	if appID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	return s.repo.ApproveOrganizer(ctx, appID, actorID, notes)
}

func (s *AuditorService) RejectOrganizer(ctx context.Context, appID, actorID int, reason, notes string) error {
	if appID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	if strings.TrimSpace(reason) == "" {
		return ErrValidation
	}
	return s.repo.RejectOrganizer(ctx, appID, actorID, reason, notes)
}

func (s *AuditorService) UpdateOrganizerStatus(ctx context.Context, appID, actorID int, req UpdateOrganizerStatusRequest) error {
	if appID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	status := strings.ToLower(req.Status)
	validStatuses := map[string]bool{
		"pending": true, "in_review": true, "in review": true, "approved": true, "verified": true, "rejected": true, "suspended": true, "need revision": true, "need_revision": true, "needs_revision": true,
	}
	if !validStatuses[status] {
		return ErrValidation
	}
	return s.repo.UpdateOrganizerStatus(ctx, appID, actorID, req)
}

// ---- Payout Verification ----

func (s *AuditorService) ListPayouts(ctx context.Context, filters PayoutFilters) ([]*AuditorPayout, error) {
	if filters.Limit <= 0 {
		filters.Limit = 20
	}
	if filters.Page <= 0 {
		filters.Page = 1
	}
	return s.repo.ListPayouts(ctx, filters)
}

func (s *AuditorService) GetPayout(ctx context.Context, payoutID int) (*AuditorPayout, error) {
	if payoutID <= 0 {
		return nil, ErrNotFound
	}
	return s.repo.GetPayout(ctx, payoutID)
}

func (s *AuditorService) ApprovePayout(ctx context.Context, payoutID, actorID int, req ApprovePayoutRequest) error {
	if payoutID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	return s.repo.ApprovePayout(ctx, payoutID, actorID, req)
}

func (s *AuditorService) RevisePayout(ctx context.Context, payoutID, actorID int, req RevisePayoutRequest) error {
	if payoutID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	// A payout returned with no explanation leaves the organizer guessing at
	// what to change, and the console already collects the text.
	if strings.TrimSpace(req.Reason) == "" {
		return ErrValidation
	}
	return s.repo.RevisePayout(ctx, payoutID, actorID, req)
}

func (s *AuditorService) UpdatePayoutNotes(ctx context.Context, payoutID, actorID int, req UpdatePayoutNotesRequest) error {
	if payoutID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	return s.repo.UpdatePayoutNotes(ctx, payoutID, actorID, req)
}

// UpdatePayoutCheck toggles one checklist item.
//
// The key is validated against the server-side whitelist here rather than being
// left to the database's CHECK constraint: an unknown key must come back as a
// 422 naming the problem, not as a generic 500 from a constraint violation.
func (s *AuditorService) UpdatePayoutCheck(ctx context.Context, payoutID, actorID int, req UpdatePayoutCheckRequest) error {
	if payoutID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	if !isPayoutReviewItemKey(req.ItemKey) {
		return fmt.Errorf("%w: unknown checklist item %q", ErrValidation, req.ItemKey)
	}
	return s.repo.UpdatePayoutCheck(ctx, payoutID, actorID, req)
}

// ListBankVerifications backs the auditor's bank-verification queue.
//
// Status is validated here rather than passed through: an unrecognised filter
// must not silently widen the queue to every organizer on the platform.
func (s *AuditorService) ListBankVerifications(ctx context.Context, filters BankVerificationFilters) ([]*BankVerificationItem, error) {
	if filters.Limit <= 0 {
		filters.Limit = 20
	}
	if filters.Limit > 100 {
		filters.Limit = 100
	}
	if filters.Page <= 0 {
		filters.Page = 1
	}
	switch filters.Status {
	case "", bankVerificationUnverified, bankVerificationVerified, "changed":
	default:
		return nil, fmt.Errorf("%w: unknown status filter %q", ErrValidation, filters.Status)
	}
	return s.repo.ListBankVerifications(ctx, filters)
}

func (s *AuditorService) VerifyOrganizerBankAccount(ctx context.Context, appID, actorID int, req VerifyBankAccountRequest) error {
	if appID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	if strings.TrimSpace(req.AccountNumber) == "" {
		return ErrValidation
	}
	return s.repo.VerifyOrganizerBankAccount(ctx, appID, actorID, req)
}

func (s *AuditorService) RejectPayout(ctx context.Context, payoutID, actorID int, req RejectPayoutRequest) error {
	if payoutID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	if strings.TrimSpace(req.Reason) == "" {
		return ErrValidation
	}
	return s.repo.RejectPayout(ctx, payoutID, actorID, req)
}

func (s *AuditorService) HoldPayout(ctx context.Context, payoutID, actorID int, req HoldPayoutRequest) error {
	if payoutID <= 0 || actorID <= 0 {
		return ErrValidation
	}
	if strings.TrimSpace(req.Reason) == "" {
		return ErrValidation
	}
	return s.repo.HoldPayout(ctx, payoutID, actorID, req)
}

func (s *AuditorService) ListEventRevisions(ctx context.Context, eventID int) ([]Revision, error) {
	if eventID <= 0 {
		return nil, ErrValidation
	}
	review, err := s.repo.GetEventReview(ctx, eventID)
	if err != nil {
		return nil, err
	}
	return review.Revisions, nil
}

// ---- Notification Methods ----

func (s *AuditorService) ListNotifications(ctx context.Context, userID int) ([]*AuditorNotification, error) {
	if userID <= 0 {
		return nil, fmt.Errorf("%w: invalid user ID", ErrValidation)
	}
	return s.repo.ListNotifications(ctx, userID)
}

func (s *AuditorService) MarkNotificationsRead(ctx context.Context, userID int, notificationIDs []int) error {
	if userID <= 0 {
		return fmt.Errorf("%w: invalid user ID", ErrValidation)
	}
	return s.repo.MarkNotificationsRead(ctx, userID, notificationIDs)
}

// ---- Slice helpers (avoid nil JSON) ----

func dereferenceActivity(items []*Activity) []Activity {
	out := make([]Activity, 0, len(items))
	for _, a := range items {
		if a != nil {
			out = append(out, *a)
		}
	}
	return out
}

func dereferenceReviews(items []*EventReview) []EventReview {
	out := make([]EventReview, 0, len(items))
	for _, r := range items {
		if r != nil {
			out = append(out, *r)
		}
	}
	return out
}
