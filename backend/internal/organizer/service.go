package organizer

import (
	"bytes"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"crowdflow-backend/internal/storage"
)

type OrganizerService struct {
	repo    Repository
	storage *storage.S3Storage
}

func NewOrganizerService(repo Repository, storage *storage.S3Storage) *OrganizerService {
	return &OrganizerService{repo: repo, storage: storage}
}

func (s *OrganizerService) Apply(ctx context.Context, userID int, req ApplyRequest, docs []*DocumentUpload) (*OrganizerApplication, error) {
	if req.BusinessName == "" {
		return nil, fmt.Errorf("%w: business name is required", ErrValidation)
	}
	if req.BusinessType == "" {
		return nil, fmt.Errorf("%w: business type is required", ErrValidation)
	}
	if req.BusinessEmail == "" {
		return nil, fmt.Errorf("%w: business email is required", ErrValidation)
	}
	if req.BusinessPhone == "" {
		return nil, fmt.Errorf("%w: business phone is required", ErrValidation)
	}

	hasKTP := false
	for _, d := range docs {
		if strings.ToUpper(d.Type) == "KTP" {
			hasKTP = true
			break
		}
	}
	if !hasKTP {
		return nil, fmt.Errorf("%w: KTP document upload is required", ErrValidation)
	}

	app := &OrganizerApplication{
		UserID:        userID,
		BusinessName:  req.BusinessName,
		BusinessType:  req.BusinessType,
		BusinessEmail: req.BusinessEmail,
		BusinessPhone: req.BusinessPhone,
		Status:        "pending",
	}
	if req.Website != "" {
		app.Website = &req.Website
	}
	if req.Description != "" {
		app.Description = &req.Description
	}
	if req.BankName != "" {
		app.BankName = &req.BankName
	}
	if req.BankAccountHolder != "" {
		app.BankAccountHolder = &req.BankAccountHolder
	}
	if req.BankAccountNumber != "" {
		app.BankAccountNumber = &req.BankAccountNumber
	}
	if req.BusinessAddress != "" {
		app.BusinessAddress = &req.BusinessAddress
	}

	var docModels []*OrganizerDocument
	for _, doc := range docs {
		if err := validateDocumentUpload(doc); err != nil {
			return nil, err
		}
		contentType := http.DetectContentType(doc.Content)
		if !s.isValidDocumentType(contentType) {
			return nil, fmt.Errorf("%w: invalid format for %s (must be PDF, PNG, or JPG)", ErrValidation, doc.Type)
		}

		ext := filepath.Ext(doc.Filename)
		if ext == "" {
			if contentType == "application/pdf" {
				ext = ".pdf"
			} else {
				ext = ".png"
			}
		}

		timestamp := time.Now().UnixNano()
		objectKey := fmt.Sprintf("organizers/documents/%d_%d_%s%s", userID, timestamp, strings.ToLower(doc.Type), ext)

		bodyReader := bytes.NewReader(doc.Content)
		err := s.storage.UploadPrivateFile(ctx, objectKey, bodyReader, contentType)
		if err != nil {
			return nil, fmt.Errorf("failed to upload %s: %w", doc.Type, err)
		}

		docModels = append(docModels, &OrganizerDocument{
			DocumentType: doc.Type,
			FilePath:     objectKey,
			Status:       "pending_verification",
			FileName:     sanitizeDocumentFileName(doc.Filename),
			FileSize:     int64(len(doc.Content)),
		})
	}

	err := s.repo.Create(ctx, app, docModels)
	if err != nil {
		return nil, err
	}

	app.Documents = docModels
	s.populatePresignedURLs(ctx, app)

	return app, nil
}

func (s *OrganizerService) GetApplication(ctx context.Context, userID int) (*OrganizerApplication, error) {
	app, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	s.populatePresignedURLs(ctx, app)

	return app, nil
}

// ListAccountDocuments returns the organizer's current account documents.
func (s *OrganizerService) ListAccountDocuments(ctx context.Context, userID int) ([]*OrganizerDocument, error) {
	return s.repo.ListAccountDocuments(ctx, userID)
}

// GetAccountDocumentReadiness reports whether the organizer's account paperwork
// clears the submission gate, so the console can say so before they build an
// entire event.
func (s *OrganizerService) GetAccountDocumentReadiness(ctx context.Context, userID int) (*AccountDocumentReadiness, error) {
	return s.repo.GetAccountDocumentReadiness(ctx, userID)
}

