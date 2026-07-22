package middleware

import (
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
			key := "ratelimit:" + keyPrefix + ":" + clientIP(r)

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

// clientIP resolves the request's real originating address. nginx (the only
// public entry point - see docker-compose.yml, the backend container itself
// only binds 127.0.0.1) sets X-Forwarded-For to
// "$proxy_add_x_forwarded_for", which appends the connecting IP to whatever
// value the client sent, so the last entry is always the one nginx observed
// and is safe to trust; earlier entries may be attacker-supplied and are
// ignored.
func clientIP(r *http.Request) string {
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
