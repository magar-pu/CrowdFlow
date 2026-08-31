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
	"crowdflow-backend/internal/nik"

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

	// issuer mints tickets once an order is paid — the single implementation
	// shared with the buyer-triggered complete-payment path. See TicketIssuer.
	issuer TicketIssuer

	// serverKey is retained on the struct (rather than re-reading the env var
	// per call) for webhook signature verification (plan step 7). Not used
	// for anything yet — do not log it, and do not use it to decide the
	// Midtrans environment (see midtransEnvironment).
	serverKey string

	// midtransEnv is the environment the snapClient above was actually built
	// with, kept alongside it so error paths (e.g. CreateMidtransTransaction)
	// can name it in logs without re-deriving it from env vars a second time.
	midtransEnv midtrans.EnvironmentType

	// frontendURL is where e-ticket emails point (see the SendETicket
	// dispatch below) — resolved and validated once at boot in main.go
	// (required outside local dev, mirroring the JWT_SECRET check), passed
	// in here rather than re-read from the environment per webhook call.
	frontendURL string
}

func NewPaymentService(repo Repository, mailService mail.Service, holds HoldReader, issuer TicketIssuer, frontendURL string) *PaymentService {
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
		issuer:      issuer,
		serverKey:   serverKey,
		midtransEnv: env,
		frontendURL: strings.TrimSuffix(frontendURL, "/"),
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

// ErrInvalidAttendees is returned when the submitted attendee list does not
// exactly cover every seat/GA unit the hold contains, or an attendee's own
// fields fail validation. The wrapped message names what is wrong so the
// handler can surface it to the buyer instead of a generic 500.
var ErrInvalidAttendees = errors.New("invalid attendee details")

// resolveAttendees validates the checkout attendee submission against the
// hold and turns it into rows ready to write to order_attendees.
//
// The hold is the only source of truth for what tickets exist — seat ids
// and per-tier GA counts come from it, never from the request — so a
// submission is rejected unless it names exactly the seats/GA units the
// hold actually contains. This is also where the per-order cap
// (events.max_tickets_per_order) is respected without reintroducing a
// separate check: the cap was already enforced when the hold was created
// (see booking.CreateHold), and an attendee list must exactly match the
// hold, so it can never exceed it.
//
// Plaintext NIK exists only inside this function and the request body that
// fed it; every attendee returned already carries NIKEnc, never NIK.
func (s *PaymentService) resolveAttendees(ctx context.Context, hold *booking.HoldDetail, input []AttendeeInput) ([]Attendee, error) {
	if len(input) == 0 {
		return nil, fmt.Errorf("%w: at least one attendee is required", ErrInvalidAttendees)
	}

	expectedSeats := make(map[int]int) // seat_id -> ticket_tier_id
	expectedGA := make(map[int]int)    // ticket_tier_id -> remaining quantity
	var seatIDs []int
	for _, item := range hold.Items {
		if len(item.Seats) > 0 {
			for _, seat := range item.Seats {
				expectedSeats[seat.SeatID] = item.TicketTierID
				seatIDs = append(seatIDs, seat.SeatID)
			}
		} else {
			expectedGA[item.TicketTierID] += item.Quantity
		}
	}

	seatMatrixIDs, err := s.repo.ResolveSeatMatrixIDs(ctx, hold.EventID, seatIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve seat matrix rows: %w", err)
	}

	attendees := make([]Attendee, 0, len(input))
	for i, in := range input {
		fullName := strings.TrimSpace(in.FullName)
		email := strings.TrimSpace(in.Email)
		phone := strings.TrimSpace(in.Phone)

		if fullName == "" {
			return nil, fmt.Errorf("%w: attendee %d is missing a full name", ErrInvalidAttendees, i+1)
		}
		if email == "" || !strings.Contains(email, "@") {
			return nil, fmt.Errorf("%w: attendee %d has an invalid email", ErrInvalidAttendees, i+1)
		}
		if phone == "" {
			return nil, fmt.Errorf("%w: attendee %d is missing a phone number", ErrInvalidAttendees, i+1)
		}
		if !nik.Valid(in.NIK) {
			return nil, fmt.Errorf("%w: attendee %d's NIK must be exactly 16 digits", ErrInvalidAttendees, i+1)
		}
		dob, err := time.Parse("2006-01-02", in.DOB)
		if err != nil {
			return nil, fmt.Errorf("%w: attendee %d has an invalid date of birth", ErrInvalidAttendees, i+1)
		}

		var seatMatrixID *int
		var tierID int
		if in.SeatID != nil {
			expectedTier, ok := expectedSeats[*in.SeatID]
			if !ok {
				return nil, fmt.Errorf("%w: seat %d is not part of this hold", ErrInvalidAttendees, *in.SeatID)
			}
			if in.TicketTierID != 0 && in.TicketTierID != expectedTier {
				return nil, fmt.Errorf("%w: seat %d does not belong to tier %d", ErrInvalidAttendees, *in.SeatID, in.TicketTierID)
			}
			tierID = expectedTier

			matrixID, ok := seatMatrixIDs[*in.SeatID]
			if !ok {
				return nil, fmt.Errorf("%w: seat %d could not be resolved on this event", ErrInvalidAttendees, *in.SeatID)
			}
			seatMatrixID = &matrixID
			delete(expectedSeats, *in.SeatID)
		} else {
			remaining, ok := expectedGA[in.TicketTierID]
			if !ok || remaining <= 0 {
				return nil, fmt.Errorf("%w: too many attendees submitted for ticket tier %d", ErrInvalidAttendees, in.TicketTierID)
			}
			tierID = in.TicketTierID
			expectedGA[in.TicketTierID] = remaining - 1
		}

		nikEnc, err := nik.Encrypt(in.NIK)
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt attendee NIK: %w", err)
		}

		attendees = append(attendees, Attendee{
			SeatMatrixID: seatMatrixID,
			TicketTierID: tierID,
			FullName:     fullName,
			NIKEnc:       nikEnc,
			Email:        email,
			Phone:        phone,
			DOB:          dob,
		})
	}

	if len(expectedSeats) > 0 {
		return nil, fmt.Errorf("%w: %d held seat(s) have no attendee", ErrInvalidAttendees, len(expectedSeats))
	}
	for tierID, remaining := range expectedGA {
		if remaining > 0 {
			return nil, fmt.Errorf("%w: %d attendee(s) missing for ticket tier %d", ErrInvalidAttendees, remaining, tierID)
		}
	}

	return attendees, nil
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

	// Attendee identity is validated against the hold before anything is
	// written — a malformed submission must not leave a pending order behind
	// for the buyer to stumble back into later.
	attendees, err := s.resolveAttendees(ctx, hold, req.Attendees)
	if err != nil {
		return nil, err
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

	// Written in the same request as the order and its items — this is what
	// lets ticket issuance mint one ticket per attendee instead of one per
	// order regardless of quantity.
	if err := s.repo.CreateOrderAttendees(ctx, order.ID, attendees); err != nil {
		return nil, fmt.Errorf("failed to record order attendees: %w", err)
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

	// Issue tickets through the shared implementation — see TicketIssuer.
	// Previously this was a second, SQL-only INSERT living inside
	// UpdateOrderStatus; it is gone, and both callers that can mark an order
	// paid now go through the same Go code, complete with per-attendee
	// identity and a proper base32 secret_key.
	if status == "paid" {
		if s.issuer == nil {
			// Wiring error, not a payment error — fail loudly and let
			// Midtrans retry rather than silently confirming a payment that
			// issued no ticket.
			log.Printf("[PAYMENT TICKET ERROR] order %s marked paid but no TicketIssuer is configured", orderID)
			return fmt.Errorf("ticket issuance failed for order %s: payment service has no TicketIssuer configured", orderID)
		}
		if _, err := s.issuer.IssueForPaidOrder(orderID); err != nil {
			// A buyer who has paid and received no ticket is the worst
			// failure this system has, so it must at least reach the log.
			// Returning the error tells Midtrans the webhook failed and
			// invites a retry that re-runs the (idempotent) issuance.
			log.Printf("[PAYMENT TICKET ERROR] order %s marked paid but ticket issuance failed: %v", orderID, err)
			return fmt.Errorf("ticket issuance failed for order %s: %w", orderID, err)
		}
	}

	// Dispatch E-Ticket email(s) asynchronously when payment status is "paid".
	// Link only, per plan decision 24 — no QR image, no attachment; the QR is
	// generated client-side once the recipient opens their booking link. The
	// purchaser gets the order-level link (all their tickets); each attendee
	// whose email differs from the purchaser's gets their own ticket-level
	// link instead, so attendees on the same order never see each other's
	// details in an email they didn't buy the ticket themselves.
	if status == "paid" && s.mailService != nil {
		go func() {
			detailsCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()

			details, err := s.repo.GetOrderDetailsForMail(detailsCtx, orderID)
			if err != nil {
				log.Printf("[PAYMENT E-TICKET ERROR] Failed to fetch order details for %s: %v", orderID, err)
				return
			}

			base := s.frontendURL
			orderLink := fmt.Sprintf("%s/booking/%s", base, orderID)

			if err := s.mailService.SendETicket(details.PurchaserEmail, details.EventTitle, details.DateVenue, orderLink, details.TicketTier); err != nil {
				log.Printf("[PAYMENT E-TICKET ERROR] Failed to send E-Ticket for %s to %s: %v", orderID, details.PurchaserEmail, err)
			} else {
				log.Printf("[PAYMENT E-TICKET SUCCESS] E-Ticket dispatched for Order #%s to %s", orderID, details.PurchaserEmail)
			}

			sentTo := map[string]bool{strings.ToLower(details.PurchaserEmail): true}
			for _, t := range details.Tickets {
				email := strings.ToLower(t.AttendeeEmail)
				if email == "" || sentTo[email] {
					continue
				}
				sentTo[email] = true

				ticketLink := fmt.Sprintf("%s/booking/%s/t/%s", base, orderID, t.TicketID)
				if err := s.mailService.SendETicket(t.AttendeeEmail, details.EventTitle, details.DateVenue, ticketLink, details.TicketTier); err != nil {
					log.Printf("[PAYMENT E-TICKET ERROR] Failed to send attendee E-Ticket for order %s ticket %s to %s: %v", orderID, t.TicketID, t.AttendeeEmail, err)
				} else {
					log.Printf("[PAYMENT E-TICKET SUCCESS] Attendee E-Ticket dispatched for order %s ticket %s to %s", orderID, t.TicketID, t.AttendeeEmail)
				}
			}
		}()
	}

	return nil
}
