// Package config resolves which deployment the running process is — a
// developer laptop, the public sandbox host, or production — from the
// environment, and exposes it as a single source of truth that other
// packages (main.go's cookie/JWT guardrails, the payment package's Midtrans
// client selection) read instead of each re-deriving their own notion of
// "are we in dev mode".
package config

import (
	"log"
	"os"
	"strings"
	"sync"
)

const (
	EnvProduction = "production"
	EnvSandbox    = "sandbox"
	EnvLocal      = "local"
)

var (
	resolveOnce sync.Once
	appEnv      string
)

// resolve computes the deployment environment exactly once. It is triggered
// lazily by the first call to AppEnv/IsProduction/IsSandbox/IsLocal rather
// than from an init(), because main.go may still need to load a .env file
// (or otherwise populate the process environment) before this is read; an
// init() would run before main() gets that chance. As of this writing
// main.go does not load a .env file itself (env vars come from the process
// environment / docker-compose env_file), but resolving lazily costs
// nothing and keeps this package safe if that changes later.
//
// Resolution order:
//  1. APP_ENV        (production | sandbox | local) — trimmed + lowercased.
//  2. DEV_MODE=true  → "local"  [legacy fallback, kept so a host that hasn't
//     migrated to APP_ENV yet still boots into the environment it expects].
//  3. "production"   [fail-safe: an unknown or unset environment gets the
//     strict path, never the relaxed one — booting silently insecure is far
//     worse than an operator noticing an unwanted Secure-cookie/JWT-required
//     posture on a host that meant to say "local"].
//
// A non-empty but unrecognised APP_ENV is a likely typo, not an unset var,
// so it gets a loud WARN in addition to falling back to production.
func resolve() string {
	raw := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))

	switch raw {
	case EnvProduction, EnvSandbox, EnvLocal:
		return raw
	case "":
		// Not set at all — fall through to the legacy DEV_MODE flag before
		// defaulting to production.
	default:
		log.Printf("[WARN] config: unknown APP_ENV %q, treating as production", raw)
		return EnvProduction
	}

	if os.Getenv("DEV_MODE") == "true" {
		return EnvLocal
	}

	return EnvProduction
}

// AppEnv returns the resolved deployment environment: "production",
// "sandbox", or "local". Resolved once per process via sync.Once, so the
// WARN log (for an unrecognised APP_ENV) fires at most once and the value
// can't drift if the environment is mutated after startup.
func AppEnv() string {
	resolveOnce.Do(func() {
		appEnv = resolve()
	})
	return appEnv
}

// IsProduction reports whether this process is running as the production
// deployment.
func IsProduction() bool {
	return AppEnv() == EnvProduction
}

// IsSandbox reports whether this process is running as the public sandbox
// deployment. Sandbox is strict like production (Secure cookies, a real
// JWT_SECRET) — the only thing it changes is which Midtrans gateway is used.
func IsSandbox() bool {
	return AppEnv() == EnvSandbox
}

// IsLocal reports whether this process is running on a developer laptop.
// This is the ONLY environment that gets the relaxed path — see main.go's
// devMode, which must be true for "local" and false for everything else,
// including sandbox: a sandbox host is still a public host and needs Secure
// cookies and a real JWT_SECRET exactly like production.
func IsLocal() bool {
	return AppEnv() == EnvLocal
}
