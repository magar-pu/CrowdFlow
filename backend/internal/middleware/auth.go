package middleware

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strconv"

	"crowdflow-backend/internal/response"
	"github.com/golang-jwt/jwt/v5"
)

type UserClaims struct {
	UserID string   `json:"sub"`
	Email  string   `json:"email"`
	Roles  []string `json:"roles"`
}

type contextKey string

const UserContextKey contextKey = "user"

func GetClaims(ctx context.Context) (*UserClaims, bool) {
	claims, ok := ctx.Value(UserContextKey).(*UserClaims)
	return claims, ok
}

type AuthMiddleware struct {
	jwtSecret []byte
	db        *sql.DB
}

func NewAuthMiddleware(jwtSecret string, db *sql.DB) *AuthMiddleware {
	return &AuthMiddleware{
		jwtSecret: []byte(jwtSecret),
		db:        db,
	}
}

// Authenticate verifies the access_token JWT and populates claims into request context
func (m *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("access_token")
		if err != nil {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Access token is missing")
			return
		}

		token, err := jwt.Parse(cookie.Value, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return m.jwtSecret, nil
		})

		if err != nil || !token.Valid {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Access token is invalid or expired")
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Access token claims are invalid")
			return
		}

		sub, _ := claims["sub"].(string)
		email, _ := claims["email"].(string)
		var roles []string

		if rolesVal, exists := claims["roles"]; exists {
			if rolesSlice, ok := rolesVal.([]interface{}); ok {
				for _, rVal := range rolesSlice {
					if rStr, ok := rVal.(string); ok {
						roles = append(roles, rStr)
					}
				}
			}
		}

		userClaims := &UserClaims{
			UserID: sub,
			Email:  email,
			Roles:  roles,
		}

		ctx := context.WithValue(r.Context(), UserContextKey, userClaims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// OptionalAuthenticate parses the access_token JWT and populates claims into request context if present, but does not reject the request if missing/invalid
func (m *AuthMiddleware) OptionalAuthenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("access_token")
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		token, err := jwt.Parse(cookie.Value, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return m.jwtSecret, nil
		})

		if err != nil || !token.Valid {
			next.ServeHTTP(w, r)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			next.ServeHTTP(w, r)
			return
		}

		sub, _ := claims["sub"].(string)
		email, _ := claims["email"].(string)
		var roles []string

		if rolesVal, exists := claims["roles"]; exists {
			if rolesSlice, ok := rolesVal.([]interface{}); ok {
				for _, rVal := range rolesSlice {
					if rStr, ok := rVal.(string); ok {
						roles = append(roles, rStr)
					}
				}
			}
		}

		userClaims := &UserClaims{
			UserID: sub,
			Email:  email,
			Roles:  roles,
		}

		ctx := context.WithValue(r.Context(), UserContextKey, userClaims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequirePlatformRole checks if the authenticated user has at least one of the required platform roles (or is Super Admin)
func (m *AuthMiddleware) RequirePlatformRole(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := GetClaims(r.Context())
			if !ok {
				response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User is not authenticated")
				return
			}

			// Super Admin automatically bypasses platform role checks
			for _, rName := range claims.Roles {
				if rName == "Super Admin" {
					next.ServeHTTP(w, r)
					return
				}
			}

			for _, allowed := range allowedRoles {
				for _, hasRole := range claims.Roles {
					if hasRole == allowed {
						next.ServeHTTP(w, r)
						return
					}
				}
			}

			response.Error(w, http.StatusForbidden, "FORBIDDEN", "You do not have permission to access this resource")
		})
	}
}

// RequireEventRole checks if the authenticated user has the specified event-specific role mapping in database (or is Super Admin)
func (m *AuthMiddleware) RequireEventRole(roleName string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := GetClaims(r.Context())
			if !ok {
				response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User is not authenticated")
				return
			}

			// Super Admin automatically bypasses all event-specific role checks
			for _, rName := range claims.Roles {
				if rName == "Super Admin" {
					next.ServeHTTP(w, r)
					return
				}
			}

			// Extract event ID from path parameter (e.g. /api/events/{id}/publish)
			eventIDStr := r.PathValue("id")
			if eventIDStr == "" {
				response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Event ID path parameter is missing")
				return
			}

			eventID, err := strconv.Atoi(eventIDStr)
			if err != nil {
				response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "Event ID must be an integer")
				return
			}

			userID, err := strconv.Atoi(claims.UserID)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in token claims")
				return
			}

			// Query database to check user event role mapping
			query := `
				SELECT EXISTS (
					SELECT 1
					FROM user_roles ur
					JOIN roles r ON ur.role_id = r.id
					WHERE ur.user_id = $1 AND ur.event_id = $2 AND r.role_name = $3
				)`

			var exists bool
			err = m.db.QueryRowContext(r.Context(), query, userID, eventID, roleName).Scan(&exists)
			if err != nil {
				response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to verify event authorization context")
				return
			}

			if !exists {
				response.Error(w, http.StatusForbidden, "FORBIDDEN", "You do not have authorization for this event resource")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
