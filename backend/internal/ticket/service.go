package ticket

import (
	"crowdflow-backend/internal/mail"
)

type TicketService struct {
	repo        Repository
	mailService mail.Service
}

func NewService(repo Repository, mailService mail.Service) *TicketService {
	return &TicketService{
		repo:        repo,
		mailService: mailService,
	}
}

func (s *TicketService) GetUserTickets(userID int) ([]*Ticket, error) {
	return s.repo.GetUserTickets(userID)
}

func (s *TicketService) GetTicketByID(ticketID string, userID int) (*Ticket, error) {
	return s.repo.GetTicketByID(ticketID, userID)
}

// IssueForPaidOrder issues tickets for an already-paid order — the single
// shared implementation used by both callers that can mark an order paid:
// CompletePayment below (the buyer-triggered POST /orders/complete-payment
// path) and internal/payment's Midtrans webhook, which calls this through
// the narrow payment.TicketIssuer interface it defines so the two packages
// don't need to import each other.
func (s *TicketService) IssueForPaidOrder(orderID string) (int, error) {
	return s.repo.GenerateTicketsForPaidOrder(orderID)
}

func (s *TicketService) CompletePayment(orderID string) (*CompletePaymentResponse, error) {
	count, err := s.IssueForPaidOrder(orderID)
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

// GetOrderAccess and GetTicketAccess back the no-login /order-access/*
// endpoints the /booking/<order_uuid>* frontend pages call. See the
// OrderAccessResponse/TicketAccessResponse doc comments in entity.go for
// why neither of these takes a userID.
func (s *TicketService) GetOrderAccess(orderID string) (*OrderAccessResponse, error) {
	return s.repo.GetOrderAccess(orderID)
}

func (s *TicketService) GetTicketAccess(orderID string, ticketID string) (*TicketAccessResponse, error) {
	return s.repo.GetTicketAccess(orderID, ticketID)
}

// RotateSecretForOrderTicket is the purchaser-authorized rotation path (M3/M4)
// exposed on the order-access routes — see repository.go's doc comment.
func (s *TicketService) RotateSecretForOrderTicket(orderID string, ticketID string) error {
	return s.repo.RotateSecretForOrderTicket(orderID, ticketID)
}

// RotateSecret is the unscoped primitive internal/organizer and
// internal/admin call through their own SecretRotator interfaces, AFTER
// each has independently verified the caller is allowed to touch this
// ticket. TicketService performs no authorization here — see
// PostgresRepository.RotateSecret.
func (s *TicketService) RotateSecret(ticketID string) (string, error) {
	return s.repo.RotateSecret(ticketID)
}

// RecordBookingAccess and CountDistinctBookingAccessDevices back M5 access
// telemetry — see the matching repository methods.
func (s *TicketService) RecordBookingAccess(orderID string, ticketID string, ipHash string, uaHash string) error {
	return s.repo.RecordBookingAccess(orderID, ticketID, ipHash, uaHash)
}

func (s *TicketService) CountDistinctBookingAccessDevices(orderID string) (int, error) {
	return s.repo.CountDistinctBookingAccessDevices(orderID)
}
