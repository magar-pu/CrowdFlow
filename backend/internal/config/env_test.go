package config

import (
	"sync"
	"testing"
)

func TestResolveMatrix(t *testing.T) {
	cases := []struct {
		name     string
		appEnv   string
		devMode  string
		want     string
		wantLocal bool
	}{
		{"production", "production", "", EnvProduction, false},
		{"sandbox", "sandbox", "", EnvSandbox, false},
		{"local", "local", "", EnvLocal, true},
		{"unset+DEV_MODE=true", "", "true", EnvLocal, true},
		{"unset+nothing", "", "", EnvProduction, false},
		{"bogus", "garbage", "", EnvProduction, false},
		{"mixed case + space", "  PRODUCTION ", "", EnvProduction, false},
		{"sandbox wins over DEV_MODE", "sandbox", "true", EnvSandbox, false},
		{"DEV_MODE=1 is not true", "", "1", EnvProduction, false},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Setenv("APP_ENV", c.appEnv)
			t.Setenv("DEV_MODE", c.devMode)
			resolveOnce = sync.Once{}
			appEnv = ""

			if got := AppEnv(); got != c.want {
				t.Errorf("AppEnv() = %q, want %q", got, c.want)
			}
			if got := IsLocal(); got != c.wantLocal {
				t.Errorf("IsLocal() = %v, want %v (devMode)", got, c.wantLocal)
			}
			if got := IsProduction(); got != (c.want == EnvProduction) {
				t.Errorf("IsProduction() = %v", got)
			}
			if got := IsSandbox(); got != (c.want == EnvSandbox) {
				t.Errorf("IsSandbox() = %v", got)
			}
		})
	}
}
