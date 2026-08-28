package payment

import (
	"context"

	"bytes"
	"crowdflow-backend/internal/booking"
	"crypto/sha512"
	"encoding/hex"
	"errors"
	"log"
	"strings"
	"testing"

	"github.com/midtrans/midtrans-go"
)

// captureLog redirects the standard logger for the duration of fn and
// returns everything it wrote.
func captureLog(fn func()) string {
	var buf bytes.Buffer
	orig := log.Writer()
	log.SetOutput(&buf)
	defer log.SetOutput(orig)
	fn()
	return buf.String()
}

func TestMidtransEnvName(t *testing.T) {
	if got := midtransEnvName(midtrans.Production); got != "production" {
		t.Errorf("midtransEnvName(Production) = %q, want %q", got, "production")
	}
	if got := midtransEnvName(midtrans.Sandbox); got != "sandbox" {
		t.Errorf("midtransEnvName(Sandbox) = %q, want %q", got, "sandbox")
	}
}

// TestMidtransEnvironment_Override covers the MIDTRANS_ENV escape hatch,
// which short-circuits before ever consulting internal/config. These cases
// are safe to run in any order because they never touch config's
// process-wide sync.Once-cached AppEnv() (see the fallthrough test below for
// why that matters).
func TestMidtransEnvironment_Override(t *testing.T) {
	cases := []struct {
		name        string
		midtransEnv string
		want        midtrans.EnvironmentType
	}{
		{"production lowercase", "production", midtrans.Production},
		{"sandbox lowercase", "sandbox", midtrans.Sandbox},
		{"PRODUCTION uppercase", "PRODUCTION", midtrans.Production},
		{"sandbox with whitespace", "  sandbox  ", midtrans.Sandbox},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Setenv("MIDTRANS_ENV", c.midtransEnv)
			if got := midtransEnvironment(); got != c.want {
				t.Errorf("midtransEnvironment() = %v, want %v", got, c.want)
			}
		})
	}
}

// TestMidtransEnvironment_FallsThroughToAppEnv exercises the one case that
// actually reaches internal/config: MIDTRANS_ENV unset (or unrecognised).
//
// internal/config.AppEnv() resolves itself exactly once per process via
// sync.Once, and that state is unexported — unlike env_test.go in
// internal/config, which can reset resolveOnce/appEnv directly because it
// lives in the same package, this test cannot. So this function only
// verifies ONE concrete APP_ENV value (set here, before anything else in
// this test binary has a chance to call into config) rather than a full
// matrix. TestMidtransEnvironment_Override above deliberately avoids
// touching config at all so it can run in any order relative to this test.
func TestMidtransEnvironment_FallsThroughToAppEnv(t *testing.T) {
	t.Setenv("MIDTRANS_ENV", "")
	t.Setenv("APP_ENV", "sandbox")

	got := midtransEnvironment()
	if got != midtrans.Sandbox {
		t.Errorf("midtransEnvironment() with APP_ENV=sandbox = %v, want Sandbox", got)
	}
}

func TestCheckServerKeyAgainstEnvironment(t *testing.T) {
	cases := []struct {
		name       string
		serverKey  string
		env        midtrans.EnvironmentType
		wantLogHas string
		wantNoErr  bool // true when no [ERROR]/[WARN] line is expected at all
	}{
		{
			name:       "empty key warns",
			serverKey:  "",
			env:        midtrans.Sandbox,
			wantLogHas: "[WARN] payment: MIDTRANS_SERVER_KEY is empty",
		},
		{
			name:      "sandbox key against sandbox env is fine",
			serverKey: "SB-Mid-server-abc123",
			env:       midtrans.Sandbox,
			wantNoErr: true,
		},
		{
			name:      "prefix-less key against production env is fine",
			serverKey: "Mid-server-abc123",
			env:       midtrans.Production,
			wantNoErr: true,
		},
		{
			// Regression test for a FALSE ALARM this check used to raise.
			// A missing SB- prefix is NOT evidence of a production credential:
			// a verified-working sandbox server key on this project begins
			// "Mid-server-" with no prefix and authenticates fine against
			// api.sandbox.midtrans.com (confirmed 2026-08-28 by a live call
			// returning 404 "Transaction doesn't exist" rather than 401).
			// Warning here fired on every startup of a correctly configured
			// local dev environment.
			name:      "prefix-less key against sandbox env is NOT an error",
			serverKey: "Mid-server-abc123",
			env:       midtrans.Sandbox,
			wantNoErr: true,
		},
		{
			// The one reliable direction: SB- can only ever mean sandbox.
			name:       "sandbox key against production env errors",
			serverKey:  "SB-Mid-server-abc123",
			env:        midtrans.Production,
			wantLogHas: "[ERROR] payment: MIDTRANS_SERVER_KEY is a sandbox key (SB- prefix) but the Midtrans environment is production",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			output := captureLog(func() {
				checkServerKeyAgainstEnvironment(c.serverKey, c.env)
			})

			// Never leak the key itself into the log, in any case.
			if c.serverKey != "" && strings.Contains(output, c.serverKey) {
				t.Errorf("log output leaked the server key: %q", output)
			}

			if c.wantNoErr {
				if strings.Contains(output, "[ERROR]") || strings.Contains(output, "[WARN]") {
					t.Errorf("expected no warning/error log, got %q", output)
				}
				return
			}

			if !strings.Contains(output, c.wantLogHas) {
				t.Errorf("log output = %q, want it to contain %q", output, c.wantLogHas)
			}
		})
	}
}

