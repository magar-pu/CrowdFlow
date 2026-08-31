package middleware

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"crowdflow-backend/internal/response"
	"github.com/golang-jwt/jwt/v5"
)

// TicketmanClaims is deliberately thin: only identity (staff id, event id).
// Gate/tier grants and session status are re-read from the database on every
// request, never trusted from the JWT — see RequireTicketman.
type TicketmanClaims struct {
	StaffID string
	EventID int
}

type ticketmanContextKey string

const TicketmanContextKey ticketmanContextKey = "ticketman"

func GetTicketmanClaims(ctx context.Context) (*TicketmanClaims, bool) {
	claims, ok := ctx.Value(TicketmanContextKey).(*TicketmanClaims)
	return claims, ok
}

// TicketmanAuthMiddleware verifies ticketman session JWTs. It uses its own
// signing secret (TICKETMAN_JWT_SECRET), entirely separate from the platform
// JWT_SECRET: a ticketman token is signed with a key the platform's own
// Authenticate middleware does not hold, so it cannot be replayed against any
// user-facing route by construction — no audience check needed on either
// side to get that isolation.
type TicketmanAuthMiddleware struct {
	jwtSecret []byte
	db        *sql.DB
}

func NewTicketmanAuthMiddleware(jwtSecret string, db *sql.DB) *TicketmanAuthMiddleware {
	return &TicketmanAuthMiddleware{
		jwtSecret: []byte(jwtSecret),
		db:        db,
	}
}

// RequireTicketman verifies the ticketman_access_token JWT for identity, then
// re-checks status and valid_from/valid_until against the database on every
// single request. This is the instant-revocation guarantee: an organizer
// suspending or deleting a staff account, or a session simply running past
// its valid_until cutoff, takes effect on the very next request rather than
// waiting out the JWT's lifetime.
func (m *TicketmanAuthMiddleware) RequireTicketman(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("ticketman_access_token")
		if err != nil {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Ticketman session is missing")
			return
		}

		token, err := jwt.Parse(cookie.Value, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return m.jwtSecret, nil
		})
		if err != nil || !token.Valid {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Ticketman session is invalid or expired")
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Ticketman session claims are invalid")
			return
		}

		sub, _ := claims["sub"].(string)
		staffID, err := strconv.Atoi(sub)
		if err != nil {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid staff identifier in session")
			return
		}

		var eventID int
		var status string
		var validFrom, validUntil time.Time
		err = m.db.QueryRowContext(r.Context(), `
			SELECT event_id, status, valid_from, valid_until FROM event_staff WHERE id = $1
		`, staffID).Scan(&eventID, &status, &validFrom, &validUntil)
		if err != nil {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Ticketman account no longer exists")
			return
		}

		if status != "active" {
			response.Error(w, http.StatusForbidden, "FORBIDDEN", "Ticketman account is not active")
			return
		}

		now := time.Now()
		if now.Before(validFrom) || now.After(validUntil) {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Ticketman session has expired")
			return
		}

		ticketmanClaims := &TicketmanClaims{
			StaffID: sub,
			EventID: eventID,
		}

		ctx := context.WithValue(r.Context(), TicketmanContextKey, ticketmanClaims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
