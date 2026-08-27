package middleware

import (
	"net/http"
	"strings"

	"crowdflow-backend/internal/response"
)

// CSRF enforces double-submit cookie validation on state-changing requests
func CSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Bypass validation for safe HTTP methods (GET, HEAD, OPTIONS)
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		// Bypass validation for authentication bootstrap, forgot-password, send-otp, reset-password, logout, payment webhooks, tickets, resale, and scanner device endpoints
		path := r.URL.Path
		if path == "/api/v1/auth/login" || path == "/api/v1/auth/register" || path == "/api/v1/auth/google" ||
			path == "/api/v1/auth/logout" ||
			path == "/api/v1/auth/forgot-password" || path == "/api/v1/auth/send-otp" ||
			path == "/api/v1/auth/reset-password" ||
			path == "/api/v1/payment/webhook" || strings.HasPrefix(path, "/api/v1/payment/") ||
			strings.HasPrefix(path, "/api/scanner/") || strings.HasPrefix(path, "/api/v1/scanner/") ||
			strings.HasPrefix(path, "/api/v1/resale") || strings.HasPrefix(path, "/api/v1/tickets") ||
			strings.Contains(path, "/request-otp") || strings.Contains(path, "/verify-otp") {
			next.ServeHTTP(w, r)
			return
		}

		// 1. Retrieve the CSRF token value from the cookie
		cookie, err := r.Cookie("csrf_token")
		if err != nil || cookie.Value == "" {
			response.Error(w, http.StatusForbidden, "CSRF_TOKEN_MISSING", "CSRF token cookie is missing or empty")
			return
		}

		// 2. Retrieve the CSRF token value from the custom HTTP header
		headerToken := r.Header.Get("X-CSRF-Token")
		if headerToken == "" {
			response.Error(w, http.StatusForbidden, "CSRF_HEADER_MISSING", "X-CSRF-Token header is missing")
			return
		}

		// 3. Compare values (Double-Submit verification check)
		if cookie.Value != headerToken {
			response.Error(w, http.StatusForbidden, "CSRF_TOKEN_MISMATCH", "CSRF token verification failed")
			return
		}

		next.ServeHTTP(w, r)
	})
}
