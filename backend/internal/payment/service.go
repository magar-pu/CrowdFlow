package payment

import (
	"context"
	"crypto/sha512"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"crowdflow-backend/internal/booking"
	"crowdflow-backend/internal/config"
	"crowdflow-backend/internal/mail"

	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/snap"
)

type PaymentService struct {
	repo        Repository
	snapClient  snap.Client
	mailService mail.Service

	// holds is the authority on what an order contains and what it costs.
	// See CreateMidtransTransaction — prices are never taken from the request.
	holds HoldReader

	// serverKey is retained on the struct (rather than re-reading the env var
	// per call) for webhook signature verification (plan step 7). Not used
	// for anything yet — do not log it, and do not use it to decide the
	// Midtrans environment (see midtransEnvironment).
	serverKey string

	// midtransEnv is the environment the snapClient above was actually built
	// with, kept alongside it so error paths (e.g. CreateMidtransTransaction)
	// can name it in logs without re-deriving it from env vars a second time.
	midtransEnv midtrans.EnvironmentType
}

func NewPaymentService(repo Repository, mailService mail.Service, holds HoldReader) *PaymentService {
	serverKey := os.Getenv("MIDTRANS_SERVER_KEY")
	env := midtransEnvironment()
	checkServerKeyAgainstEnvironment(serverKey, env)

	var s snap.Client
	s.New(serverKey, env)

	return &PaymentService{
		repo:        repo,
		snapClient:  s,
		mailService: mailService,
		holds:       holds,
		serverKey:   serverKey,
		midtransEnv: env,
	}
}

// midtransEnvironment picks which Midtrans gateway this process talks to.
//
// APP_ENV (via internal/config) is the source of truth, not the server key's
// SB- prefix. This is deliberate: the rest of the process (cookies, JWT
// requirements) already derives its notion of "which deployment is this"
// from APP_ENV, and letting the key silently pick a *different* answer here
// would mean a mistyped or swapped key changes which gateway is used without
// anyone noticing — exactly the failure mode that left this backend pinned
// to sandbox against production keys for a month. Instead the key is only a
// cross-check (see checkServerKeyAgainstEnvironment): a mismatch is logged
// loudly rather than silently deciding anything.
//
// MIDTRANS_ENV is a separate, explicit escape hatch for pointing a single
// backend at a specific gateway without touching APP_ENV (e.g. a local
// developer wants to hit production Midtrans for a one-off check). It only
// applies when set to a recognised value; anything else is treated the same
// as unset (falls through to the APP_ENV rule) after a WARN, since a typo
// here should not silently win over APP_ENV either.
// It deliberately takes no server key: the key must not be able to influence
// this decision, and a parameter it ignored would be a standing invitation to
// "just use it here" and quietly reintroduce that coupling.
func midtransEnvironment() midtrans.EnvironmentType {
	override := strings.ToLower(strings.TrimSpace(os.Getenv("MIDTRANS_ENV")))
	switch override {
	case "production":
		return midtrans.Production
	case "sandbox":
		return midtrans.Sandbox
	case "":
		// Not set — fall through to the APP_ENV rule below.
	default:
		log.Printf("[WARN] payment: unrecognised MIDTRANS_ENV %q, falling back to APP_ENV", override)
	}

	if config.IsProduction() {
		return midtrans.Production
	}
	// Both "sandbox" and "local" use the Midtrans sandbox gateway. There is
	// no platform environment that means "fake deployment, real money".
	return midtrans.Sandbox
}

// midtransEnvName renders a midtrans.EnvironmentType for logging. The SDK's
// EnvironmentType is an int8 with no String() method, so a raw %v prints "0"
// or "1" and an operator reading logs after the fact has no way to tell
// which gateway was actually selected.
func midtransEnvName(env midtrans.EnvironmentType) string {
	if env == midtrans.Production {
		return "production"
	}
	return "sandbox"
}

