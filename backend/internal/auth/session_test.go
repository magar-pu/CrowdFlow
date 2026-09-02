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

	// Drive the clock by hand: a replay is only theft once it lands OUTSIDE
	// the grace window, and we are not going to sleep 10s to prove it.
	clock := time.Now()
	store.now = func() time.Time { return clock }

	token, err := store.Create(ctx, 7)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	// First rotation succeeds and invalidates the original token.
	if _, _, err := store.ValidateAndRotate(ctx, token); err != nil {
		t.Fatalf("first rotate: %v", err)
	}

	// Well past the grace window, replaying the original token is reuse.
	clock = clock.Add(defaultGraceWindow + time.Second)
	_, _, err = store.ValidateAndRotate(ctx, token)
	if !errors.Is(err, ErrRefreshTokenReuse) {
		t.Fatalf("replay error = %v, want ErrRefreshTokenReuse", err)
	}

	// Reuse must have revoked the whole family, so the previously-valid
	// rotated token no longer works either.
	// (Grab a fresh chain to prove the family is gone.)
	token2, _ := store.Create(ctx, 7)
	_, newToken2, _ := store.ValidateAndRotate(ctx, token2)
	clock = clock.Add(defaultGraceWindow + time.Second)
	_, _, _ = store.ValidateAndRotate(ctx, token2) // stale replay -> revokes family
	if _, _, err := store.ValidateAndRotate(ctx, newToken2); !errors.Is(err, ErrInvalidRefreshToken) {
		t.Fatalf("post-reuse rotated token error = %v, want ErrInvalidRefreshToken", err)
	}
}

// The two-tabs case: one browser, one cookie, two independent refresh
// coordinators presenting the same secret moments apart. Both must survive.
func TestGraceWindowAcceptsConcurrentRefresh(t *testing.T) {
	store, _ := newTestStore(t)
	ctx := context.Background()

	clock := time.Now()
	store.now = func() time.Time { return clock }

	token, err := store.Create(ctx, 99)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	// Tab A refreshes first and wins the rotation.
	uidA, tokenA, err := store.ValidateAndRotate(ctx, token)
	if err != nil {
		t.Fatalf("tab A rotate: %v", err)
	}

	// Tab B's request was already in flight with the same original secret.
	clock = clock.Add(time.Second)
	uidB, tokenB, err := store.ValidateAndRotate(ctx, token)
	if err != nil {
		t.Fatalf("tab B rotate inside grace window: %v", err)
	}
	if uidA != 99 || uidB != 99 {
		t.Fatalf("grace rotate returned users %d/%d, want 99", uidA, uidB)
	}
	if tokenB == tokenA {
		t.Fatalf("grace rotate reissued tab A's token")
	}

	// The family is intact and the newest token still works.
	if _, _, err := store.ValidateAndRotate(ctx, tokenB); err != nil {
		t.Fatalf("token from grace rotate not usable: %v", err)
	}
}

// The window slides with each rotation, so a third tab in the same burst is
// still covered rather than falling off the end.
func TestGraceWindowSlidesAcrossRotations(t *testing.T) {
	store, _ := newTestStore(t)
	ctx := context.Background()

	clock := time.Now()
	store.now = func() time.Time { return clock }

	token, _ := store.Create(ctx, 5)
	if _, _, err := store.ValidateAndRotate(ctx, token); err != nil {
		t.Fatalf("first rotate: %v", err)
	}

	clock = clock.Add(2 * time.Second)
	_, second, err := store.ValidateAndRotate(ctx, token) // grace hit
	if err != nil {
		t.Fatalf("second rotate: %v", err)
	}

	// The secret issued by the grace rotation is the live one and must work.
	clock = clock.Add(2 * time.Second)
	if _, _, err := store.ValidateAndRotate(ctx, second); err != nil {
		t.Fatalf("post-grace live token rejected: %v", err)
	}
}

// A secret the store never issued is theft at any distance, grace or not.
func TestUnknownSecretRevokesImmediately(t *testing.T) {
	store, _ := newTestStore(t)
	ctx := context.Background()

	token, _ := store.Create(ctx, 3)
	familyID, _, _ := splitToken(token)

	forged := familyID + tokenSep + "not-a-secret-we-ever-issued"
	if _, _, err := store.ValidateAndRotate(ctx, forged); !errors.Is(err, ErrRefreshTokenReuse) {
		t.Fatalf("forged secret error = %v, want ErrRefreshTokenReuse", err)
	}

	// Family destroyed: the real token is dead too.
	if _, _, err := store.ValidateAndRotate(ctx, token); !errors.Is(err, ErrInvalidRefreshToken) {
		t.Fatalf("post-forgery real token error = %v, want ErrInvalidRefreshToken", err)
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
