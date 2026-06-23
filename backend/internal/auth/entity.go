package auth

import(
	"context"
	"time"
)

type User struct{
	ID 					string 		`json:"id"`
	Email 				string 		`json:"email"`
	PasswordHash 		*string 	`json:"-"`
	AuthProvider		string 		`json:"auth_provider"`
	VerificationStatus 	string 		`json:"verification_status"`
	CreatedAt 			time.Time 	`json:"created_at"`
	UpdatedAt 			time.Time 	`json:"updated_at"`

	FullName 			string 		`json:"full_name"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type GoogleLoginRequest struct {
	Token    string `json:"token"`
	FullName string `json:"full_name,omitempty"`
}

type Repository interface{
	GetByEmail(email string) (*User, error)
	GetByID(id int) (*User, error)
	Create(user *User, fullName string) error
}

type Service interface{
	Register(req RegisterRequest) error
	Login(req LoginRequest) (string, error)
	LoginWithGoogle(ctx context.Context, tokenString string) (string, error)
}
