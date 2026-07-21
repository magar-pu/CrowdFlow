package auth

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func newTestStore(t *testing.T) (*SessionStore, *miniredis.Miniredis) {
	t.Helper()
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	return NewSessionStore(client, time.Hour), mr
}

func TestCreateAndRotate(t *testing.T) {
	store, _ := newTestStore(t)
	ctx := context.Background()

	token, err := store.Create(ctx, 42)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if _, _, ok := splitToken(token); !ok {
		t.Fatalf("Create returned malformed token %q", token)
	}

	uid, newToken, err := store.ValidateAndRotate(ctx, token)
	if err != nil {
		t.Fatalf("ValidateAndRotate: %v", err)
	}
	if uid != 42 {
		t.Fatalf("rotate returned user %d, want 42", uid)
	}
	if newToken == token {
		t.Fatalf("rotate did not issue a new token")
	}

	// The rotated (new) token must itself be usable.
	if _, _, err := store.ValidateAndRotate(ctx, newToken); err != nil {
		t.Fatalf("rotated token not usable: %v", err)
	}
}

func TestReuseDetectionRevokesFamily(t *testing.T) {
	store, _ := newTestStore(t)
	ctx := context.Background()

	token, err := store.Create(ctx, 7)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	// First rotation succeeds and invalidates the original token.
	if _, _, err := store.ValidateAndRotate(ctx, token); err != nil {
		t.Fatalf("first rotate: %v", err)
	}

	// Replaying the original (now stale) token is reuse.
	_, _, err = store.ValidateAndRotate(ctx, token)
	if !errors.Is(err, ErrRefreshTokenReuse) {
		t.Fatalf("replay error = %v, want ErrRefreshTokenReuse", err)
	}

	// Reuse must have revoked the whole family, so the previously-valid
	// rotated token no longer works either.
	// (Grab a fresh chain to prove the family is gone.)
	token2, _ := store.Create(ctx, 7)
	_, newToken2, _ := store.ValidateAndRotate(ctx, token2)
	// Simulate reuse on chain 2, then confirm newToken2 is dead.
	_, _, _ = store.ValidateAndRotate(ctx, token2) // stale replay -> revokes family
	if _, _, err := store.ValidateAndRotate(ctx, newToken2); !errors.Is(err, ErrInvalidRefreshToken) {
		t.Fatalf("post-reuse rotated token error = %v, want ErrInvalidRefreshToken", err)
	}
}

func TestRevoke(t *testing.T) {
	store, _ := newTestStore(t)
	ctx := context.Background()

	token, _ := store.Create(ctx, 1)
	if err := store.Revoke(ctx, token); err != nil {
		t.Fatalf("Revoke: %v", err)
	}
	if _, _, err := store.ValidateAndRotate(ctx, token); !errors.Is(err, ErrInvalidRefreshToken) {
		t.Fatalf("post-revoke error = %v, want ErrInvalidRefreshToken", err)
	}

	// Revoking an unknown/malformed token is a no-op.
	if err := store.Revoke(ctx, "garbage"); err != nil {
		t.Fatalf("Revoke(malformed) = %v, want nil", err)
	}
}

func TestRevokeAllForUser(t *testing.T) {
	store, _ := newTestStore(t)
	ctx := context.Background()

	t1, _ := store.Create(ctx, 99)
	t2, _ := store.Create(ctx, 99)

	if err := store.RevokeAllForUser(ctx, 99); err != nil {
		t.Fatalf("RevokeAllForUser: %v", err)
	}
	for i, tok := range []string{t1, t2} {
		if _, _, err := store.ValidateAndRotate(ctx, tok); !errors.Is(err, ErrInvalidRefreshToken) {
			t.Fatalf("session %d still valid after RevokeAllForUser: err=%v", i, err)
		}
	}
}

func TestMalformedToken(t *testing.T) {
	store, _ := newTestStore(t)
	ctx := context.Background()

	for _, tok := range []string{"", "nodot", ".", "fam.", ".secret"} {
		if _, _, err := store.ValidateAndRotate(ctx, tok); !errors.Is(err, ErrInvalidRefreshToken) {
			t.Fatalf("ValidateAndRotate(%q) err = %v, want ErrInvalidRefreshToken", tok, err)
		}
	}
}

func TestSessionTTL(t *testing.T) {
	store, mr := newTestStore(t)
	ctx := context.Background()

	token, _ := store.Create(ctx, 5)
	// Fast-forward past the store TTL; the session key must expire.
	mr.FastForward(time.Hour + time.Minute)
	if _, _, err := store.ValidateAndRotate(ctx, token); !errors.Is(err, ErrInvalidRefreshToken) {
		t.Fatalf("expired session error = %v, want ErrInvalidRefreshToken", err)
	}
}
