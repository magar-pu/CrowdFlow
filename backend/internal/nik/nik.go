// Package nik encrypts and decrypts attendee NIK (Indonesian national ID)
// values at rest. NIK is never stored, logged, or returned in plaintext
// outside this package — see plan_2026-08-30_dynamic_qr_ticketman decision 9.
//
// AES-256-GCM, key from NIK_ENC_KEY (base64-encoded, 32 raw bytes). The
// nonce is random per encryption and stored alongside the ciphertext
// (nonce || ciphertext), so no separate nonce column is needed.
package nik

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"regexp"
	"sync"
)

var (
	keyOnce sync.Once
	key     []byte
	keyErr  error
)

// loadKey reads and decodes NIK_ENC_KEY once per process. Lazy like
// internal/config's resolve(), so a .env file loaded after package init is
// still picked up.
func loadKey() ([]byte, error) {
	keyOnce.Do(func() {
		raw := os.Getenv("NIK_ENC_KEY")
		if raw == "" {
			keyErr = errors.New("NIK_ENC_KEY is not set")
			return
		}
		decoded, err := base64.StdEncoding.DecodeString(raw)
		if err != nil {
			keyErr = fmt.Errorf("NIK_ENC_KEY is not valid base64: %w", err)
			return
		}
		if len(decoded) != 32 {
			keyErr = fmt.Errorf("NIK_ENC_KEY must decode to 32 bytes (AES-256), got %d", len(decoded))
			return
		}
		key = decoded
	})
	return key, keyErr
}

// Encrypt returns nonce||ciphertext for storage in a BYTEA column.
func Encrypt(plaintext string) ([]byte, error) {
	k, err := loadKey()
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(k)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}

	return gcm.Seal(nonce, nonce, []byte(plaintext), nil), nil
}

// Decrypt reverses Encrypt. Callers are the only sanctioned readers of
// plaintext NIK — as of Step 0 that is nobody outside this package's own
// tests; the gate scan response and organizer export are explicitly future
// work (see plan decision 9 and CONTRACT.md).
func Decrypt(ciphertext []byte) (string, error) {
	k, err := loadKey()
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(k)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("nik: ciphertext too short")
	}
	nonce, sealed := ciphertext[:nonceSize], ciphertext[nonceSize:]

	plaintext, err := gcm.Open(nil, nonce, sealed, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

var nikPattern = regexp.MustCompile(`^\d{16}$`)

// Valid reports whether s is a syntactically valid NIK: exactly 16 digits.
// This is a format check only — it does not verify the NIK against Dukcapil
// or any external registry.
func Valid(s string) bool {
	return nikPattern.MatchString(s)
}
