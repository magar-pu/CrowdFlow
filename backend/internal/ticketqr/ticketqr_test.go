package ticketqr

import (
	"strconv"
	"testing"
)

const testSecret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP" // arbitrary valid base32

func codeAt(t *testing.T, ts int64) string {
	t.Helper()
	secret, err := base32Decode(testSecret)
	if err != nil {
		t.Fatalf("base32Decode: %v", err)
	}
	return hotp(secret, ts/StepSeconds)
}

func TestParse(t *testing.T) {
	cases := []struct {
		name string
		raw  string
		want Payload
		ok   bool
	}{
		{
			name: "well-formed",
			raw:  "CF1:2202d2a1-7fe1-3f60-8e06-249b0c3a9a96:492436:1772451840",
			want: Payload{TicketID: "2202d2a1-7fe1-3f60-8e06-249b0c3a9a96", TOTP: "492436", Timestamp: 1772451840},
			ok:   true,
		},
		{name: "unknown version", raw: "CF2:abc:123456:1772451840", ok: false},
		{name: "wrong arity - too few", raw: "CF1:abc:123456", ok: false},
		{name: "wrong arity - too many", raw: "CF1:abc:123456:1772451840:extra", ok: false},
		{name: "empty ticket id", raw: "CF1::123456:1772451840", ok: false},
		{name: "totp too short", raw: "CF1:abc:12345:1772451840", ok: false},
		{name: "totp too long", raw: "CF1:abc:1234567:1772451840", ok: false},
		{name: "totp non-numeric", raw: "CF1:abc:12345a:1772451840", ok: false},
		{name: "timestamp non-numeric", raw: "CF1:abc:123456:not-a-number", ok: false},
		{name: "empty string", raw: "", ok: false},
		{name: "totally unrelated string", raw: "hello world", ok: false},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, ok := Parse(c.raw)
			if ok != c.ok {
				t.Fatalf("Parse(%q) ok = %v, want %v", c.raw, ok, c.ok)
			}
			if ok && got != c.want {
				t.Fatalf("Parse(%q) = %+v, want %+v", c.raw, got, c.want)
			}
		})
	}
}

func TestVerify_Valid(t *testing.T) {
	now := int64(1_000_000_000)
	p := Payload{TicketID: "t1", TOTP: codeAt(t, now), Timestamp: now}

	if got := Verify(p, testSecret, now); got != Valid {
		t.Fatalf("Verify = %v, want Valid", got)
	}
}

func TestVerify_DriftedTimestampInsideTolerance(t *testing.T) {
	// Claimed timestamp is 15s ahead of server time — within the 60s
	// freshness bound, and (for a step boundary picked so the code doesn't
	// cross a 20s step) within skew. The code is computed for the CLAIMED
	// timestamp's step, exactly as a real client would.
	now := int64(1_000_000_000)
	claimed := now + 15
	p := Payload{TicketID: "t1", TOTP: codeAt(t, claimed), Timestamp: claimed}

	if got := Verify(p, testSecret, now); got != Valid {
		t.Fatalf("Verify = %v, want Valid (drift within freshness+skew)", got)
	}
}

func TestVerify_DriftedTimestampOutsideFreshness(t *testing.T) {
	// 90s ahead — outside the 60s freshness bound, even though a client
	// clock could plausibly drift this much. This is the anti-screenshot
	// bound and it is enforced independently of skew.
	now := int64(1_000_000_000)
	claimed := now + 90
	p := Payload{TicketID: "t1", TOTP: codeAt(t, claimed), Timestamp: claimed}

	if got := Verify(p, testSecret, now); got != Expired {
		t.Fatalf("Verify = %v, want Expired (outside freshness bound)", got)
	}
}

func TestVerify_ReplayedOldTimestamp(t *testing.T) {
	// A screenshot of a QR from 10 minutes ago: well outside freshness, even
	// though the TOTP itself was validly generated at the time.
	now := int64(1_000_000_000)
	claimed := now - 600
	p := Payload{TicketID: "t1", TOTP: codeAt(t, claimed), Timestamp: claimed}

	if got := Verify(p, testSecret, now); got != Expired {
		t.Fatalf("Verify = %v, want Expired (replayed/stale timestamp)", got)
	}
}

func TestVerify_WrongSecret(t *testing.T) {
	now := int64(1_000_000_000)
	p := Payload{TicketID: "t1", TOTP: codeAt(t, now), Timestamp: now}

	const wrongSecret = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
	if got := Verify(p, wrongSecret, now); got != Expired {
		t.Fatalf("Verify = %v, want Expired (wrong secret, no HOTP step matches)", got)
	}
}

func TestVerify_EmptySecretIsInvalidNeverFallback(t *testing.T) {
	now := int64(1_000_000_000)
	p := Payload{TicketID: "t1", TOTP: "123456", Timestamp: now}

	if got := Verify(p, "", now); got != Invalid {
		t.Fatalf("Verify with empty secret = %v, want Invalid — there must be no fallback secret", got)
	}
}

func TestVerify_SkewAbsorbsOneStepEitherSide(t *testing.T) {
	now := int64(1_000_000_000)
	// A code generated exactly one step earlier than "now" (40s old, so
	// still within the 60s freshness bound) must still validate: this is
	// the skew tolerance doing its job.
	claimed := now
	oneStepEarlier := now - StepSeconds
	secret, err := base32Decode(testSecret)
	if err != nil {
		t.Fatalf("base32Decode: %v", err)
	}
	p := Payload{TicketID: "t1", TOTP: hotp(secret, oneStepEarlier/StepSeconds), Timestamp: claimed}

	if got := Verify(p, testSecret, now); got != Valid {
		t.Fatalf("Verify = %v, want Valid (one step of skew must be absorbed)", got)
	}
}

func TestVerify_TwoStepsAwayFailsSkew(t *testing.T) {
	now := int64(1_000_000_000)
	claimed := now
	twoStepsEarlier := now - 2*StepSeconds
	secret, err := base32Decode(testSecret)
	if err != nil {
		t.Fatalf("base32Decode: %v", err)
	}
	p := Payload{TicketID: "t1", TOTP: hotp(secret, twoStepsEarlier/StepSeconds), Timestamp: claimed}

	if got := Verify(p, testSecret, now); got != Expired {
		t.Fatalf("Verify = %v, want Expired (two steps is outside the ±1 skew window)", got)
	}
}

func TestCheck_UnparseablePayloadIsInvalidRegardlessOfSecret(t *testing.T) {
	_, result := Check("not a real payload", testSecret, 1_000_000_000)
	if result != Invalid {
		t.Fatalf("Check = %v, want Invalid", result)
	}
}

func TestCheck_EndToEnd(t *testing.T) {
	now := int64(1_772_451_840)
	code := codeAt(t, now)
	raw := "CF1:2202d2a1-7fe1-3f60-8e06-249b0c3a9a96:" + code + ":" + strconv.FormatInt(now, 10)

	p, result := Check(raw, testSecret, now)
	if result != Valid {
		t.Fatalf("Check result = %v, want Valid", result)
	}
	if p.TicketID != "2202d2a1-7fe1-3f60-8e06-249b0c3a9a96" {
		t.Fatalf("TicketID = %q", p.TicketID)
	}
}
