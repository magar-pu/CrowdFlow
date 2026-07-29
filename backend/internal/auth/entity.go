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
	PhoneNumber         string      `json:"phone_number"`
	Location            string      `json:"location"`
	Bio                 string      `json:"bio"`
	AvatarPic           string      `json:"avatar_pic"`
}

type ProfileStats struct {
	TotalTickets   int `json:"total_tickets"`
	EventsAttended int `json:"events_attended"`
	SavedEvents    int `json:"saved_events"` // Mocked / stubbed to 0 (for future dev)
	TotalOrders    int `json:"total_orders"`
}

type ProfileEventSummary struct {
	EventID       int       `json:"event_id"`
	Title         string    `json:"title"`
	StartsAt      time.Time `json:"starts_at"`
	EndsAt        time.Time `json:"ends_at"`
	CoverImageURL string    `json:"cover_image_url"`
	Status        string    `json:"status"`
}

type UserProfileResponse struct {
	UserID       string                 `json:"user_id"`
	Email        string                 `json:"email"`
	FullName     string                 `json:"full_name"`
	PhoneNumber  string                 `json:"phone_number"`
	Location     string                 `json:"location"`
	Bio          string                 `json:"bio"`
	AvatarURL    string                 `json:"avatar_url"`
	Role         string                 `json:"role"`
	MemberSince  string                 `json:"member_since"`
	Stats        ProfileStats           `json:"stats"`
	Events       []ProfileEventSummary `json:"events"`
}

type UpdateProfileRequest struct {
	FullName    string `json:"full_name"`
	PhoneNumber string `json:"phone_number"`
	Location    string `json:"location"`
	Bio         string `json:"bio"`
}

type RegisterRequest struct {
	Email          string `json:"email"`
	Password       string `json:"password"`
	FullName       string `json:"full_name"`
	TurnstileToken string `json:"turnstile_token,omitempty"`
}

type LoginRequest struct {
	Email          string `json:"email"`
	Password       string `json:"password"`
	TurnstileToken string `json:"turnstile_token,omitempty"`
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
	GetProfileStats(userID int) (ProfileStats, error)
	GetAssociatedEvents(userID int, isOrganizer bool) ([]ProfileEventSummary, error)
	UpdateProfile(userID int, req UpdateProfileRequest) error
	UpdatePasswordHash(userID int, newHash string) error
}

type Service interface{
	Register(req RegisterRequest) error
	Login(ctx context.Context, req LoginRequest) (string, string, *User, error)
	RefreshTokens(ctx context.Context, rawRefreshToken string) (string, string, *User, error)
	Logout(ctx context.Context, rawRefreshToken string) error
	LogoutAll(ctx context.Context, userID int) error
	GetGoogleAuthURL(state string) string
	HandleGoogleCallback(ctx context.Context, code string) (string, string, *User, error)
}