// checkServerKeyAgainstEnvironment cross-checks MIDTRANS_SERVER_KEY against the
// environment midtransEnvironment already chose.
//
// The "SB-" prefix is a ONE-WAY signal, and getting this wrong caused a false
// alarm once already:
//
//	prefix present  → the credential is definitely a sandbox one.
//	prefix absent   → INCONCLUSIVE. Not every sandbox key carries it. A
//	                  verified-working sandbox server key on this project begins
//	                  "Mid-server-", with no prefix at all, and authenticates
//	                  fine against api.sandbox.midtrans.com.
//
// So only the first direction is worth reporting. Warning about a missing
// prefix would fire on a perfectly good key every startup, which is worse than
// staying quiet: an error line that is usually wrong teaches people to ignore
// error lines.
//
// The authoritative check is the gateway itself. A genuine key/environment
// mismatch returns 401 on the first transaction, and that error now names the
// environment it was sent to (see CreateMidtransTransaction). To settle a key's
// environment by hand, authenticate against one and read the status code —
// 404 "Transaction doesn't exist" means the key is valid for that gateway,
// 401 means it is not:
//
//	curl -u "$MIDTRANS_SERVER_KEY:" \
//	  https://api.sandbox.midtrans.com/v2/any-unknown-order-id/status
//
// This only logs; it deliberately does not log.Fatalf. A broken payment gateway
// should not take the whole API down — every other endpoint still needs to
// work.
//
// Never logs the key itself, or any prefix/suffix of it.
func checkServerKeyAgainstEnvironment(serverKey string, env midtrans.EnvironmentType) {
	if serverKey == "" {
		log.Printf("[WARN] payment: MIDTRANS_SERVER_KEY is empty — every transaction will fail with 401")
		return
	}

	// Only the reliable direction: an SB- key can never be a production
	// credential, so pairing one with the production gateway is a real
	// misconfiguration. The reverse tells us nothing.
	if strings.HasPrefix(serverKey, "SB-") && env == midtrans.Production {
		log.Printf("[ERROR] payment: MIDTRANS_SERVER_KEY is a sandbox key (SB- prefix) but the Midtrans environment is production — every transaction will 401")
	}
}

// ErrHoldRequired is returned when an order arrives without a usable hold. The
// hold is the only server-side record of what the buyer selected and what it
// costs, so an order without one cannot be priced.
var ErrHoldRequired = errors.New("a valid seat hold is required to create an order")

// orderLinesFromHold turns a resolved hold into the order total and its
// per-tier breakdown. Kept as a pure function of the hold — no request, no
// client input — so that "money comes only from the hold" is a property that
// can be tested directly rather than inferred from the surrounding flow.
func orderLinesFromHold(hold *booking.HoldDetail) (float64, []OrderItem) {
	var total float64
	items := make([]OrderItem, 0, len(hold.Items))
	for _, item := range hold.Items {
		subtotal := item.UnitPrice * float64(item.Quantity)
		total += subtotal
		items = append(items, OrderItem{
			TicketTierID: item.TicketTierID,
			Quantity:     item.Quantity,
			UnitPrice:    item.UnitPrice,
			Subtotal:     subtotal,
		})
	}
	return total, items
}

