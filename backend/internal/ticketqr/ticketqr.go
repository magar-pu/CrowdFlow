// Package ticketqr is the single canonical implementation of the frozen QR
// contract (CONTRACT.md section 1): the wire format, freshness bound, skew
// tolerance, and HOTP verification a scanned ticket QR must satisfy.
//
//	CF1:<ticket_uuid>:<totp>:<unix_ts>
//
// This package owns the rule and nothing else. It does not import
// database/sql or net/http, and it does not import internal/scanner,
// internal/organizer, internal/ticket or internal/payment — every caller
// that validates a ticket QR (the ticketman scanner, the organizer's manual
// check-in console) imports this package, not the other way round. That is
// deliberate: three separate implementations of this exact rule already
// existed in this codebase and had drifted (one generated secret_key as
// md5-hex where the others expected base32; each carried its own copy of a
// "deriveDefaultSecret" backdoor). One package, one set of tests, no drift.
//
// Callers own everything this package cannot know: looking up the ticket
// row, checking it belongs to the scanned event, checking staff tier
// grants, checking ticket_status, and writing the check-in record. This
// package answers exactly one question — "does this payload, checked
// against this ticket's secret_key, prove possession of a live secret right
// now" — and returns a Result the caller maps onto its own response shape.
package ticketqr

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/binary"
	"fmt"
	"strconv"
	"strings"
)

// Version is the only wire-format version this package understands. A
// payload naming any other version is Invalid — there is no legacy
// fallback parsing here; that belongs to whatever migration path a caller
// chooses for payloads that predate CF1, not to this package.
const Version = "CF1"

// StepSeconds is the TOTP rotation step, per the frozen contract: the
// client recomputes the code every 20 seconds.
const StepSeconds int64 = 20

// FreshnessSeconds bounds how far a payload's claimed timestamp may sit
// from the server's clock, in either direction. This is the anti-screenshot
// bound — it is checked BEFORE step skew is applied, and is independent of
// it: skew tolerance absorbs client clock drift, freshness bounds replay.
const FreshnessSeconds int64 = 60

// SkewSteps is how many adjacent 20-second steps either side of the exact
// step derived from the claimed timestamp are accepted, absorbing client
// clock drift without extending the freshness bound.
const SkewSteps int64 = 1

// Result is the outcome of validating a scanned payload against a ticket's
// secret_key.
type Result int

const (
	// Invalid: the payload could not be parsed (wrong arity, wrong version,
	// non-numeric timestamp, malformed TOTP), or secretBase32 was empty.
	// There is no fallback secret: an empty or missing secret_key is always
	// Invalid, never silently accepted or derived from the ticket id.
	Invalid Result = iota
	// Expired: the payload parsed and had a real secret to check against,
	// but failed the freshness bound, or no HOTP step in the skew window
	// matched — which covers a wrong code, a wrong secret, and a code that
	// is simply outside the accepted window. The frozen contract treats a
	// TOTP mismatch as Expired rather than Invalid; see CONTRACT.md step 5.
	Expired
	// Valid: the payload is well-formed, within the freshness bound, and
	// its TOTP matches a HOTP step computed from secretBase32 within the
	// skew window.
	Valid
)

func (r Result) String() string {
	switch r {
	case Invalid:
		return "INVALID"
	case Expired:
		return "EXPIRED"
	case Valid:
		return "VALID"
	default:
		return "UNKNOWN"
	}
}

// Payload is a parsed (but not yet verified) QR payload.
type Payload struct {
	TicketID  string
	TOTP      string
	Timestamp int64
}

