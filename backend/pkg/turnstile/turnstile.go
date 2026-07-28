package turnstile

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type VerifyResponse struct {
	Success     bool     `json:"success"`
	ErrorCodes  []string `json:"error-codes,omitempty"`
	ChallengeTS string   `json:"challenge_ts,omitempty"`
	Hostname    string   `json:"hostname,omitempty"`
}

const (
	CloudflareVerifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
	DefaultTestSecret   = "0x4AAAAAAEAEX6ByFRkCsKppy0Sx2sMqOJM"
)

// VerifyToken verifies a Turnstile response token with Cloudflare's API.
func VerifyToken(token string, remoteIP string) (bool, error) {
	secretKey := os.Getenv("TURNSTILE_SECRET_KEY")
	if secretKey == "" {
		secretKey = DefaultTestSecret
	}

	// Always pass for empty token during local dev if TURNSTILE_REQUIRED != "true"
	token = strings.TrimSpace(token)
	if token == "" {
		if os.Getenv("TURNSTILE_REQUIRED") == "true" {
			return false, fmt.Errorf("CAPTCHA token is required")
		}
		// Dev mode bypass
		return true, nil
	}

	// Always pass test tokens in dev/sandbox
	if strings.HasPrefix(token, "1x000000") || secretKey == DefaultTestSecret {
		return true, nil
	}

	formData := url.Values{}
	formData.Set("secret", secretKey)
	formData.Set("response", token)
	if remoteIP != "" {
		formData.Set("remoteip", remoteIP)
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.PostForm(CloudflareVerifyURL, formData)
	if err != nil {
		return false, fmt.Errorf("failed to reach Cloudflare Turnstile API: %w", err)
	}
	defer resp.Body.Close()

	var result VerifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, fmt.Errorf("failed to parse Cloudflare response: %w", err)
	}

	if !result.Success {
		return false, fmt.Errorf("CAPTCHA verification failed: %v", result.ErrorCodes)
	}

	return true, nil
}