// UploadAccountDocument files a new version of one account document.
//
// Note what this does NOT check: whether the application is approved.
// UpdateApplication refuses once approved, which is right for business details
// but left an approved organizer unable to answer a document rejection. Filing
// a document is the one change an approved organizer must always be able to
// make.
func (s *OrganizerService) UploadAccountDocument(ctx context.Context, userID int, doc *DocumentUpload) (*OrganizerDocument, error) {
	doc.Type = strings.ToUpper(strings.TrimSpace(doc.Type))
	if !IsValidAccountDocumentType(doc.Type) {
		return nil, fmt.Errorf("%w: unknown document type %q", ErrValidation, doc.Type)
	}
	if err := validateDocumentUpload(doc); err != nil {
		return nil, err
	}

	contentType := http.DetectContentType(doc.Content)
	if !s.isValidDocumentType(contentType) {
		return nil, fmt.Errorf("%w: invalid format for %s (must be PDF, PNG, or JPG)", ErrValidation, doc.Type)
	}

	ext := filepath.Ext(doc.Filename)
	if ext == "" {
		if contentType == "application/pdf" {
			ext = ".pdf"
		} else {
			ext = ".png"
		}
	}

	// Same key shape as Apply, including the timestamp: a replacement must not
	// overwrite the object the superseded row still points at.
	objectKey := fmt.Sprintf("organizers/documents/%d_%d_%s%s", userID, time.Now().UnixNano(), strings.ToLower(doc.Type), ext)
	if err := s.storage.UploadPrivateFile(ctx, objectKey, bytes.NewReader(doc.Content), contentType); err != nil {
		return nil, fmt.Errorf("failed to upload %s: %w", doc.Type, err)
	}

	// The client's filename is recorded as-is for display only. It is never used
	// to build the object key — that stays derived from the user id, a timestamp
	// and the document type, so a hostile name cannot reach the bucket path.
	model := &OrganizerDocument{
		DocumentType: doc.Type,
		FilePath:     objectKey,
		FileName:     sanitizeDocumentFileName(doc.Filename),
		FileSize:     int64(len(doc.Content)),
	}
	if err := s.repo.ReplaceAccountDocument(ctx, userID, model); err != nil {
		return nil, err
	}
	return model, nil
}

// DeleteAccountDocument removes a document the caller owns, then purges the
// object. The row goes first: an orphaned object is invisible waste, whereas a
// row pointing at a deleted object is a broken View button.
func (s *OrganizerService) DeleteAccountDocument(ctx context.Context, userID, docID int) error {
	filePath, err := s.repo.DeleteAccountDocument(ctx, userID, docID)
	if err != nil {
		return err
	}
	if filePath != "" {
		_ = s.storage.DeletePrivateFile(ctx, filePath)
	}
	return nil
}