// TestVerifyMidtransSignature covers the only thing standing between the
// public, CSRF-exempt webhook and anyone who can reach it.
func TestVerifyMidtransSignature(t *testing.T) {
	const serverKey = "SB-Mid-server-testkey"
	const orderID = "0f2a1b3c-4d5e-6f70-8192-a3b4c5d6e7f8"
	const statusCode = "200"
	const grossAmount = "100000.00"

	valid := func() string {
		sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + serverKey))
		return hex.EncodeToString(sum[:])
	}()

	base := func() map[string]interface{} {
		return map[string]interface{}{
			"order_id":      orderID,
			"status_code":   statusCode,
			"gross_amount":  grossAmount,
			"signature_key": valid,
		}
	}

	t.Run("valid signature passes", func(t *testing.T) {
		s := &PaymentService{serverKey: serverKey}
		if err := s.verifyMidtransSignature(base()); err != nil {
			t.Fatalf("valid signature rejected: %v", err)
		}
	})

	t.Run("forged body with no signature is rejected", func(t *testing.T) {
		s := &PaymentService{serverKey: serverKey}
		// The exact attack: mark an order paid by asking nicely.
		p := map[string]interface{}{
			"order_id":           orderID,
			"transaction_status": "settlement",
		}
		if err := s.verifyMidtransSignature(p); !errors.Is(err, ErrInvalidSignature) {
			t.Fatalf("forged body accepted, got err=%v", err)
		}
	})

	t.Run("tampered gross_amount is rejected", func(t *testing.T) {
		s := &PaymentService{serverKey: serverKey}
		p := base()
		p["gross_amount"] = "1.00"
		if err := s.verifyMidtransSignature(p); !errors.Is(err, ErrInvalidSignature) {
			t.Fatalf("tampered amount accepted, got err=%v", err)
		}
	})

	t.Run("signature from a different server key is rejected", func(t *testing.T) {
		s := &PaymentService{serverKey: "SB-Mid-server-otherkey"}
		if err := s.verifyMidtransSignature(base()); !errors.Is(err, ErrInvalidSignature) {
			t.Fatalf("signature from another key accepted, got err=%v", err)
		}
	})

	t.Run("gross_amount is not normalised", func(t *testing.T) {
		// "100000" and "100000.00" are the same number and a DIFFERENT digest.
		// This pins the raw-string requirement: anyone who "tidies up" the
		// concatenation by parsing the amount breaks every real notification.
		s := &PaymentService{serverKey: serverKey}
		p := base()
		p["gross_amount"] = "100000"
		if err := s.verifyMidtransSignature(p); !errors.Is(err, ErrInvalidSignature) {
			t.Fatalf("re-formatted amount accepted, got err=%v", err)
		}
	})

	t.Run("empty server key skips verification but warns loudly", func(t *testing.T) {
		s := &PaymentService{serverKey: ""}
		out := captureLog(func() {
			if err := s.verifyMidtransSignature(base()); err != nil {
				t.Fatalf("expected skip, got %v", err)
			}
		})
		if !strings.Contains(out, "DISABLED") {
			t.Errorf("skipping verification must warn loudly, got %q", out)
		}
	})

	t.Run("never logs the expected digest or the server key", func(t *testing.T) {
		s := &PaymentService{serverKey: serverKey}
		p := base()
		p["signature_key"] = "deadbeef"
		out := captureLog(func() { _ = s.verifyMidtransSignature(p) })
		if strings.Contains(out, valid) {
			t.Errorf("log leaked the expected digest: %q", out)
		}
		if strings.Contains(out, serverKey) {
			t.Errorf("log leaked the server key: %q", out)
		}
	})
}

