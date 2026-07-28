package payment

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"crowdflow-backend/internal/mail"

	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/snap"
)

type PaymentService struct {
	repo        Repository
	snapClient  snap.Client
	mailService mail.Service
}

func NewPaymentService(repo Repository, mailService mail.Service) *PaymentService {
	serverKey := os.Getenv("MIDTRANS_SERVER_KEY")
	var s snap.Client
	s.New(serverKey, midtrans.Sandbox)

	return &PaymentService{
		repo:        repo,
		snapClient:  s,
		mailService: mailService,
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

	// 2. Fetch purchaser info for Midtrans CustomerDetail (required for Virtual Account generation)
	userEmail, userName, _ := s.repo.GetUserForPayment(ctx, userID)
	if userEmail == "" {
		userEmail = "buyer@crowdflow.com"
	}
	if userName == "" {
		userName = "Ticket Buyer"
	}

	// 3. Build item details for Midtrans
	items := make([]midtrans.ItemDetails, 0, len(req.CartItems))
	for _, item := range req.CartItems {
		items = append(items, midtrans.ItemDetails{
			ID:    item.TicketCategoryID,
			Name:  item.TicketCategoryName,
			Price: int64(item.UnitFaceValue),
			Qty:   int32(item.Quantity),
		})
	}

	// 4. Request snap token from midtrans
	snapReq := &snap.Request{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:  order.ID,
			GrossAmt: int64(order.GrossAmount),
		},
		CustomerDetail: &midtrans.CustomerDetails{
			FName: userName,
			Email: userEmail,
		},
		Items: &items,
		CreditCard: &snap.CreditCardDetails{
			Secure: true,
		},
	}

	enabledPayments := mapSnapPaymentTypes(req.PaymentMethod)
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

func mapSnapPaymentTypes(pm string) []snap.SnapPaymentType {
	switch pm {
	case "bca_va":
		return []snap.SnapPaymentType{snap.PaymentTypeBCAVA}
	case "bni_va":
		return []snap.SnapPaymentType{snap.PaymentTypeBNIVA}
	case "mandiri_bill":
		return []snap.SnapPaymentType{snap.PaymentTypeEChannel}
	case "gopay":
		return []snap.SnapPaymentType{snap.PaymentTypeGopay}
	case "shopeepay":
		return []snap.SnapPaymentType{snap.PaymentTypeShopeepay}
	case "qris":
		return []snap.SnapPaymentType{snap.PaymentTypeGopay}
	case "credit_card":
		return []snap.SnapPaymentType{snap.PaymentTypeCreditCard}
	default:
		return nil
	}
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

	if err := s.repo.UpdateOrderStatus(ctx, orderID, status, transactionID); err != nil {
		return err
	}

	// Dispatch E-Ticket email asynchronously when payment status is "paid"
	if status == "paid" && s.mailService != nil {
		go func() {
			detailsCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()

			details, err := s.repo.GetOrderDetailsForMail(detailsCtx, orderID)
			if err != nil {
				log.Printf("[PAYMENT E-TICKET ERROR] Failed to fetch order details for %s: %v", orderID, err)
				return
			}

			// Generate high-resolution QR code URL for gate scanner verification
			qrCodeURL := fmt.Sprintf("https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=%s", orderID)

			if err := s.mailService.SendETicket(details.PurchaserEmail, details.EventTitle, details.DateVenue, qrCodeURL, details.TicketTier); err != nil {
				log.Printf("[PAYMENT E-TICKET ERROR] Failed to send E-Ticket for %s to %s: %v", orderID, details.PurchaserEmail, err)
			} else {
				log.Printf("[PAYMENT E-TICKET SUCCESS] E-Ticket dispatched for Order #%s to %s", orderID, details.PurchaserEmail)
			}
		}()
	}

	return nil
}
