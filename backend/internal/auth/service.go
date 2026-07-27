package auth

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"strconv"
	"time"

	"crowdflow-backend/internal/mail"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"google.golang.org/api/idtoken"
)

type AuthService struct {
	repo        Repository
	jwtSecret   []byte
	oauthConfig *oauth2.Config
	sessions    *SessionStore
	accessTTL   time.Duration
	mailService mail.Service
}

func NewAuthService(repo Repository, jwtSecret string, oauthConfig *oauth2.Config, sessions *SessionStore, accessTTL time.Duration, mailService mail.Service) *AuthService {
	return &AuthService{
		repo:        repo,
		jwtSecret:   []byte(jwtSecret),
		oauthConfig: oauthConfig,
		sessions:    sessions,
		accessTTL:   accessTTL,
		mailService: mailService,
	}
}

// issueTokens mints a fresh access JWT and opens a new refresh-token session.
// Roles are re-read from the DB on every mint (via GenerateJWT), so a login or
// refresh always reflects the user's current platform roles.
func (s *AuthService) issueTokens(ctx context.Context, user *User) (access, refresh string, err error) {
	access, err = s.GenerateJWT(user)
	if err != nil {
		return "", "", err
	}
	userID, err := strconv.Atoi(user.ID)
	if err != nil {
		return "", "", err
	}
	refresh, err = s.sessions.Create(ctx, userID)
	if err != nil {
		return "", "", err
	}
	return access, refresh, nil
}

// GenerateJWT creates a signed access token containing User ID claims and platform roles
func (s *AuthService) GenerateJWT(user *User) (string, error) {
	// 1. Convert user ID to int to query DB
	userID, err := strconv.Atoi(user.ID)
	if err != nil {
		return "", err
	}

	// 2. Fetch roles and permissions
	mappings, err := s.repo.GetUserRolesAndPermissions(userID)
	if err != nil {
		return "", err
	}

	// 3. Extract unique platform-wide roles (where EventID is nil)
	var platformRoles []string
	seenRoles := make(map[string]bool)
	for _, m := range mappings {
		if m.EventID == nil {
			if !seenRoles[m.RoleName] {
				seenRoles[m.RoleName] = true
				platformRoles = append(platformRoles, m.RoleName)
			}
		}
	}

	// 4. Create JWT claims containing sub, email, roles, and exp
	claims := jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"roles": platformRoles,
		"exp":   time.Now().Add(s.accessTTL).Unix(), // Short-lived; refreshed via refresh token
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *AuthService) Register(req RegisterRequest) error {
	// Check if already registered
	_, err := s.repo.GetByEmail(req.Email)
	if err == nil {
		return errors.New("email is already registered")
	}

	// Hash password
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return err
	}
	hashStr := string(hashed)

	user := &User{
		Email:              req.Email,
		PasswordHash:       &hashStr,
		AuthProvider:       "native",
		VerificationStatus: "pending_verification",
	}

	return s.repo.Create(user, req.FullName)
}

func (s *AuthService) Login(ctx context.Context, req LoginRequest) (string, string, *User, error) {
	user, err := s.repo.GetByEmail(req.Email)
	if err != nil {
		return "", "", nil, errors.New("invalid email or password")
	}

	if user.AuthProvider != "native" {
		return "", "", nil, errors.New("invalid email or password")
	}

	err = bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(req.Password))
	if err != nil {
		return "", "", nil, errors.New("invalid email or password")
	}

	access, refresh, err := s.issueTokens(ctx, user)
	if err != nil {
		return "", "", nil, err
	}

	return access, refresh, user, nil
}

// RefreshTokens validates and rotates a refresh token, then mints a new access
// JWT with the user's current roles re-read from the DB. The presented token is
// invalidated; a replayed or expired token yields ErrRefreshTokenReuse or
// ErrInvalidRefreshToken. Note the session is rotated before the user lookup,
// so a rare DB error here forces a re-login rather than silently reusing the
// old token — an acceptable trade for keeping rotation atomic.
func (s *AuthService) RefreshTokens(ctx context.Context, rawRefreshToken string) (string, string, *User, error) {
	userID, newRefresh, err := s.sessions.ValidateAndRotate(ctx, rawRefreshToken)
	if err != nil {
		return "", "", nil, err
	}

	user, err := s.repo.GetByID(userID)
	if err != nil {
		return "", "", nil, err
	}

	access, err := s.GenerateJWT(user)
	if err != nil {
		return "", "", nil, err
	}

	return access, newRefresh, user, nil
}

// Logout revokes the single session identified by the refresh token.
func (s *AuthService) Logout(ctx context.Context, rawRefreshToken string) error {
	return s.sessions.Revoke(ctx, rawRefreshToken)
}

// LogoutAll revokes every session for a user (all devices).
func (s *AuthService) LogoutAll(ctx context.Context, userID int) error {
	return s.sessions.RevokeAllForUser(ctx, userID)
}