func (s *PaymentService) CreateMidtransTransaction(ctx context.Context, userID int, req *CreateOrderRequest) (*CreateOrderResponse, error) {
	// 1. Resolve what is actually being bought.
	//
	// Everything about money below comes from the hold, never from req. The
	// request body used to be summed straight into gross_amount — the client
	// named its own prices, so {"unit_face_value": 1} bought anything for Rp 1.
	// booking.GetHold resolves tiers, quantities and prices from ticket_tiers
	// against a 128-bit unguessable token, and already errors on an expired or
	// unknown hold, so expiry is handled here for free.
	if s.holds == nil {
		// Wiring error, not a user error: fail closed rather than silently
		// falling back to client-supplied prices.
		return nil, errors.New("payment service has no hold reader configured")
	}
	if strings.TrimSpace(req.HoldToken) == "" {
		return nil, ErrHoldRequired
	}

	hold, err := s.holds.GetHold(req.HoldToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrHoldRequired, err)
	}
	if hold == nil || len(hold.Items) == 0 {
		return nil, ErrHoldRequired
	}

	// The event comes from the hold too. req.EventID is client-supplied and
	// nothing else cross-checks it, so trusting it would let one event's hold
	// be booked against another event's order row.
	if req.EventID != 0 && req.EventID != hold.EventID {
		log.Printf("[PAYMENT] order event_id %d does not match hold event_id %d — using the hold", req.EventID, hold.EventID)
	}

	total, orderItems := orderLinesFromHold(hold)

	// Fees are still not computed here — platform fee, gateway fee and the PPN
	// on each are all zero, so net_amount equals gross_amount. That is
	// pre-existing and wrong (payout maths downstream depends on it), but it is
	// a separate piece of work from pricing integrity and is deliberately left
	// alone rather than half-changed here.
	order := &Order{
		PurchaserID:            userID,
		EventID:                hold.EventID,
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

	// Persist the per-tier breakdown. This is what lets ticket issuance emit the
	// right number of tickets against the right tier when payment settles,
	// instead of guessing the tier with a LIMIT 1 over ticket_tiers.
	if err := s.repo.CreateOrderItems(ctx, order.ID, orderItems); err != nil {
		return nil, fmt.Errorf("failed to record order items: %w", err)
	}

	// 2. Fetch purchaser info for Midtrans CustomerDetail (required for Virtual Account generation)
	userEmail, userName, _ := s.repo.GetUserForPayment(ctx, userID)
	if userEmail == "" {
		userEmail = "buyer@crowdflow.com"
	}
	if userName == "" {
		userName = "Ticket Buyer"
	}

	// 3. Build item details for Midtrans — from the hold, so what Snap shows the
	// buyer is the same thing the order was priced from.
	items := make([]midtrans.ItemDetails, 0, len(hold.Items))
	for _, item := range hold.Items {
		items = append(items, midtrans.ItemDetails{
			ID:    strconv.Itoa(item.TicketTierID),
			Name:  item.TierName,
			Price: int64(item.UnitPrice),
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
		// Status code and endpoint are logged because they are the two facts
		// that identify the cause, and neither survives into what the buyer
		// sees (handler.go collapses this into a generic "Failed to process
		// payment transaction" and stays that way). A 401 here means exactly
		// one thing: the server key does not belong to the gateway it was sent
		// to — compare APP_ENV against the endpoint named below. Never log the
		// key itself.
		log.Printf("[ERROR] payment: Midtrans CreateTransaction failed (status %d, env=%s, endpoint %s): %s",
			midtransErr.StatusCode, midtransEnvName(s.midtransEnv), s.midtransEnv.SnapURL(), midtransErr.GetMessage())

		// The environment is repeated in the returned error so a caller that
		// only ever sees the wrapped value still knows which gateway refused.
		return nil, fmt.Errorf("midtrans error (env=%s): %v", midtransEnvName(s.midtransEnv), midtransErr.GetMessage())
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

// ErrInvalidSignature is returned when a webhook body fails signature
// verification. The handler maps it to 403 rather than 500 so a forged or
// misconfigured caller is not retried indefinitely and is distinguishable in
// logs from a genuine processing failure.
var ErrInvalidSignature = errors.New("invalid midtrans signature")

// verifyMidtransSignature checks the signature_key Midtrans sends with every
// notification:
//
//	signature_key = SHA512(order_id + status_code + gross_amount + ServerKey)
//
// This is the ONLY thing standing between the public webhook and anyone who
// can reach it. POST /api/v1/payment/webhook has no auth by necessity (Midtrans
// has no credential to present) and is deliberately CSRF-exempt
// (middleware/csrf.go), so without this check a body as simple as
// {"order_id":"…","transaction_status":"settlement"} marks any order paid — and
// UpdateOrderStatus then issues a real ticket and emails it.
//
// The three payload fields are concatenated as the RAW STRINGS Midtrans sent.
// gross_amount arrives as "100000.00", not a number; parsing and re-formatting
// it (or trimming a trailing zero) changes the digest and the hash will never
// match. Do not "normalise" these values.
func (s *PaymentService) verifyMidtransSignature(payload map[string]interface{}) error {
	// No key configured at all — local development with no Midtrans set up.
	// Verification is impossible rather than merely failing, so it is skipped,
	// but it says so every single time: a silent skip here would be
	// indistinguishable from working verification.
	if s.serverKey == "" {
		log.Printf("[WARN] payment: MIDTRANS_SERVER_KEY is empty — webhook signature verification is DISABLED, any caller can mark orders paid")
		return nil
	}

	orderID, _ := payload["order_id"].(string)
	statusCode, _ := payload["status_code"].(string)
	grossAmount, _ := payload["gross_amount"].(string)
	received, _ := payload["signature_key"].(string)

	if received == "" {
		log.Printf("[PAYMENT WEBHOOK] rejected: missing signature_key for order %q", orderID)
		return ErrInvalidSignature
	}

	sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + s.serverKey))
	expected := hex.EncodeToString(sum[:])

	// Constant-time so a caller cannot narrow the digest byte by byte from
	// response timing.
	if subtle.ConstantTimeCompare([]byte(expected), []byte(received)) != 1 {
		// Deliberately does not say which field disagreed, and never logs the
		// expected digest — either would help an attacker converge on a valid
		// signature.
		log.Printf("[PAYMENT WEBHOOK] rejected: signature mismatch for order %q", orderID)
		return ErrInvalidSignature
	}

	return nil
}

func (s *PaymentService) HandleMidtransWebhook(ctx context.Context, payload map[string]interface{}) error {
	// Authenticity first: nothing below this line may act on the payload until
	// the body is proven to have come from Midtrans.
	if err := s.verifyMidtransSignature(payload); err != nil {
		return err
	}

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
