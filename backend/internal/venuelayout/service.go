package venuelayout

import (
	"context"
	"fmt"
	"strings"
)

type LayoutService struct {
	repo Repository
}

func NewLayoutService(repo Repository) *LayoutService {
	return &LayoutService{repo: repo}
}

func (s *LayoutService) ListLayouts(ctx context.Context, venueID, userID int) ([]*Layout, error) {
	return s.repo.ListLayouts(ctx, venueID, userID)
}

// GetLayout loads a layout and enforces access: a layout is readable if it is
// public or owned by the requesting user. Event-exclusive layouts owned by
// someone else return ErrForbidden.
func (s *LayoutService) GetLayout(ctx context.Context, layoutID, userID int) (*LayoutDetail, error) {
	layout, err := s.repo.GetLayout(ctx, layoutID)
	if err != nil {
		return nil, err
	}
	if !canRead(layout, userID) {
		return nil, ErrForbidden
	}
	return layout, nil
}

func canRead(layout *LayoutDetail, userID int) bool {
	if layout.Visibility == "public" {
		return true
	}
	return layout.OwnerUserID != nil && *layout.OwnerUserID == userID
}

func (s *LayoutService) CreateLayout(ctx context.Context, venueID, ownerUserID int, req CreateLayoutRequest) (*Layout, error) {
	if err := validateName(req.Name); err != nil {
		return nil, err
	}
	if err := validateVisibility(req.Visibility, true); err != nil {
		return nil, err
	}
	return s.repo.CreateLayout(ctx, venueID, ownerUserID, req)
}

func (s *LayoutService) SaveLayout(ctx context.Context, venueID, layoutID, userID int, req SaveLayoutRequest) (*SaveLayoutResponse, error) {
	if err := validateName(req.Name); err != nil {
		return nil, err
	}
	if err := validateVisibility(req.Visibility, false); err != nil {
		return nil, err
	}
	if req.ExpectedUpdatedAt.IsZero() {
		return nil, fmt.Errorf("%w: expected_updated_at is required", ErrInvalidInput)
	}
	for _, sec := range req.Sections {
		if strings.TrimSpace(sec.Key) == "" {
			return nil, fmt.Errorf("%w: every section needs a key", ErrInvalidInput)
		}
		if strings.TrimSpace(sec.SectionName) == "" {
			return nil, fmt.Errorf("%w: section %q needs a name", ErrInvalidInput, sec.Key)
		}
	}
	for _, st := range req.Seats {
		if strings.TrimSpace(st.Key) == "" {
			return nil, fmt.Errorf("%w: every seat needs a key", ErrInvalidInput)
		}
	}
	return s.repo.SaveLayout(ctx, venueID, layoutID, userID, req)
}

func validateName(name string) error {
	if strings.TrimSpace(name) == "" {
		return fmt.Errorf("%w: name is required", ErrInvalidInput)
	}
	return nil
}

// validateVisibility permits an empty value only on create, where the repository
// defaults it to "public".
func validateVisibility(v string, allowEmpty bool) error {
	if v == "" {
		if allowEmpty {
			return nil
		}
		return fmt.Errorf("%w: visibility is required", ErrInvalidInput)
	}
	if v != "public" && v != "event_exclusive" {
		return fmt.Errorf("%w: visibility must be 'public' or 'event_exclusive'", ErrInvalidInput)
	}
	return nil
}