// stubHolds is a HoldReader returning a fixed hold.
type stubHolds struct {
	detail *booking.HoldDetail
	err    error
}

func (s stubHolds) GetHold(string) (*booking.HoldDetail, error) { return s.detail, s.err }

// TestOrderLinesFromHold_PricingIgnoresClient pins the fix for the
// price-tampering hole: the order total and its breakdown are a function of
// the hold alone. The request body cannot reach this computation at all — the
// signature takes no request, which is the point.
func TestOrderLinesFromHold_PricingIgnoresClient(t *testing.T) {
	hold := &booking.HoldDetail{
		HoldToken: "tok",
		EventID:   42,
		Items: []booking.HoldItem{
			{TicketTierID: 7, TierName: "VIP", UnitPrice: 500000, Quantity: 2},
			{TicketTierID: 9, TierName: "Reguler", UnitPrice: 150000, Quantity: 1},
		},
	}

	total, items := orderLinesFromHold(hold)

	const want = 500000*2 + 150000
	if total != want {
		t.Errorf("total = %v, want %v", total, want)
	}
	if len(items) != 2 {
		t.Fatalf("order_items = %d rows, want 2", len(items))
	}
	if items[0].TicketTierID != 7 || items[0].UnitPrice != 500000 || items[0].Quantity != 2 || items[0].Subtotal != 1000000 {
		t.Errorf("items[0] = %+v, want tier 7 @500000 x2 = 1000000", items[0])
	}
	if items[1].TicketTierID != 9 || items[1].Subtotal != 150000 {
		t.Errorf("items[1] = %+v, want tier 9 subtotal 150000", items[1])
	}
}

func TestCreateMidtransTransaction_RequiresHold(t *testing.T) {
	s := &PaymentService{repo: &capturingRepo{}, holds: stubHolds{detail: nil}}

	t.Run("missing token", func(t *testing.T) {
		_, err := s.CreateMidtransTransaction(context.Background(), 1,
			&CreateOrderRequest{EventID: 1, CartItems: []CartItem{{UnitFaceValue: 1, Quantity: 1}}})
		if !errors.Is(err, ErrHoldRequired) {
			t.Fatalf("order without a hold token accepted, got %v", err)
		}
	})

	t.Run("expired or unknown hold", func(t *testing.T) {
		s := &PaymentService{repo: &capturingRepo{}, holds: stubHolds{err: errors.New("hold not found or already expired")}}
		_, err := s.CreateMidtransTransaction(context.Background(), 1,
			&CreateOrderRequest{EventID: 1, HoldToken: "gone"})
		if !errors.Is(err, ErrHoldRequired) {
			t.Fatalf("expired hold accepted, got %v", err)
		}
	})
}

// capturingRepo records what the service tried to persist.
type capturingRepo struct {
	order *Order
	items []OrderItem
}

func (r *capturingRepo) CreateOrder(_ context.Context, o *Order) error {
	o.ID = "00000000-0000-0000-0000-000000000001"
	r.order = o
	return nil
}
func (r *capturingRepo) CreateOrderItems(_ context.Context, _ string, items []OrderItem) error {
	r.items = items
	return nil
}
func (r *capturingRepo) UpdateOrderStatus(context.Context, string, string, string) error { return nil }
func (r *capturingRepo) GetOrderByID(context.Context, string) (*Order, error)            { return nil, nil }
func (r *capturingRepo) GetOrderDetailsForMail(context.Context, string) (*OrderMailDetails, error) {
	return nil, nil
}
func (r *capturingRepo) GetUserForPayment(context.Context, int) (string, string, error) {
	return "b@example.com", "Buyer", nil
}
