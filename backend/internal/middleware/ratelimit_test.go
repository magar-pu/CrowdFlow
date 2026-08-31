package middleware

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func newRateLimitTestClient(t *testing.T) *redis.Client {
	t.Helper()
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	return client
}

// TestRateLimitBy_BodyIsRestoredForHandler is the trap this middleware exists
// to avoid: keyFn reads r.Body to pull the key out (typically via a JSON
// decode), which drains the reader. If RateLimitBy didn't put a fresh reader
// back, the wrapped handler would see an empty body on every request.
func TestRateLimitBy_BodyIsRestoredForHandler(t *testing.T) {
	client := newRateLimitTestClient(t)
	limiter := RateLimitBy(client, "test-restore", 100, time.Minute, EmailBodyKey)

	var handlerSawBody string
	handler := limiter(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("handler body read: %v", err)
		}
		handlerSawBody = string(b)
		w.WriteHeader(http.StatusOK)
	}))

	body := `{"email":"person@example.com"}`
	req := httptest.NewRequest(http.MethodPost, "/auth/send-otp", strings.NewReader(body))
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if handlerSawBody != body {
		t.Fatalf("handler saw body %q, want %q (RateLimitBy did not restore r.Body)", handlerSawBody, body)
	}
}

func TestRateLimitBy_KeysOnEmailNotIP(t *testing.T) {
	client := newRateLimitTestClient(t)
	limiter := RateLimitBy(client, "test-email-key", 2, time.Minute, EmailBodyKey)

	makeRequest := func(remoteAddr, email string) int {
		body := `{"email":"` + email + `"}`
		req := httptest.NewRequest(http.MethodPost, "/auth/send-otp", bytes.NewReader([]byte(body)))
		req.RemoteAddr = remoteAddr
		w := httptest.NewRecorder()
		handler := limiter(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))
		handler.ServeHTTP(w, req)
		return w.Code
	}

	// Two different IPs targeting the SAME email: a distributed mail-bomb.
	// An IP-keyed limiter would never see this as one pattern; the
	// email-keyed limiter must.
	if code := makeRequest("1.1.1.1:1111", "victim@example.com"); code != http.StatusOK {
		t.Fatalf("request 1: expected 200, got %d", code)
	}
	if code := makeRequest("2.2.2.2:2222", "victim@example.com"); code != http.StatusOK {
		t.Fatalf("request 2: expected 200, got %d", code)
	}
	if code := makeRequest("3.3.3.3:3333", "victim@example.com"); code != http.StatusTooManyRequests {
		t.Fatalf("request 3 (3rd distinct IP, same email, limit=2): expected 429, got %d", code)
	}

	// A different email from a brand-new IP is a separate bucket entirely.
	if code := makeRequest("4.4.4.4:4444", "someone-else@example.com"); code != http.StatusOK {
		t.Fatalf("different email should not be rate-limited by the victim's bucket, got %d", code)
	}
}

func TestRateLimitBy_EmptyKeySkipsLimiting(t *testing.T) {
	client := newRateLimitTestClient(t)
	limiter := RateLimitBy(client, "test-empty-key", 1, time.Minute, EmailBodyKey)

	handler := limiter(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// No email field at all -> EmailBodyKey returns "" -> never limited, so
	// this must never 429 no matter how many times it's called.
	for i := 0; i < 5; i++ {
		req := httptest.NewRequest(http.MethodPost, "/auth/send-otp", strings.NewReader(`{}`))
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("call %d: expected 200 with no key to rate-limit on, got %d", i, w.Code)
		}
	}
}
