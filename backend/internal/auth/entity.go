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

type Role struct {
	ID       int    `json:"id"`
	RoleName string `json:"role_name"`
}

type Permission struct {
	ID             int    `json:"id"`
	PermissionName string `json:"permission_name"`
}

type UserRoleMapping struct {
	EventID        *int   `json:"event_id,omitempty"`
	RoleName       string `json:"role_name"`
	PermissionName string `json:"permission_name"`
}

type Repository interface{
	GetByEmail(email string) (*User, error)
	GetByID(id int) (*User, error)
	Create(user *User, fullName string) error
	GetUserRolesAndPermissions(userID int) ([]UserRoleMapping, error)
}

type Service interface{
	Register(req RegisterRequest) error
	Login(req LoginRequest) (string, *User, error)
	GetGoogleAuthURL(state string) string
	HandleGoogleCallback(ctx context.Context, code string) (string, error)
}