// Parse splits and structurally validates raw against the CF1 wire format.
// It does not check freshness, skew, or the TOTP against any secret — call
// Verify with the result for that. ok is false for anything that isn't
// exactly `CF1:<non-empty>:<6 digits>:<integer>`.
func Parse(raw string) (p Payload, ok bool) {
	parts := strings.Split(raw, ":")
	if len(parts) != 4 {
		return Payload{}, false
	}
	if parts[0] != Version {
		return Payload{}, false
	}

	ticketID := parts[1]
	if ticketID == "" {
		return Payload{}, false
	}

	totp := parts[2]
	if len(totp) != 6 {
		return Payload{}, false
	}
	for _, c := range totp {
		if c < '0' || c > '9' {
			return Payload{}, false
		}
	}

	ts, err := strconv.ParseInt(parts[3], 10, 64)
	if err != nil {
		return Payload{}, false
	}

	return Payload{TicketID: ticketID, TOTP: totp, Timestamp: ts}, true
}

// Verify checks a parsed Payload against a ticket's base32 secret_key, as
// of now (a Unix timestamp — callers pass time.Now().Unix() in production;
// tests pass a fixed value). Order of checks matches CONTRACT.md exactly:
// freshness before skew, secret presence before HOTP computation.
func Verify(p Payload, secretBase32 string, now int64) Result {
	if secretBase32 == "" {
		return Invalid
	}

	claimedDelta := p.Timestamp - now
	if claimedDelta < 0 {
		claimedDelta = -claimedDelta
	}
	if claimedDelta > FreshnessSeconds {
		return Expired
	}

	secret, err := base32Decode(secretBase32)
	if err != nil || len(secret) == 0 {
		return Invalid
	}

	step := p.Timestamp / StepSeconds
	for i := -SkewSteps; i <= SkewSteps; i++ {
		if hotp(secret, step+i) == p.TOTP {
			return Valid
		}
	}
	return Expired
}

// Check is the one-call convenience most callers want: parse raw and, if it
// parses, verify it against secretBase32 at now. Returns the parsed payload
// alongside the result so a caller that needs the ticket id (to look up the
// secret in the first place) still has one round trip through this package
// rather than two — most callers will actually call Parse first to learn
// TicketID, look up the secret, then call Verify directly; Check exists for
// the tests and for a caller that already has the secret in hand.
func Check(raw string, secretBase32 string, now int64) (Payload, Result) {
	p, ok := Parse(raw)
	if !ok {
		return Payload{}, Invalid
	}
	return p, Verify(p, secretBase32, now)
}

// hotp computes the RFC 4226 HOTP value for secret at counter, truncated to
// 6 digits — HMAC-SHA1, dynamic truncation, mod 1_000_000, zero-padded.
// Identical construction to what every prior copy of this logic in this
// codebase used (organizer, scanner, and the frontend's SubtleCrypto
// version); the drift between implementations was in the secret encoding
// and the step interval, never this function.
func hotp(secret []byte, counter int64) string {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, uint64(counter))

	mac := hmac.New(sha1.New, secret)
	mac.Write(buf)
	hash := mac.Sum(nil)

	offset := hash[len(hash)-1] & 0x0f
	binaryCode := (int32(hash[offset]&0x7f) << 24) |
		(int32(hash[offset+1]&0xff) << 16) |
		(int32(hash[offset+2]&0xff) << 8) |
		(int32(hash[offset+3] & 0xff))

	return fmt.Sprintf("%06d", binaryCode%1000000)
}

// base32Decode decodes an RFC 4648 base32 string (no padding required,
// case-insensitive), skipping any character outside the alphabet rather
// than erroring on it — matching the encoder this codebase already uses
// (internal/ticket.generateBase32Secret and the frontend's base32ToBytes),
// so a secret_key produced by either decodes identically here.
func base32Decode(s string) ([]byte, error) {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
	s = strings.ToUpper(strings.TrimSpace(s))
	if s == "" {
		return nil, fmt.Errorf("ticketqr: empty secret")
	}

	var bits uint32
	var bitCount int
	var result []byte

	for i := 0; i < len(s); i++ {
		c := s[i]
		if c == '=' {
			break
		}
		idx := strings.IndexByte(alphabet, c)
		if idx < 0 {
			continue
		}
		bits = (bits << 5) | uint32(idx)
		bitCount += 5
		if bitCount >= 8 {
			bitCount -= 8
			result = append(result, byte(bits>>bitCount))
		}
	}
	return result, nil
}
