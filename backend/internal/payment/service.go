package payment

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/snap"
)

type PaymentService struct {
	repo       Repository
	snapClient snap.Client
}

func NewPaymentService(repo Repository) *PaymentService {
	serverKey := os.Getenv("MIDTRANS_SERVER_KEY")
	var s snap.Client
	s.New(serverKey, midtrans.Sandbox)

	return &PaymentService{
		repo:       repo,
		snapClient: s,
	}
}

func (s *PaymentService) CreateMidtransTransaction(ctx context.Context, userID int, req *CreateOrderRequest) (*CreateOrderResponse, error) {
	if len(req.CartItems) == 0 {
		return nil, errors.New("cart is empty")
	}

	var total float64
	for _, item := range req.CartItems {
		total += item.UnitFaceValue * float64(item.Quantity)
	}

	// For simplicity, we just set total as gross_amount.
	// In reality you calculate platform fees, taxes, etc.
	order := &Order{
		PurchaserID:            userID,
		EventID:                req.EventID,
		OrderType:              "primary", // default
		TicketFaceValueTotal:   total,
		PlatformFeeRate:        0,
		PlatformFee:            0,
		PlatformFeePPN:         0,
		GatewayFee:             0,
		GatewayFeePPN:          0,
		PPNRate:                11.0,
		EntertainmentTaxRate:   0,
		EntertainmentTaxAmount: 0,
		GrossAmount:            total,
		NetAmount:              total,
		PaymentProvider:        "midtrans",
		PaymentType:            "snap",
		Status:                 "pending",
		ExpiresAt:              time.Now().Add(24 * time.Hour),
	}

	if err := s.repo.CreateOrder(ctx, order); err != nil {
		return nil, fmt.Errorf("failed to create order: %w", err)
	}

	// 2. Map selected payment method to Midtrans enabled payments
	var enabledPayments []snap.SnapPaymentType
	switch req.PaymentMethod {
	case "virtual_account":
		enabledPayments = []snap.SnapPaymentType{"bca_va", "bni_va", "bri_va", "mandiri_bill", "permata_va", "other_va"}
	case "qris":
		enabledPayments = []snap.SnapPaymentType{"gopay", "qris", "shopeepay"}
	case "credit_card":
		enabledPayments = []snap.SnapPaymentType{"credit_card"}
	default:
		enabledPayments = nil
	}

	// 3. Request snap token from midtrans
	snapReq := &snap.Request{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:  order.ID,
			GrossAmt: int64(order.GrossAmount),
		},
		CreditCard: &snap.CreditCardDetails{
			Secure: true,
		},
	}
	if len(enabledPayments) > 0 {
		snapReq.EnabledPayments = enabledPayments
	}

	snapResp, midtransErr := s.snapClient.CreateTransaction(snapReq)
	if midtransErr != nil {
		return nil, fmt.Errorf("midtrans error: %v", midtransErr.GetMessage())
	}

	return &CreateOrderResponse{
		OrderID:   order.ID,
		SnapToken: snapResp.Token,
	}, nil
}

func (s *PaymentService) HandleMidtransWebhook(ctx context.Context, payload map[string]interface{}) error {
	// Midtrans webhook contains order_id, transaction_status, transaction_id
	orderID, ok := payload["order_id"].(string)
	if !ok {
		return errors.New("missing order_id")
	}
	
	transactionStatus, _ := payload["transaction_status"].(string)
	transactionID, _ := payload["transaction_id"].(string)
	fraudStatus, _ := payload["fraud_status"].(string)

	status := "pending"
	if transactionStatus == "capture" {
		if fraudStatus == "challenge" {
			status = "pending"
		} else if fraudStatus == "accept" {
			status = "paid"
		}
	} else if transactionStatus == "settlement" {
		status = "paid"
	} else if transactionStatus == "cancel" || transactionStatus == "deny" || transactionStatus == "expire" {
		status = "failed"
	}

	// In production, we should also verify the signature key here using coreapi

	return s.repo.UpdateOrderStatus(ctx, orderID, status, transactionID)
}
