package payment

// Live credential probe: asks Midtrans itself which gateway MIDTRANS_SERVER_KEY
// belongs to, instead of guessing from the key's shape.
//
// This exists because the "SB- prefix means sandbox" heuristic is only reliable
// in one direction. A key WITHOUT the prefix can still be a sandbox key — this
// project's own working sandbox credentials are `Mid-server-…` with no prefix —
// so reading the format produced a confident wrong answer more than once. The
// issuing service is the only authority worth asking.
//
// OPT-IN ONLY. With no flag and no env var these tests skip, so `go test ./...`
// never opens a network connection and never touches a credential.
//
//	go test ./internal/payment -midtrans-env=sandbox
//	go test ./internal/payment -midtrans-env=production
//	go test ./internal/payment -midtrans-env=both        # probe both, report
//
// If your shell or tooling swallows the flag, these are equivalent:
//
//	go test ./internal/payment -args -midtrans-env=sandbox
//	MIDTRANS_PROBE_ENV=sandbox go test ./internal/payment
//
// Add -v to see the per-gateway verdict lines.
//
// Security properties, deliberate:
//   - HTTPS only, with an explicit TLS 1.2 floor and full certificate
//     verification. InsecureSkipVerify is never set, and a non-https URL or an
//     unrecognised host aborts the probe before any credential is assembled.
//   - The key is sent as HTTP Basic over TLS (Midtrans's own scheme), with the
//     header built in-process. It never appears in a command line, so it cannot
//     leak through the process table the way `curl -u "$KEY:"` does.
//   - The key is never logged, never included in failure output, and never
//     written to a file. Everything reportable is redacted through redactKey.
//   - Redirects are refused: a redirect would replay the Authorization header
//     to a host outside the allowlist.
//   - Bounded timeout so a hung probe cannot stall a test run.

import (
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"
)

var midtransEnvFlag = flag.String("midtrans-env", "",
	"probe MIDTRANS_SERVER_KEY against a live Midtrans gateway: sandbox | production | both. Opt-in; makes a real network call.")

// The only hosts a probe may ever contact. An allowlist rather than a
// constructed string so that no amount of flag or env manipulation can point a
// credential at an attacker-controlled host.
var midtransProbeHosts = map[string]string{
	"sandbox":    "https://api.sandbox.midtrans.com",
	"production": "https://api.midtrans.com",
}

const probeTimeout = 15 * time.Second

// redactKey renders a key for human output without disclosing it. It reveals
// only the structural prefix — which is exactly the thing that turned out NOT
// to be authoritative, so it is shown for context and never for a verdict.
func redactKey(key string) string {
	switch {
	case key == "":
		return "<empty>"
	case strings.HasPrefix(key, "SB-Mid-server-"):
		return "SB-Mid-server-<redacted>"
	case strings.HasPrefix(key, "Mid-server-"):
		return "Mid-server-<redacted>"
	default:
		return fmt.Sprintf("<redacted, %d chars>", len(key))
	}
}

// probeResult is one gateway's answer about one key.
type probeResult struct {
	env        string
	httpStatus int
	statusCode string // Midtrans's own status_code, which is what actually matters
	message    string
	valid      bool // the key authenticated against this gateway
}

func (r probeResult) String() string {
	verdict := "NOT valid"
	if r.valid {
		verdict = "VALID"
	}
	return fmt.Sprintf("%-10s → HTTP %d, status_code=%s — key is %s for this gateway (%s)",
		r.env, r.httpStatus, r.statusCode, verdict, r.message)
}

// probeMidtransKey asks one gateway whether it accepts the key.
//
// It requests the status of an order id that cannot exist, because the
// DISTINCTION between the two failure modes is the whole signal:
//
//	status_code 404 "Transaction doesn't exist." → authenticated, then the
//	                                               lookup failed. Key is valid
//	                                               for this gateway.
//	status_code 401 "Access denied…"             → authentication itself failed.
//	                                               Key is not valid here.
//
// Sandbox and production are separate credential stores, so exactly one gateway
// should return 404 for a given key.
func probeMidtransKey(serverKey, env string) (probeResult, error) {
	base, ok := midtransProbeHosts[env]
	if !ok {
		return probeResult{}, fmt.Errorf("unknown probe environment %q", env)
	}

	// Belt and braces: the allowlist above is the real guard, but re-verify the
	// scheme so a future edit cannot silently downgrade a credential-bearing
	// request to cleartext.
	parsed, err := url.Parse(base)
	if err != nil || parsed.Scheme != "https" {
		return probeResult{}, fmt.Errorf("refusing to send a credential to a non-https endpoint: %q", base)
	}

	// An order id that cannot collide with anything real.
	nonce := make([]byte, 12)
	if _, err := rand.Read(nonce); err != nil {
		return probeResult{}, fmt.Errorf("could not generate probe id: %w", err)
	}
	probeID := "cf-keyprobe-" + hex.EncodeToString(nonce)

	req, err := http.NewRequest(http.MethodGet, base+"/v2/"+probeID+"/status", nil)
	if err != nil {
		return probeResult{}, err
	}
	// Basic auth over TLS: server key as username, empty password. Built here
	// rather than passed on a command line, so it never reaches the process
	// table.
	req.SetBasicAuth(serverKey, "")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{
		Timeout: probeTimeout,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				MinVersion: tls.VersionTLS12,
				// InsecureSkipVerify is deliberately absent: certificate and
				// hostname verification stay on. Do not add it "just to get the
				// probe working" — a probe that trusts any certificate is
				// worse than no probe, because it will happily hand the key to
				// whatever answered.
			},
		},
		CheckRedirect: func(*http.Request, []*http.Request) error {
			// Go re-sends the Authorization header on same-host redirects and
			// strips it cross-host, but refusing outright removes the question.
			return errors.New("redirect refused: a probe must not replay credentials to another host")
		},
	}

	resp, err := client.Do(req)
	if err != nil {
		// url.Error stringifies to include the request URL but never the
		// Authorization header, so this is safe to surface.
		return probeResult{}, fmt.Errorf("probe request to %s failed: %w", env, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 8<<10))
	if err != nil {
		return probeResult{}, fmt.Errorf("reading %s probe response: %w", env, err)
	}

	// Midtrans returns its real verdict in the JSON status_code, not the HTTP
	// status — an auth failure still arrives as HTTP 401 sometimes and HTTP 200
	// with status_code 401 other times, so parse the payload.
	text := string(body)
	result := probeResult{env: env, httpStatus: resp.StatusCode, message: firstLine(text)}
	switch {
	case strings.Contains(text, `"status_code":"404"`):
		result.statusCode, result.valid = "404", true
	case strings.Contains(text, `"status_code":"401"`):
		result.statusCode, result.valid = "401", false
	case resp.StatusCode == http.StatusUnauthorized:
		result.statusCode, result.valid = "401", false
	default:
		result.statusCode = "?"
	}
	return result, nil
}

