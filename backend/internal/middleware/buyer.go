package middleware

import (
	"net/http"
	"strconv"

	"crowdflow-backend/internal/response"
)

// BuyerRoleName is the single platform role permitted to purchase tickets.
// Every signup path (password + Google JIT provisioning) grants role_id = 5
// = "User" — see internal/auth/repository.go's Create.
const BuyerRoleName = "User"

// ErrCodeBuyerRoleRequired is the machine-readable code the frontend keys on
// to swap a purchase CTA for an explanation instead of leaving a dead button.
const ErrCodeBuyerRoleRequired = "BUYER_ROLE_REQUIRED"

// buyerRoleDeniedMessage is written verbatim into the 403 body and is meant
// to be rendered as-is by the client. It has to answer "why can't I click
// this?" without the user needing to know anything about roles.
const buyerRoleDeniedMessage = "This account can't buy tickets. Organizer, auditor and staff accounts are for managing events — sign in with a personal account to purchase."

// requireBuyerQuery asks the ONE question that matters: does this user
// currently hold the platform-level (event_id IS NULL) "User" role?
//
// Deliberately an allowlist, not a denylist of staff roles: a role added
// later (or a role row written by hand) cannot accidentally acquire the
// ability to purchase. Anything that is not an affirmative "User" is denied.
const requireBuyerQuery = `
	SELECT EXISTS (
		SELECT 1
		  FROM user_roles ur
		  JOIN roles r ON r.id = ur.role_id
		 WHERE ur.user_id = $1
		   AND ur.event_id IS NULL
		   AND r.role_name = $2
	)`

// RequireBuyer restricts an endpoint to accounts that hold the "User"
// platform role. It must be mounted AFTER Authenticate.
//
// Why this is not built on RequirePlatformRole: that helper short-circuits to
// allow on "Super Admin" before it looks at the allowed list at all, which
// would exempt one of the exact account classes this rule exists to block.
// There is no bypass here — no Super Admin exemption, and no environment
// escape hatch — by design.
//
// Why the role is read from the DATABASE and not from the JWT claims: the
// access token's roles array is frozen for the whole ACCESS_TOKEN_TTL (15
// minutes by default) while /auth/me reads the database, and the frontend
// only force-refreshes its token on a 401 — never on a 403. On claims alone
// this check would be wrong in both directions for up to a full token
// lifetime: a freshly-approved organizer would keep buying, and (worse) a
// user whose roles moved the other way would get a 403 that never
// self-heals, with no client-side path out of it. Purchases are rare next to
// reads and both call sites already touch Postgres, so one extra indexed
// EXISTS per purchase attempt is the cheap side of that trade. This mirrors
// RequireTicketman, which re-reads staff status per request for the same
// instant-revocation reason.
//
// Fails closed at every step: no claims, an unparseable user id, or a
// database error all deny.
func (m *AuthMiddleware) RequireBuyer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := GetClaims(r.Context())
		if !ok {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User is not authenticated")
			return
		}

		userID, err := strconv.Atoi(claims.UserID)
		if err != nil {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in token claims")
			return
		}

		var isBuyer bool
		if err := m.db.QueryRowContext(r.Context(), requireBuyerQuery, userID, BuyerRoleName).Scan(&isBuyer); err != nil {
			// Fail closed. A purchase that cannot be authorised must not
			// proceed; the alternative is letting a blocked account through
			// whenever the database hiccups.
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to verify purchase eligibility")
			return
		}

		if !isBuyer {
			response.Error(w, http.StatusForbidden, ErrCodeBuyerRoleRequired, buyerRoleDeniedMessage)
			return
		}

		next.ServeHTTP(w, r)
	})
}