// sanitizeDocumentFileName keeps a client filename displayable: basename only,
// no path segments, and bounded to the column's 255 chars. Browsers send a bare
// name, but the field is client-controlled and is rendered back into the console.
func sanitizeDocumentFileName(name string) string {
	name = strings.TrimSpace(name)
	if i := strings.LastIndexAny(name, `/\`); i >= 0 {
		name = name[i+1:]
	}
	if len(name) > 255 {
		name = name[:255]
	}
	return name
}

// GetAccountDocumentURL mints a short-lived link to a document the caller owns.
// The bucket is private, so the stored file_path is an object key and is never
// itself a usable URL.
func (s *OrganizerService) GetAccountDocumentURL(ctx context.Context, userID, docID int) (string, error) {
	path, err := s.repo.GetAccountDocumentPath(ctx, userID, docID)
	if err != nil {
		return "", err
	}
	return s.storage.GetPresignedURL(ctx, path, 2*time.Minute)
}

func (s *OrganizerService) UpdateApplication(ctx context.Context, userID int, req ApplyRequest, newDocs []*DocumentUpload) (*OrganizerApplication, error) {
	app, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if app.Status == "approved" || app.Status == "in_review" {
		return nil, ErrApplicationLocked
	}

	app.BusinessName = req.BusinessName
	app.BusinessType = req.BusinessType
	app.BusinessEmail = req.BusinessEmail
	app.BusinessPhone = req.BusinessPhone
	if req.Website != "" {
		app.Website = &req.Website
	} else {
		app.Website = nil
	}
	if req.Description != "" {
		app.Description = &req.Description
	} else {
		app.Description = nil
	}
	if req.BankName != "" {
		app.BankName = &req.BankName
	} else {
		app.BankName = nil
	}
	if req.BankAccountHolder != "" {
		app.BankAccountHolder = &req.BankAccountHolder
	} else {
		app.BankAccountHolder = nil
	}
	if req.BankAccountNumber != "" {
		app.BankAccountNumber = &req.BankAccountNumber
	} else {
		app.BankAccountNumber = nil
	}
	if req.BusinessAddress != "" {
		app.BusinessAddress = &req.BusinessAddress
	} else {
		app.BusinessAddress = nil
	}

	if app.Status == "rejected" || app.Status == "needs_revision" {
		app.Status = "pending"
	}

	var docModels []*OrganizerDocument
	for _, doc := range newDocs {
		if err := validateDocumentUpload(doc); err != nil {
			return nil, err
		}
		contentType := http.DetectContentType(doc.Content)
		if !s.isValidDocumentType(contentType) {
			return nil, fmt.Errorf("%w: invalid format for %s (must be PDF, PNG, or JPG)", ErrValidation, doc.Type)
		}

		ext := filepath.Ext(doc.Filename)
		if ext == "" {
			if contentType == "application/pdf" {
				ext = ".pdf"
			} else {
				ext = ".png"
			}
		}

		timestamp := time.Now().UnixNano()
		objectKey := fmt.Sprintf("organizers/documents/%d_%d_%s%s", userID, timestamp, strings.ToLower(doc.Type), ext)

		bodyReader := bytes.NewReader(doc.Content)
		err := s.storage.UploadPrivateFile(ctx, objectKey, bodyReader, contentType)
		if err != nil {
			return nil, fmt.Errorf("failed to upload %s: %w", doc.Type, err)
		}

		docModels = append(docModels, &OrganizerDocument{
			DocumentType: doc.Type,
			FilePath:     objectKey,
			Status:       "pending_verification",
			FileName:     sanitizeDocumentFileName(doc.Filename),
			FileSize:     int64(len(doc.Content)),
		})
	}

	app.Documents = append(app.Documents, docModels...)

	err = s.repo.Update(ctx, app)
	if err != nil {
		return nil, err
	}

	s.populatePresignedURLs(ctx, app)

	return app, nil
}

func (s *OrganizerService) DeleteApplication(ctx context.Context, userID int) error {
	app, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return err
	}

	if app.Status == "approved" {
		return fmt.Errorf("%w: cannot delete approved applications", ErrApplicationLocked)
	}

	return s.repo.Delete(ctx, app.ID)
}

// validateDocumentUpload enforces the per-file rules on an account-level
// application document. The event-document path had these checks from the
// start; this path only ever sniffed the content type, so a single file was
// bounded by nothing but the whole-request cap.
func validateDocumentUpload(doc *DocumentUpload) error {
	if len(doc.Content) == 0 {
		return fmt.Errorf("%w: %s file is empty", ErrValidation, doc.Type)
	}
	if len(doc.Content) > maxDocumentBytes {
		return fmt.Errorf("%w: %s exceeds the 10MB limit", ErrValidation, doc.Type)
	}
	return nil
}

func (s *OrganizerService) isValidDocumentType(contentType string) bool {
	return contentType == "application/pdf" ||
		contentType == "image/jpeg" ||
		contentType == "image/png" ||
		contentType == "image/webp"
}

// ============================================================================
// Per-event documents
// ============================================================================

// maxDocumentBytes caps a SINGLE uploaded file. Documents are scans of
// paperwork, not media; 10MB is generous for a multi-page PDF. Applies to both
// account-level application documents (KTP/NPWP/NIB) and per-event documents.
const maxDocumentBytes = 10 << 20

// maxUploadRequestBytes caps a whole multipart request. Deliberately only 2MB
// above the per-file cap: it is headroom for multipart framing, not room for
// several 10MB files. It must stay <= nginx's client_max_body_size, or oversized
// uploads die at the proxy with an HTML 413 instead of a readable 422.
const maxUploadRequestBytes = 12 << 20

// eventDocumentURLTTL is how long a minted view link stays valid.
//
// A presigned URL is a bearer credential: whoever holds it can read the file with
// no identity check at all. These documents carry NIK, so the window is kept to
// the time it takes a browser to follow the link — not the length of a work
// session. It is minted only on an explicit view request (never handed out in
// list responses), so a short TTL costs nothing.
//
// Two minutes rather than one to absorb clock skew between us and the S3/R2
// endpoint, which invalidates a signature outright. Expiry is evaluated when the
// request starts, so a slow download of a large PDF is unaffected.
const eventDocumentURLTTL = 2 * time.Minute

func (s *OrganizerService) ListEventDocuments(ctx context.Context, eventID int) (*EventDocumentsResponse, error) {
	docs, err := s.repo.ListEventDocuments(ctx, eventID)
	if err != nil {
		return nil, err
	}

	present := map[string]bool{}
	for _, doc := range docs {
		// A rejected document does not count towards completeness — the publish
		// gate applies the same rule, so the tab must agree with it.
		if doc.Status != "rejected" {
			present[doc.DocumentType] = true
		}
		// Deliberately NOT presigned here. Listing the tab used to mint a live
		// link for every document whether or not anyone opened one, which put
		// four bearer credentials into a response (and into browser history,
		// devtools, and any log that captured it) on every page load.
	}

	missing := []string{}
	for _, t := range RequiredEventDocumentTypes {
		if !present[t] {
			missing = append(missing, t)
		}
	}

	return &EventDocumentsResponse{
		Documents: docs,
		Required:  RequiredEventDocumentTypes,
		Missing:   missing,
		Complete:  len(missing) == 0,
	}, nil
}

func (s *OrganizerService) UploadEventDocument(ctx context.Context, eventID int, userID int, upload *EventDocumentUpload) (*EventDocument, error) {
	docType := strings.ToUpper(strings.TrimSpace(upload.Type))
	if !IsValidEventDocumentType(docType) {
		return nil, fmt.Errorf("%w: unknown document type %q", ErrValidation, upload.Type)
	}
	if len(upload.Content) == 0 {
		return nil, fmt.Errorf("%w: %s file is empty", ErrValidation, EventDocumentLabel(docType))
	}
	if len(upload.Content) > maxDocumentBytes {
		return nil, fmt.Errorf("%w: %s exceeds the 10MB limit", ErrValidation, EventDocumentLabel(docType))
	}

	contentType := http.DetectContentType(upload.Content)
	if !s.isValidDocumentType(contentType) {
		return nil, fmt.Errorf("%w: invalid format for %s (must be PDF, PNG, or JPG)", ErrValidation, EventDocumentLabel(docType))
	}

	ext := filepath.Ext(upload.Filename)
	if ext == "" {
		if contentType == "application/pdf" {
			ext = ".pdf"
		} else {
			ext = ".png"
		}
	}

	// Private bucket only. These carry NIK (protected personal data under UU PDP)
	// and are read back through short-lived presigned URLs, never GetPublicURL.
	objectKey := fmt.Sprintf("events/%d/documents/%d_%s%s", eventID, time.Now().UnixNano(), strings.ToLower(docType), ext)
	if err := s.storage.UploadPrivateFile(ctx, objectKey, bytes.NewReader(upload.Content), contentType); err != nil {
		return nil, fmt.Errorf("failed to upload %s: %w", EventDocumentLabel(docType), err)
	}

	doc := &EventDocument{
		EventID:      eventID,
		DocumentType: docType,
		FilePath:     objectKey,
		FileName:     filepath.Base(upload.Filename),
		FileSize:     int64(len(upload.Content)),
		ContentType:  contentType,
	}

	replaced, err := s.repo.UpsertEventDocument(ctx, doc, userID)
	if err != nil {
		// The object is already in the bucket; drop it rather than leave an
		// orphan no row points at.
		_ = s.storage.DeletePrivateFile(ctx, objectKey)
		return nil, err
	}
	if replaced != "" {
		// Best effort: a surviving orphan costs storage, not correctness.
		_ = s.storage.DeletePrivateFile(ctx, replaced)
	}

	return doc, nil
}

// GetEventDocumentURL mints a short-lived view link for one document. Separated
// from the list call on purpose: a link is only ever created when someone
// actually asks to open that specific file.
func (s *OrganizerService) GetEventDocumentURL(ctx context.Context, eventID int, docID int) (*EventDocumentURL, error) {
	doc, err := s.repo.GetEventDocument(ctx, eventID, docID)
	if err != nil {
		return nil, err
	}

	url, err := s.storage.GetPresignedURL(ctx, doc.FilePath, eventDocumentURLTTL)
	if err != nil {
		return nil, err
	}

	return &EventDocumentURL{
		URL:       url,
		ExpiresIn: int(eventDocumentURLTTL.Seconds()),
	}, nil
}

func (s *OrganizerService) DeleteEventDocument(ctx context.Context, eventID int, docID int) error {
	filePath, err := s.repo.DeleteEventDocument(ctx, eventID, docID)
	if err != nil {
		return err
	}
	if filePath != "" {
		_ = s.storage.DeletePrivateFile(ctx, filePath)
	}
	return nil
}

func (s *OrganizerService) populatePresignedURLs(ctx context.Context, app *OrganizerApplication) {
	for _, doc := range app.Documents {
		url, err := s.storage.GetPresignedURL(ctx, doc.FilePath, 15*time.Minute)
		if err == nil {
			doc.PresignedURL = url
		}
	}
}

// ============================================================================
// eorganizer Service Implementations
// ============================================================================

func (s *OrganizerService) GetDashboardData(ctx context.Context, organizerID int) (*DashboardResponse, error) {
	return s.repo.GetDashboardData(ctx, organizerID)
}

func (s *OrganizerService) ListOrganizerEvents(ctx context.Context, organizerID int, archived bool) ([]*OrganizerEvent, error) {
	return s.repo.ListOrganizerEvents(ctx, organizerID, archived)
}

func (s *OrganizerService) GetOrganizerEvent(ctx context.Context, eventID int, organizerID int) (*OrganizerEvent, error) {
	return s.repo.GetOrganizerEvent(ctx, eventID, organizerID)
}

func (s *OrganizerService) DeleteOrganizerEvent(ctx context.Context, eventID int, organizerID int) error {
	err := s.repo.DeleteOrganizerEvent(ctx, eventID, organizerID)
	// The repo's WHERE clause folds "not yours", "doesn't exist" and "not a
	// draft" into one empty result. Ownership is already enforced by
	// requireEventOwnership upstream, so by the time we get here the realistic
	// cause is that the event is no longer a draft.
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotDraft
	}
	return err
}

// WithdrawEventFromReview pulls an event back out of the auditor queue and
// returns it to draft, so a mis-submission can be corrected (and then deleted,
// since deletion is draft-only). Refused once an auditor has claimed the event.
func (s *OrganizerService) WithdrawEventFromReview(ctx context.Context, eventID int, organizerID int) error {
	return s.repo.WithdrawEventFromReview(ctx, eventID, organizerID)
}

// SetEventArchived hides or restores an event without touching its status, so a
// rejected event stays rejected and its review trail survives.
func (s *OrganizerService) SetEventArchived(ctx context.Context, eventID int, organizerID int, archived bool) error {
	return s.repo.SetEventArchived(ctx, eventID, organizerID, archived)
}

// SetEventListed puts an approved event on sale, or withdraws it. The organizer
// has the final call: an auditor's approval makes an event eligible to be
// listed, it does not list it.
func (s *OrganizerService) SetEventListed(ctx context.Context, eventID int, organizerID int, listed bool) error {
	return s.repo.SetEventListed(ctx, eventID, organizerID, listed)
}

// salesDateLayout is what the console sends for a tier's sales window: a bare
// calendar date, no time and no zone.
const salesDateLayout = "2006-01-02"

// eventTimeZone is the zone a bare sales date is interpreted in. The platform
// is Indonesia-only (prices are IDR, tax is the local entertainment tax), and
// there is no per-event timezone column, so an organizer picking "July 27"
// means July 27 in Jakarta. If events ever span regions this must become a
// column on events rather than a constant.
var eventTimeZone = func() *time.Location {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		// Zone databases are absent from some minimal container images. UTC+7
		// has no DST, so a fixed offset is exactly equivalent here.
		return time.FixedZone("WIB", 7*60*60)
	}
	return loc
}()

// parseSalesStart reads a sales-window opening date as the FIRST instant of
// that day, local time.
func parseSalesStart(value string) (time.Time, error) {
	t, err := time.ParseInLocation(salesDateLayout, strings.TrimSpace(value), eventTimeZone)
	if err != nil {
		return time.Time{}, fmt.Errorf("%w: sales start must be a date in YYYY-MM-DD form", ErrValidation)
	}
	return t, nil
}

// parseSalesEnd reads a sales-window closing date as the LAST instant of that
// day, local time.
//
// Parsing it as midnight — which is what time.Parse yields, and in UTC at that
// — closed sales at 07:00 Jakarta on the chosen day, silently discarding the
// whole of the organizer's final selling day. "Sales end July 27" means sales
// are open through July 27.
func parseSalesEnd(value string) (time.Time, error) {
	t, err := time.ParseInLocation(salesDateLayout, strings.TrimSpace(value), eventTimeZone)
	if err != nil {
		return time.Time{}, fmt.Errorf("%w: sales end must be a date in YYYY-MM-DD form", ErrValidation)
	}
	return t.Add(24*time.Hour - time.Second), nil
}

// validateSalesWindow rejects a window that is absent, malformed, or backwards.
// These used to fall back to now() and now()+1 month, which meant a tier saved
// with blank dates quietly stopped selling a month later and a typo'd date was
// indistinguishable from a deliberate one.
func validateSalesWindow(tier *OrganizerTicketTier) error {
	start, err := parseSalesStart(tier.SalesStart)
	if err != nil {
		return err
	}
	end, err := parseSalesEnd(tier.SalesEnd)
	if err != nil {
		return err
	}
	if !end.After(start) {
		return fmt.Errorf("%w: sales end must be on or after the sales start date", ErrValidation)
	}
	return nil
}

// validateSalesWindowUpdate applies the same rules to an update, where the
// payload may legitimately be partial: an omitted date means "leave that
// endpoint of the window alone". A date that
// IS supplied must still be well-formed.
//
// Ordering can only be checked when both arrive together; a partial update that
// moves one endpoint past the other is caught by the CHECK the migration adds.
func validateSalesWindowUpdate(tier *OrganizerTicketTier) error {
	hasStart := strings.TrimSpace(tier.SalesStart) != ""
	hasEnd := strings.TrimSpace(tier.SalesEnd) != ""

	if hasStart {
		if _, err := parseSalesStart(tier.SalesStart); err != nil {
			return err
		}
	}
	if hasEnd {
		if _, err := parseSalesEnd(tier.SalesEnd); err != nil {
			return err
		}
	}
	if hasStart && hasEnd {
		return validateSalesWindow(tier)
	}
	return nil
}

func (s *OrganizerService) ListTicketTiers(ctx context.Context, eventID int, organizerID int) ([]*OrganizerTicketTier, error) {
	return s.repo.ListTicketTiers(ctx, eventID, organizerID)
}

func (s *OrganizerService) CreateTicketTier(ctx context.Context, eventID int, organizerID int, tier *OrganizerTicketTier) error {
	if tier.Name == "" {
		return fmt.Errorf("%w: tier name is required", ErrValidation)
	}
	if tier.Price < 0 {
		return fmt.Errorf("%w: ticket price cannot be negative", ErrValidation)
	}
	if tier.Capacity <= 0 {
		return fmt.Errorf("%w: ticket capacity must be greater than zero", ErrValidation)
	}
	if err := validateSalesWindow(tier); err != nil {
		return err
	}
	return s.repo.CreateTicketTier(ctx, eventID, organizerID, tier)
}

func (s *OrganizerService) UpdateTicketTier(ctx context.Context, eventID int, organizerID int, tierID int, tier *OrganizerTicketTier) error {
	if tier.Name == "" {
		return fmt.Errorf("%w: tier name is required", ErrValidation)
	}
	if tier.Price < 0 {
		return fmt.Errorf("%w: ticket price cannot be negative", ErrValidation)
	}
	if tier.Capacity <= 0 {
		return fmt.Errorf("%w: ticket capacity must be greater than zero", ErrValidation)
	}
	if err := validateSalesWindowUpdate(tier); err != nil {
		return err
	}
	return s.repo.UpdateTicketTier(ctx, eventID, organizerID, tierID, tier)
}

func (s *OrganizerService) DeleteTicketTier(ctx context.Context, eventID int, organizerID int, tierID int) error {
	return s.repo.DeleteTicketTier(ctx, eventID, organizerID, tierID)
}

func (s *OrganizerService) ListOrders(ctx context.Context, organizerID int) ([]*OrganizerOrder, error) {
	return s.repo.ListOrders(ctx, organizerID)
}

func (s *OrganizerService) ListEventOrders(ctx context.Context, eventID int, organizerID int) ([]*OrganizerOrder, error) {
	return s.repo.ListEventOrders(ctx, eventID, organizerID)
}

func (s *OrganizerService) GetOrderDetails(ctx context.Context, orderID string, organizerID int) (*OrganizerOrder, error) {
	return s.repo.GetOrderDetails(ctx, orderID, organizerID)
}

func (s *OrganizerService) ListRefunds(ctx context.Context, organizerID int) ([]*OrganizerRefund, error) {
	return s.repo.ListRefunds(ctx, organizerID)
}

func (s *OrganizerService) ListAttendees(ctx context.Context, organizerID int) ([]*OrganizerAttendee, error) {
	return s.repo.ListAttendees(ctx, organizerID)
}

func (s *OrganizerService) ListEventAttendees(ctx context.Context, eventID int, organizerID int) ([]*OrganizerAttendee, error) {
	return s.repo.ListEventAttendees(ctx, eventID, organizerID)
}

func (s *OrganizerService) GetFinanceSummary(ctx context.Context, organizerID int) (*OrganizerFinance, error) {
	return s.repo.GetFinanceSummary(ctx, organizerID)
}

func (s *OrganizerService) ListPayouts(ctx context.Context, organizerID int) ([]*OrganizerPayout, error) {
	return s.repo.ListPayouts(ctx, organizerID)
}

func (s *OrganizerService) CreatePayoutRequest(ctx context.Context, eventID int, organizerID int, amount float64) error {
	if amount <= 0 {
		return fmt.Errorf("%w: payout amount must be greater than zero", ErrValidation)
	}
	return s.repo.CreatePayoutRequest(ctx, eventID, organizerID, amount)
}

func (s *OrganizerService) CreateOrganizerEvent(ctx context.Context, organizerID int, event *OrganizerEvent) error {
	if event.Name == "" {
		return fmt.Errorf("%w: event title is required", ErrValidation)
	}
	if event.StartDate == "" || event.EndDate == "" {
		return fmt.Errorf("%w: event dates are required", ErrValidation)
	}
	if event.Capacity < 0 {
		return fmt.Errorf("%w: event capacity cannot be negative", ErrValidation)
	}
	if err := validateVenueSelection(event); err != nil {
		return err
	}
	return s.repo.CreateOrganizerEvent(ctx, organizerID, event)
}

// validateVenueSelection checks the SHAPE of a venue selection when one is
// present. It does not require one: the creation wizard no longer asks for a
// venue, so a draft may carry none at all and the organizer picks it later in
// the workspace (SetEventVenue, which does require one).
//
// What this still catches is a half-filled inline venue — an empty name used to
// reach the repository and create a venue row literally named "", which then
// polluted the catalogue and the venue-designer picker.
func validateVenueSelection(event *OrganizerEvent) error {
	if event.VenueID > 0 {
		return nil
	}
	if nv := event.NewVenue; nv != nil {
		if strings.TrimSpace(nv.Name) == "" {
			return fmt.Errorf("%w: new venue requires a name", ErrValidation)
		}
		if strings.TrimSpace(nv.Address) == "" {
			return fmt.Errorf("%w: new venue requires a street address", ErrValidation)
		}
		if strings.TrimSpace(nv.City) == "" {
			return fmt.Errorf("%w: new venue requires a city", ErrValidation)
		}
		return nil
	}
	// Legacy clients that only ever sent a bare venue name.
	if strings.TrimSpace(event.VenueName) != "" {
		return nil
	}
	// No venue at all is fine on a draft.
	return nil
}

// maxCoverImageBytes caps a cover upload. Matches the event package's own cover
// handler so the two entry points can't disagree on what's acceptable.
const maxCoverImageBytes = 10 << 20

// UploadEventCover stores new cover art in the PUBLIC bucket and points the
// event at it. The creation wizard only ever carried the picked file's *name*
// into cover_image_url, which produced a broken URL like "poster.jpg"; this is
// the path that actually persists an image.
//
// The previous object is intentionally left in the bucket: cover_image_url is
// public and may already be cached by a CDN or referenced by a shared link, and
// an event page rendering a 404 is worse than an orphaned object.
func (s *OrganizerService) UploadEventCover(ctx context.Context, eventID int, organizerID int, upload *CoverImageUpload) (string, error) {
	if len(upload.Content) == 0 {
		return "", fmt.Errorf("%w: cover image is empty", ErrValidation)
	}
	if len(upload.Content) > maxCoverImageBytes {
		return "", fmt.Errorf("%w: cover image exceeds the 10MB limit", ErrValidation)
	}

	// Sniff the real type rather than trusting the extension or the client's
	// Content-Type, both of which are caller-controlled.
	contentType := http.DetectContentType(upload.Content)
	switch contentType {
	case "image/png", "image/jpeg", "image/webp":
	default:
		return "", fmt.Errorf("%w: cover image must be PNG, JPG, or WebP", ErrValidation)
	}

	ext := strings.ToLower(filepath.Ext(upload.Filename))
	if ext == "" {
		switch contentType {
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		default:
			ext = ".jpg"
		}
	}

	objectKey := fmt.Sprintf("events/covers/%d_%d%s", eventID, time.Now().UnixNano(), ext)
	if err := s.storage.UploadPublicFile(ctx, objectKey, bytes.NewReader(upload.Content), contentType); err != nil {
		return "", fmt.Errorf("failed to upload cover image: %w", err)
	}

	url := s.storage.GetPublicURL(objectKey)
	if err := s.repo.SetEventCoverImage(ctx, eventID, organizerID, url); err != nil {
		return "", err
	}
	return url, nil
}

// mapsURLHosts is the allowlist for an event's map link: host to required path
// prefix ("" = any path). Google Maps only — the buyer page offers no other
// map provider.
//
// The value is rendered as an href on a public event page, so an unrestricted
// one would turn every event into an open redirect an organizer controls.
//
// Hosts are matched exactly rather than by suffix, so no other *.google.com
// property qualifies. google.com itself carries a path requirement because the
// bare host is not safe on its own: https://google.com/url?q=... is a
// redirector that would hand an organizer any destination they liked.
// maps.google.com needs no such rule — every path on it is already a map — and
// maps.app.goo.gl exists precisely to serve an opaque path.
var mapsURLHosts = map[string]string{
	"google.com":      "/maps",
	"maps.google.com": "",
	"goo.gl":          "/maps",
	"maps.app.goo.gl": "",
}

// validateMapsURL accepts an empty string (meaning "clear the link") or an
// https URL on an allowlisted map host.
func validateMapsURL(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", nil
	}

	u, err := url.Parse(trimmed)
	if err != nil {
		return "", fmt.Errorf("%w: that does not look like a valid URL", ErrValidation)
	}
	// Scheme first: a bare "google.com/maps" parses with an empty Host, and
	// javascript: URLs must never reach an href.
	if u.Scheme != "https" {
		return "", fmt.Errorf("%w: the link must start with https://", ErrValidation)
	}

	host := strings.TrimPrefix(strings.ToLower(u.Hostname()), "www.")
	prefix, ok := mapsURLHosts[host]
	if !ok {
		return "", fmt.Errorf(
			"%w: only Google Maps links are accepted (google.com/maps, maps.google.com, maps.app.goo.gl, goo.gl/maps)",
			ErrValidation,
		)
	}
	if prefix != "" && !strings.HasPrefix(u.EscapedPath(), prefix) {
		return "", fmt.Errorf(
			"%w: that is a %s link but not a Maps one — the path must start with %s",
			ErrValidation, host, prefix,
		)
	}
	return trimmed, nil
}

// SetEventMapsURL stores the organizer's own map link for an event, replacing
// the name+address search the buyer page falls back to.
func (s *OrganizerService) SetEventMapsURL(ctx context.Context, eventID int, organizerID int, rawURL string) error {
	if eventID <= 0 {
		return fmt.Errorf("%w: invalid event ID", ErrValidation)
	}
	clean, err := validateMapsURL(rawURL)
	if err != nil {
		return err
	}
	return s.repo.SetEventMapsURL(ctx, eventID, organizerID, clean)
}

// maxTicketsPerOrderCeiling is an upper bound on what an organizer may set, so
// a typo (100000) cannot quietly become "effectively uncapped" while still
// reading like a real limit. Uncapped has its own explicit value: 0.
const maxTicketsPerOrderCeiling = 100

// SetEventMaxTicketsPerOrder stores how many tickets one order may contain for
// this event, counted across every ticket type together.
func (s *OrganizerService) SetEventMaxTicketsPerOrder(ctx context.Context, eventID int, organizerID int, maxPerOrder int) error {
	if eventID <= 0 {
		return fmt.Errorf("%w: invalid event ID", ErrValidation)
	}
	if maxPerOrder < 0 {
		return fmt.Errorf("%w: the ticket limit cannot be negative (use 0 for no limit)", ErrValidation)
	}
	if maxPerOrder > maxTicketsPerOrderCeiling {
		return fmt.Errorf("%w: the ticket limit cannot exceed %d per order (use 0 for no limit)", ErrValidation, maxTicketsPerOrderCeiling)
	}
	return s.repo.SetEventMaxTicketsPerOrder(ctx, eventID, organizerID, maxPerOrder)
}

// SetEventVenue binds the event to a venue from the workspace's Venue tab.
// Unlike creation, a venue is mandatory here — this endpoint exists for no
// other purpose.
func (s *OrganizerService) SetEventVenue(ctx context.Context, eventID int, organizerID int, event *OrganizerEvent) error {
	if eventID <= 0 {
		return fmt.Errorf("%w: invalid event ID", ErrValidation)
	}
	if event.VenueID <= 0 && event.NewVenue == nil {
		return fmt.Errorf("%w: pick an existing venue or supply a new one", ErrValidation)
	}
	if err := validateVenueSelection(event); err != nil {
		return err
	}
	return s.repo.SetEventVenue(ctx, eventID, organizerID, event)
}

func (s *OrganizerService) UpdateOrganizerEvent(ctx context.Context, eventID int, organizerID int, event *OrganizerEvent) error {
	if eventID <= 0 {
		return fmt.Errorf("%w: invalid event ID", ErrValidation)
	}
	if event.Name == "" {
		return fmt.Errorf("%w: event title is required", ErrValidation)
	}
	if event.StartDate == "" || event.EndDate == "" {
		return fmt.Errorf("%w: event dates are required", ErrValidation)
	}
	if event.Capacity < 0 {
		return fmt.Errorf("%w: event capacity cannot be negative", ErrValidation)
	}
	return s.repo.UpdateOrganizerEvent(ctx, eventID, organizerID, event)
}

func (s *OrganizerService) GetPayoutDetails(ctx context.Context, organizerID int) (*PayoutDetails, error) {
	if organizerID <= 0 {
		return nil, fmt.Errorf("%w: invalid organizer ID", ErrValidation)
	}
	return s.repo.GetPayoutDetails(ctx, organizerID)
}

func (s *OrganizerService) UpdatePayoutDetails(ctx context.Context, organizerID int, req UpdatePayoutDetailsRequest) (*PayoutDetails, error) {
	if organizerID <= 0 {
		return nil, fmt.Errorf("%w: invalid organizer ID", ErrValidation)
	}

	req.BankName = strings.TrimSpace(req.BankName)
	req.BankAccountHolder = strings.TrimSpace(req.BankAccountHolder)
	req.BankAccountNumber = strings.TrimSpace(req.BankAccountNumber)

	// All three or nothing. A partial account cannot receive a payout, and
	// storing one would satisfy no gate while looking to the organizer like the
	// task was done.
	if req.BankName == "" {
		return nil, fmt.Errorf("%w: bank name is required", ErrValidation)
	}
	if req.BankAccountHolder == "" {
		return nil, fmt.Errorf("%w: account holder name is required", ErrValidation)
	}
	if req.BankAccountNumber == "" {
		return nil, fmt.Errorf("%w: account number is required", ErrValidation)
	}

	// Indonesian bank account numbers are digits only, typically 10-16. Spaces
	// and dashes are how people write them down, so strip rather than reject.
	digits := strings.Map(func(rn rune) rune {
		if rn >= '0' && rn <= '9' {
			return rn
		}
		if rn == ' ' || rn == '-' {
			return -1
		}
		return rn
	}, req.BankAccountNumber)
	for _, rn := range digits {
		if rn < '0' || rn > '9' {
			return nil, fmt.Errorf("%w: account number may only contain digits", ErrValidation)
		}
	}
	if len(digits) < 8 || len(digits) > 20 {
		return nil, fmt.Errorf("%w: account number must be between 8 and 20 digits", ErrValidation)
	}
	req.BankAccountNumber = digits

	if len(req.BankName) > 100 {
		return nil, fmt.Errorf("%w: bank name is too long", ErrValidation)
	}
	if len(req.BankAccountHolder) > 150 {
		return nil, fmt.Errorf("%w: account holder name is too long", ErrValidation)
	}

	return s.repo.UpdatePayoutDetails(ctx, organizerID, req)
}

func (s *OrganizerService) PublishOrganizerEvent(ctx context.Context, eventID int, organizerID int) error {
	if eventID <= 0 {
		return fmt.Errorf("%w: invalid event ID", ErrValidation)
	}
	return s.repo.PublishOrganizerEvent(ctx, eventID, organizerID)
}

func (s *OrganizerService) GetAnalytics(ctx context.Context, organizerID int, dateRange string) (*OrganizerAnalytics, error) {
	return s.repo.GetAnalytics(ctx, organizerID, dateRange)
}

func (s *OrganizerService) GetEventAnalytics(ctx context.Context, eventID int, organizerID int, dateRange string) (*OrganizerAnalytics, error) {
	if eventID <= 0 {
		return nil, fmt.Errorf("%w: invalid event ID", ErrValidation)
	}
	return s.repo.GetEventAnalytics(ctx, eventID, organizerID, dateRange)
}

func (s *OrganizerService) GetEventCheckInStats(ctx context.Context, eventID int, organizerID int) (*EventCheckInStats, error) {
	if eventID <= 0 {
		return nil, fmt.Errorf("%w: invalid event ID", ErrValidation)
	}
	return s.repo.GetEventCheckInStats(ctx, eventID, organizerID)
}

func (s *OrganizerService) CheckInAttendee(ctx context.Context, eventID int, organizerID int, qrToken string) (*CheckInResponse, error) {
	if qrToken == "" {
		return nil, fmt.Errorf("%w: QR token is required", ErrValidation)
	}
	return s.repo.CheckInAttendee(ctx, eventID, organizerID, qrToken)
}

func (s *OrganizerService) ListNotifications(ctx context.Context, userID int) ([]*Notification, error) {
	if userID <= 0 {
		return nil, fmt.Errorf("%w: invalid user ID", ErrValidation)
	}
	return s.repo.ListNotifications(ctx, userID)
}

func (s *OrganizerService) MarkNotificationsRead(ctx context.Context, userID int, notificationIDs []int) error {
	if userID <= 0 {
		return fmt.Errorf("%w: invalid user ID", ErrValidation)
	}
	return s.repo.MarkNotificationsRead(ctx, userID, notificationIDs)
}

func (s *OrganizerService) GetEventRevisions(ctx context.Context, eventID int, organizerID int) (*EventRevisionFeedback, error) {
	if eventID <= 0 || organizerID <= 0 {
		return nil, fmt.Errorf("%w: invalid parameters", ErrValidation)
	}
	return s.repo.GetEventRevisions(ctx, eventID, organizerID)
}

func (s *OrganizerService) RespondToEventRevision(ctx context.Context, eventID, revID, organizerID int, req RespondRevisionRequest) error {
	if eventID <= 0 || revID <= 0 || organizerID <= 0 {
		return fmt.Errorf("%w: invalid parameters", ErrValidation)
	}
	// An auditor must never receive an explanation the organizer did not write.
	// The client used to substitute canned text for a blank field, which
	// asserted work that may never have happened.
	req.Comment = strings.TrimSpace(req.Comment)
	req.ActionTaken = strings.TrimSpace(req.ActionTaken)
	if req.Comment == "" {
		return fmt.Errorf("%w: an explanation is required", ErrValidation)
	}
	return s.repo.RespondToEventRevision(ctx, eventID, revID, organizerID, req)
}