func firstLine(s string) string {
	s = strings.TrimSpace(s)
	if i := strings.IndexAny(s, "\r\n"); i >= 0 {
		s = s[:i]
	}
	if len(s) > 200 {
		s = s[:200] + "…"
	}
	return s
}

// selectedProbeEnv resolves the opt-in from the flag, then the env var.
func selectedProbeEnv() string {
	if v := strings.ToLower(strings.TrimSpace(*midtransEnvFlag)); v != "" {
		return v
	}
	return strings.ToLower(strings.TrimSpace(os.Getenv("MIDTRANS_PROBE_ENV")))
}

// TestMidtransServerKeyAgainstLiveGateway is the opt-in live probe.
func TestMidtransServerKeyAgainstLiveGateway(t *testing.T) {
	selected := selectedProbeEnv()
	if selected == "" {
		t.Skip("live Midtrans probe not requested — run with -midtrans-env=sandbox|production|both (or MIDTRANS_PROBE_ENV=...)")
	}

	var targets []string
	switch selected {
	case "sandbox", "production":
		targets = []string{selected}
	case "both", "all":
		targets = []string{"sandbox", "production"}
	default:
		t.Fatalf("unknown -midtrans-env=%q; want sandbox, production, or both", selected)
	}

	serverKey := strings.TrimSpace(os.Getenv("MIDTRANS_SERVER_KEY"))
	if serverKey == "" {
		t.Skip("MIDTRANS_SERVER_KEY is not set in this environment — nothing to probe. " +
			"Export it first, e.g. from backend/.env, then re-run.")
	}

	t.Logf("probing key %s against: %s", redactKey(serverKey), strings.Join(targets, ", "))

	results := make([]probeResult, 0, len(targets))
	for _, env := range targets {
		res, err := probeMidtransKey(serverKey, env)
		if err != nil {
			t.Fatalf("%s probe could not complete: %v", env, err)
		}
		t.Log(res.String())
		results = append(results, res)
	}

	anyValid := false
	for _, r := range results {
		if r.valid {
			anyValid = true
		}
	}

	if selected == "both" || selected == "all" {
		// Diagnostic mode: report which gateway owns the key. Fails only if
		// neither accepted it, which means the key is wrong (or revoked)
		// rather than merely pointed at the wrong environment.
		if !anyValid {
			t.Fatalf("key %s was rejected by BOTH gateways — it is invalid, revoked, or malformed", redactKey(serverKey))
		}
		for _, r := range results {
			if r.valid {
				t.Logf("VERDICT: this key belongs to the %s gateway. Set APP_ENV accordingly (sandbox → APP_ENV=sandbox or local).", r.env)
			}
		}
		return
	}

	// Assertion mode: the caller stated which gateway they believe the key is
	// for, so disagreement is a failure.
	r := results[0]
	if !r.valid {
		t.Fatalf("key %s is NOT valid for the %s gateway (status_code=%s).\n"+
			"Either the key is from the other dashboard, or APP_ENV names the wrong environment.\n"+
			"Run with -midtrans-env=both to see which gateway does accept it.\n"+
			"Reminder: the SB- prefix proves sandbox when present but proves NOTHING when absent.",
			redactKey(serverKey), r.env, r.statusCode)
	}
}

// TestMidtransProbeRefusesUnknownHost pins the allowlist. Runs always — it
// makes no network call.
func TestMidtransProbeRefusesUnknownHost(t *testing.T) {
	if _, err := probeMidtransKey("Mid-server-irrelevant", "evil"); err == nil {
		t.Fatal("probe accepted an environment outside the allowlist")
	}
	for env, base := range midtransProbeHosts {
		if !strings.HasPrefix(base, "https://") {
			t.Errorf("probe host for %q is not https: %q", env, base)
		}
	}
}

// TestRedactKeyNeverRevealsSecret pins the redaction helper: whatever it
// returns must never contain the tail of the key.
func TestRedactKeyNeverRevealsSecret(t *testing.T) {
	for _, key := range []string{
		"SB-Mid-server-abcdefghijklmnop",
		"Mid-server-abcdefghijklmnop",
		"totally-unexpected-format-xyz",
		"",
	} {
		out := redactKey(key)
		if key != "" && strings.Contains(out, key) {
			t.Errorf("redactKey(%q) leaked the key: %q", key, out)
		}
		if len(key) > 12 && strings.Contains(out, key[len(key)-8:]) {
			t.Errorf("redactKey leaked the key tail: %q", out)
		}
	}
}
