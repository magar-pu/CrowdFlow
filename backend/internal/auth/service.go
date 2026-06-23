package auth

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
)

type AuthService struct {
	repo           Repository
	jwtSecret      []byte
	googleClientID string
}

func NewAuthService(repo Repository, jwtSecret string, googleClientID string) *AuthService {
	return &AuthService{
		repo:           repo,
		jwtSecret:      []byte(jwtSecret),
		googleClientID: googleClientID,
	}
}

// GenerateJWT creates a signed access token containing User ID claims
func (s *AuthService) GenerateJWT(user *User) (string, error) {
	claims := jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
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

func (s *AuthService) LoginWithGoogle(ctx context.Context, tokenString string) (string, error) {
	// Verify Google Token against Google Client ID
	payload, err := idtoken.Validate(ctx, tokenString, s.googleClientID)
	if err != nil {
		return "", errors.New("invalid Google token: " + err.Error())
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
