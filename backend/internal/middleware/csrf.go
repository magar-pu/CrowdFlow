package middleware

import (
	"net/http"

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

		// Bypass validation for authentication bootstrap endpoints
		path := r.URL.Path
		if path == "/api/auth/login" || path == "/api/auth/register" || path == "/api/auth/google" {
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
