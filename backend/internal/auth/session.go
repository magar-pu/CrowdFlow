package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// Refresh-token session store (Redis-backed).
//
// A refresh token is an opaque string "<familyID>.<secret>". The familyID
// identifies a single login session (its Redis key); the secret is the bearer
// proof. Only sha256(secret) is ever stored, so a Redis dump does not hand out
// live tokens. Each successful refresh ROTATES the secret (issues a new one and
// invalidates the old), and presenting an already-rotated secret is treated as
// theft: the whole family is revoked. Access-token validation stays stateless
// (see middleware.Authenticate); only refresh/logout touch this store.

const (
	familyIDBytes = 16 // 128-bit session id
	secretBytes   = 32 // 256-bit bearer secret
	tokenSep      = "."
)

var (
	// ErrInvalidRefreshToken means the token was malformed, or its session was
	// not found (expired or already revoked). Callers should clear cookies and
	// treat the user as logged out.
	ErrInvalidRefreshToken = errors.New("invalid or expired refresh token")

	// ErrRefreshTokenReuse means a valid familyID was presented with a stale
	// secret — a rotated token was replayed. The family has been revoked; this
	// is a signal worth logging/alerting on as possible token theft.
	ErrRefreshTokenReuse = errors.New("refresh token reuse detected")
)

// SessionStore issues, rotates, and revokes refresh-token sessions in Redis.
type SessionStore struct {
	redis *redis.Client
	ttl   time.Duration // absolute session lifetime (refresh-token TTL)
}

func NewSessionStore(client *redis.Client, ttl time.Duration) *SessionStore {
	return &SessionStore{redis: client, ttl: ttl}
}

// rotateScript atomically validates-and-rotates a session's secret so two
// concurrent refreshes can't both "win". Returns {status, user_id}:
//
//	 1 = rotated OK (secret_hash swapped to ARGV[2])
//	 0 = session not found (expired/revoked)
//	-1 = reuse detected (family DELeted)
//
// HSET on an existing key preserves the key's TTL, so the session keeps its
// original absolute expiry across rotations (no sliding renewal).
var rotateScript = redis.NewScript(`
local current = redis.call('HGET', KEYS[1], 'secret_hash')
if not current then
	return {0, ''}
end
local uid = redis.call('HGET', KEYS[1], 'user_id')
if current ~= ARGV[1] then
	redis.call('DEL', KEYS[1])
	return {-1, uid}
end
redis.call('HSET', KEYS[1], 'secret_hash', ARGV[2])
return {1, uid}
`)

// Create opens a new session for userID and returns its refresh token.
func (s *SessionStore) Create(ctx context.Context, userID int) (string, error) {
	familyID, err := randToken(familyIDBytes)
	if err != nil {
		return "", err
	}
	secret, err := randToken(secretBytes)
	if err != nil {
		return "", err
	}

	key := sessionKey(familyID)
	setKey := userSessionsKey(userID)

	pipe := s.redis.TxPipeline()
	pipe.HSet(ctx, key, map[string]interface{}{
		"user_id":     userID,
		"secret_hash": hashSecret(secret),
		"created_at":  time.Now().Unix(),
	})
	pipe.Expire(ctx, key, s.ttl)
	// Index the family under the user so RevokeAllForUser can find every
	// session (e.g. "log out all devices", ban, password change).
	pipe.SAdd(ctx, setKey, familyID)
	pipe.Expire(ctx, setKey, s.ttl)
	if _, err := pipe.Exec(ctx); err != nil {
		return "", err
	}

	return familyID + tokenSep + secret, nil
}

// ValidateAndRotate verifies rawToken and, on success, invalidates it and
// returns a fresh replacement token plus the owning user ID. On reuse it
// returns ErrRefreshTokenReuse (family already revoked); on any other failure,
// ErrInvalidRefreshToken.
//
// Concurrent refreshes of the same token are intentionally strict here: the
// first rotates, any in-flight second sees a stale secret and trips reuse
// detection. The frontend serializes refreshes through a single in-flight
// request (Step 5) so legitimate clients never double-refresh; a short grace
// window is a possible future hardening if that ever proves too aggressive.
func (s *SessionStore) ValidateAndRotate(ctx context.Context, rawToken string) (int, string, error) {
	familyID, secret, ok := splitToken(rawToken)
	if !ok {
		return 0, "", ErrInvalidRefreshToken
	}

	newSecret, err := randToken(secretBytes)
	if err != nil {
		return 0, "", err
	}

	res, err := rotateScript.Run(ctx, s.redis,
		[]string{sessionKey(familyID)},
		hashSecret(secret), hashSecret(newSecret),
	).Result()
	if err != nil {
		return 0, "", err
	}

	vals, ok := res.([]interface{})
	if !ok || len(vals) != 2 {
		return 0, "", ErrInvalidRefreshToken
	}
	status, _ := vals[0].(int64)

	switch status {
	case 1:
		return atoiUserID(vals[1]), familyID + tokenSep + newSecret, nil
	case -1:
		// Family already DELeted by the script; drop the now-dangling index entry.
		uid := atoiUserID(vals[1])
		s.redis.SRem(ctx, userSessionsKey(uid), familyID)
		return 0, "", ErrRefreshTokenReuse
	default:
		return 0, "", ErrInvalidRefreshToken
	}
}

// Revoke ends the single session identified by rawToken (logout). A missing or
// malformed token is a no-op — logout is idempotent.
func (s *SessionStore) Revoke(ctx context.Context, rawToken string) error {
	familyID, _, ok := splitToken(rawToken)
	if !ok {
		return nil
	}

	key := sessionKey(familyID)
	uid, err := s.redis.HGet(ctx, key, "user_id").Int()
	if errors.Is(err, redis.Nil) {
		return nil
	}
	if err != nil {
		return err
	}

	pipe := s.redis.TxPipeline()
	pipe.Del(ctx, key)
	pipe.SRem(ctx, userSessionsKey(uid), familyID)
	_, err = pipe.Exec(ctx)
	return err
}

// RevokeAllForUser ends every session for a user (log out all devices, ban,
// password change).
func (s *SessionStore) RevokeAllForUser(ctx context.Context, userID int) error {
	setKey := userSessionsKey(userID)
	families, err := s.redis.SMembers(ctx, setKey).Result()
	if err != nil {
		return err
	}

	pipe := s.redis.TxPipeline()
	for _, f := range families {
		pipe.Del(ctx, sessionKey(f))
	}
	pipe.Del(ctx, setKey)
	_, err = pipe.Exec(ctx)
	return err
}

func sessionKey(familyID string) string { return "session:" + familyID }

func userSessionsKey(userID int) string { return "user_sessions:" + strconv.Itoa(userID) }

// randToken returns n cryptographically random bytes as a URL-safe string.
func randToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func hashSecret(secret string) string {
	sum := sha256.Sum256([]byte(secret))
	return hex.EncodeToString(sum[:])
}

func splitToken(raw string) (familyID, secret string, ok bool) {
	familyID, secret, found := strings.Cut(raw, tokenSep)
	if !found || familyID == "" || secret == "" {
		return "", "", false
	}
	return familyID, secret, true
}

// atoiUserID coerces the user_id returned by the Lua script (a bulk string) or
// a plain integer into an int.
func atoiUserID(v interface{}) int {
	switch t := v.(type) {
	case int64:
		return int(t)
	case string:
		n, _ := strconv.Atoi(t)
		return n
	}
	return 0
}
