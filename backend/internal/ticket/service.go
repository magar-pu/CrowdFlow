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

func (s *TicketService) RequestOTP(ticketID string, userID int, email string) (*RequestOTPResponse, error) {
	otpCode, err := s.repo.RequestTicketOTP(ticketID, userID, email)
	if err != nil {
		return nil, err
	}
	return &RequestOTPResponse{
		Message:  "OTP sent successfully to " + email,
		DebugOTP: otpCode,
	}, nil
}

func (s *TicketService) VerifyOTP(ticketID string, userID int, email string, otpCode string) (*VerifyOTPResponse, error) {
	verified, vaultToken, err := s.repo.VerifyTicketOTP(ticketID, userID, email, otpCode)
	if err != nil {
		return nil, err
	}
	return &VerifyOTPResponse{
		Verified:   verified,
		VaultToken: vaultToken,
		Message:    "OTP verified successfully",
	}, nil
}

func (s *TicketService) GetTicketVault(ticketID string, userID int) (*TicketVaultResponse, error) {
	return s.repo.GetTicketVaultData(ticketID, userID)
}
