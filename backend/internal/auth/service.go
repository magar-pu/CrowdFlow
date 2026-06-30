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
}

func NewAuthService(repo Repository, jwtSecret string, oauthConfig *oauth2.Config) *AuthService {
	return &AuthService{
		repo:        repo,
		jwtSecret:   []byte(jwtSecret),
		oauthConfig: oauthConfig,
	}
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
		"exp":   time.Now().Add(24 * time.Hour).Unix(), // Access token lifetime
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

func (s *AuthService) Login(req LoginRequest) (string, error) {
	user, err := s.repo.GetByEmail(req.Email)
	if err != nil {
		return "", errors.New("invalid email or password")
	}

	if user.AuthProvider != "native" || user.PasswordHash == nil {
		return "", errors.New("this account uses Google authentication. Please sign in with Google")
	}

	err = bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(req.Password))
	if err != nil {
		return "", errors.New("invalid email or password")
	}

	return s.GenerateJWT(user)
}

func (s *AuthService) GetGoogleAuthURL(state string) string {
	return s.oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

func (s *AuthService) HandleGoogleCallback(ctx context.Context, code string) (string, error) {
	// Exchange authorization code for token
	token, err := s.oauthConfig.Exchange(ctx, code)
	if err != nil {
		return "", errors.New("failed to exchange authorization code: " + err.Error())
	}

	// Extract the ID Token (JWT) from OAuth2 token response
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return "", errors.New("google token response did not contain id_token")
	}

	// Validate the ID Token
	payload, err := idtoken.Validate(ctx, rawIDToken, s.oauthConfig.ClientID)
	if err != nil {
		return "", errors.New("invalid Google ID token: " + err.Error())
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
				return "", err
			}
		} else {
			return "", err
		}
	}

	return s.GenerateJWT(user)
}
