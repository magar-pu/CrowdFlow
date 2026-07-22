package ticket

type TicketService struct {
	repo Repository
}

func NewService(repo Repository) *TicketService {
	return &TicketService{repo: repo}
}

func (s *TicketService) GetUserTickets(userID int) ([]*Ticket, error) {
	return s.repo.GetUserTickets(userID)
}

func (s *TicketService) GetTicketByID(ticketID string, userID int) (*Ticket, error) {
	return s.repo.GetTicketByID(ticketID, userID)
}

func (s *TicketService) GetTicketQR(ticketID string, userID int) (*TicketQRResponse, error) {
	// First verify ownership
	_, err := s.repo.GetTicketByID(ticketID, userID)
	if err != nil {
		return nil, err
	}

	return s.repo.GetOrCreateDynamicToken(ticketID)
}

func (s *TicketService) CompletePayment(orderID string) (*CompletePaymentResponse, error) {
	count, err := s.repo.GenerateTicketsForPaidOrder(orderID)
	if err != nil {
		return nil, err
	}

	return &CompletePaymentResponse{
		OrderID:      orderID,
		Status:       "PAID",
		TicketsCount: count,
		Message:      "Payment processed successfully and tickets generated",
	}, nil
}
