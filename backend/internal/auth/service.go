package auth

import (
	"context"
	"database/sql"
	"errors"
	"strconv"
	"time"

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
}

func NewAuthService(repo Repository, jwtSecret string, oauthConfig *oauth2.Config, sessions *SessionStore, accessTTL time.Duration) *AuthService {
	return &AuthService{
		repo:        repo,
		jwtSecret:   []byte(jwtSecret),
		oauthConfig: oauthConfig,
		sessions:    sessions,
		accessTTL:   accessTTL,
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

func (s *AuthService) GetGoogleAuthURL(state string) string {
	return s.oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

func (s *AuthService) HandleGoogleCallback(ctx context.Context, code string) (string, string, *User, error) {
	// Exchange authorization code for token
	token, err := s.oauthConfig.Exchange(ctx, code)
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
