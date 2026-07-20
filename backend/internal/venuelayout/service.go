package venuelayout

import "context"

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