func (s *AuthService) GetGoogleAuthURL(state string) string {
	return s.oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

func (s *AuthService) GetGoogleAuthURLWithRedirect(state string, redirectURI string) string {
	cfg := *s.oauthConfig
	if redirectURI != "" {
		cfg.RedirectURL = redirectURI
	}
	return cfg.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

func (s *AuthService) HandleGoogleCallback(ctx context.Context, code string, redirectURI ...string) (string, string, *User, error) {
	cfg := *s.oauthConfig
	if len(redirectURI) > 0 && redirectURI[0] != "" {
		cfg.RedirectURL = redirectURI[0]
	}
	// Exchange authorization code for token
	token, err := cfg.Exchange(ctx, code)
	if err != nil {
		return "", "", nil, errors.New("failed to exchange authorization code: " + err.Error())
	}

	// Extract the ID Token (JWT) from OAuth2 token response
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return "", "", nil, errors.New("google token response did not contain id_token")
	}

	// Validate the ID Token
	payload, err := idtoken.Validate(ctx, rawIDToken, s.oauthConfig.ClientID)
	if err != nil {
		return "", "", nil, errors.New("invalid Google ID token: " + err.Error())
	}

	email, _ := payload.Claims["email"].(string)
	name, _ := payload.Claims["name"].(string)

	user, err := s.repo.GetByEmail(email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Just-in-Time Provisioning (Auto-register new Google users)
			user = &User{
				Email:              email,
				PasswordHash:       nil,
				AuthProvider:       "google",
				VerificationStatus: "verified", // Google has verified the identity
			}
			err = s.repo.Create(user, name)
			if err != nil {
				return "", "", nil, err
			}
		} else {
			return "", "", nil, err
		}
	} else {
		// Verify that this user account was registered with Google
		if user.AuthProvider != "google" {
			return "", "", nil, errors.New("PROVIDER_MISMATCH: native")
		}
	}

	access, refresh, err := s.issueTokens(ctx, user)
	if err != nil {
		return "", "", nil, err
	}

	return access, refresh, user, nil
}

func (s *AuthService) SendOTP(email string, purpose string) (string, error) {
	if email == "" {
		return "", errors.New("email is required")
	}

	// Generate 6-digit numeric OTP
	b := make([]byte, 3)
	_, _ = rand.Read(b)
	otp := fmt.Sprintf("%06d", (int(b[0])<<16|int(b[1])<<8|int(b[2]))%1000000)

	if s.mailService != nil {
		go func() {
			if err := s.mailService.SendOTP(email, otp, purpose); err != nil {
				log.Printf("[AUTH MAIL ERROR] Failed to send OTP to %s: %v", email, err)
			}
		}()
	}

	return otp, nil
}

func (s *AuthService) RequestPasswordReset(email string, resetBaseURL string) error {
	if email == "" {
		return errors.New("email is required")
	}

	// Check if user exists
	_, err := s.repo.GetByEmail(email)
	if err != nil {
		// Silent success to prevent account enumeration
		log.Printf("[AUTH RESET] Password reset requested for non-existent email: %s", email)
		return nil
	}

	// Generate random 32-byte reset token
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	token := hex.EncodeToString(b)

	// Store token in Redis with 1-hour TTL (key: "pwd_reset:<token>", value: email)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	s.sessions.redis.Set(ctx, "pwd_reset:"+token, email, 1*time.Hour)

	resetURL := fmt.Sprintf("%s/forgot-password?token=%s&email=%s", resetBaseURL, token, email)

	if s.mailService != nil {
		go func() {
			if err := s.mailService.SendPasswordReset(email, resetURL); err != nil {
				log.Printf("[AUTH MAIL ERROR] Failed to send password reset email to %s: %v", email, err)
			}
		}()
	}

	return nil
}

func (s *AuthService) ResetPassword(token, email, newPassword string) error {
	if token == "" || email == "" || newPassword == "" {
		return errors.New("token, email, and new password are required")
	}

	if len(newPassword) < 8 {
		return errors.New("password must be at least 8 characters")
	}

	// Verify token from Redis
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	storedEmail, err := s.sessions.redis.Get(ctx, "pwd_reset:"+token).Result()
	if err != nil {
		return errors.New("reset token is invalid or has expired")
	}

	if storedEmail != email {
		return errors.New("reset token is invalid or has expired")
	}

	// Look up the user
	user, err := s.repo.GetByEmail(email)
	if err != nil {
		return errors.New("user not found")
	}

	// Hash the new password
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password in DB
	userID, _ := strconv.Atoi(user.ID)
	if err := s.repo.UpdatePasswordHash(userID, string(hash)); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Delete the used token from Redis (one-time use)
	s.sessions.redis.Del(ctx, "pwd_reset:"+token)

	log.Printf("[AUTH RESET] Password successfully reset for user %s", email)
	return nil
}
