package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"crowdflow-backend/internal/response"
	"github.com/redis/go-redis/v9"
)

// RateLimit throttles requests per client IP using a fixed-window counter in
// Redis (INCR + EXPIRE NX so the window is set only by the request that
// starts it). Intended for unauthenticated endpoints like login where there's
// no user ID yet to key on. Fails open on a Redis error so an infra outage
// doesn't take down login entirely.
func RateLimit(redisClient *redis.Client, keyPrefix string, limit int, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := "ratelimit:" + keyPrefix + ":" + ClientIP(r)

			ctx := r.Context()
			count, err := redisClient.Incr(ctx, key).Result()
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}
			if count == 1 {
				redisClient.Expire(ctx, key, window)
			}
			if count > int64(limit) {
				response.Error(w, http.StatusTooManyRequests, "RATE_LIMITED", "Too many attempts. Please try again later.")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RateLimitBy is RateLimit's counterpart for endpoints where the abuse target
// isn't the caller's IP but a value inside the request body — a mail-bomb
// aimed at one address arrives from many different IPs, so an IP-keyed
// limiter never sees it as a pattern. keyFn extracts that value (e.g. the
// target email) from r; an empty return skips limiting entirely rather than
// grouping every unkeyable request under one bucket.
//
// The handler downstream still needs to read r.Body itself, so this reads it
// once up front, restores it before calling keyFn (which typically decodes
// JSON from it too), and restores it again afterwards so the wrapped handler
// sees an untouched, fully-readable body exactly as if this middleware
// weren't here.
func RateLimitBy(redisClient *redis.Client, keyPrefix string, limit int, window time.Duration, keyFn func(r *http.Request) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var bodyBytes []byte
			if r.Body != nil {
				var err error
				bodyBytes, err = io.ReadAll(r.Body)
				if err != nil {
					// Can't buffer the body to inspect it or restore it for the
					// real handler; fail open on limiting and let the handler's
					// own body-read fail (and report) the actual error.
					r.Body = io.NopCloser(bytes.NewReader(bodyBytes))
					next.ServeHTTP(w, r)
					return
				}
			}
			r.Body = io.NopCloser(bytes.NewReader(bodyBytes))

			keyValue := keyFn(r)

			// Restore again: keyFn (typically a JSON decode) drained the reader
			// above, and the wrapped handler still needs a fresh one.
			r.Body = io.NopCloser(bytes.NewReader(bodyBytes))

			if keyValue == "" {
				next.ServeHTTP(w, r)
				return
			}

			key := "ratelimit:" + keyPrefix + ":" + strings.ToLower(strings.TrimSpace(keyValue))

			ctx := r.Context()
			count, err := redisClient.Incr(ctx, key).Result()
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}
			if count == 1 {
				redisClient.Expire(ctx, key, window)
			}
			if count > int64(limit) {
				response.Error(w, http.StatusTooManyRequests, "RATE_LIMITED", "Too many attempts. Please try again later.")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// EmailBodyKey is a RateLimitBy keyFn that reads a top-level "email" field
// out of a JSON request body. Used to key send-otp/forgot-password limits on
// the target address rather than the caller's IP.
func EmailBodyKey(r *http.Request) string {
	var body struct {
		Email string `json:"email"`
	}
	if r.Body == nil {
		return ""
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(body.Email))
}

// ClientIP resolves the request's real originating address. nginx (the only
// public entry point - see docker-compose.yml, the backend container itself
// only binds 127.0.0.1) sets X-Forwarded-For to
// "$proxy_add_x_forwarded_for", which appends the connecting IP to whatever
// value the client sent, so the last entry is always the one nginx observed
// and is safe to trust; earlier entries may be attacker-supplied and are
// ignored.
//
// Exported so internal/ticket's booking-access-log (M5) can hash the same
// trusted value RateLimit already keys on, rather than re-deriving its own
// (possibly drifted) notion of "the client's IP".
func ClientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		parts := strings.Split(fwd, ",")
		return strings.TrimSpace(parts[len(parts)-1])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
