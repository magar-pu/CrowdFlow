package organizer

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
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

func (s *OrganizerService) isValidDocumentType(contentType string) bool {
	return contentType == "application/pdf" ||
		contentType == "image/jpeg" ||
		contentType == "image/png" ||
		contentType == "image/webp"
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

func (s *OrganizerService) ListOrganizerEvents(ctx context.Context, organizerID int) ([]*OrganizerEvent, error) {
	return s.repo.ListOrganizerEvents(ctx, organizerID)
}

func (s *OrganizerService) GetOrganizerEvent(ctx context.Context, eventID int, organizerID int) (*OrganizerEvent, error) {
	return s.repo.GetOrganizerEvent(ctx, eventID, organizerID)
}

func (s *OrganizerService) DeleteOrganizerEvent(ctx context.Context, eventID int, organizerID int) error {
	return s.repo.DeleteOrganizerEvent(ctx, eventID, organizerID)
}

func (s *OrganizerService) GetVenueLayout(ctx context.Context, eventID int, organizerID int) ([]*VenueSection, error) {
	return s.repo.GetVenueLayout(ctx, eventID, organizerID)
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
	return s.repo.UpdateTicketTier(ctx, eventID, organizerID, tierID, tier)
}

func (s *OrganizerService) DeleteTicketTier(ctx context.Context, eventID int, organizerID int, tierID int) error {
	return s.repo.DeleteTicketTier(ctx, eventID, organizerID, tierID)
}

func (s *OrganizerService) ListOrders(ctx context.Context, organizerID int) ([]*OrganizerOrder, error) {
	return s.repo.ListOrders(ctx, organizerID)
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
	return s.repo.CreateOrganizerEvent(ctx, organizerID, event)
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

func (s *OrganizerService) CreateVenueSection(ctx context.Context, eventID int, organizerID int, section *VenueSection) error {
	if section.Name == "" || section.Capacity <= 0 {
		return fmt.Errorf("%w: invalid section name or capacity", ErrValidation)
	}
	return s.repo.CreateVenueSection(ctx, eventID, organizerID, section)
}

func (s *OrganizerService) UpdateVenueSection(ctx context.Context, eventID int, organizerID int, sectionID int, section *VenueSection) error {
	if sectionID <= 0 || section.Capacity <= 0 {
		return fmt.Errorf("%w: invalid section ID or capacity", ErrValidation)
	}
	return s.repo.UpdateVenueSection(ctx, eventID, organizerID, sectionID, section)
}

func (s *OrganizerService) DeleteVenueSection(ctx context.Context, eventID int, organizerID int, sectionID int) error {
	if sectionID <= 0 {
		return fmt.Errorf("%w: invalid section ID", ErrValidation)
	}
	return s.repo.DeleteVenueSection(ctx, eventID, organizerID, sectionID)
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
	return s.repo.RespondToEventRevision(ctx, eventID, revID, organizerID, req)
}
