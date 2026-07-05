package auth

import(
	"context"
	"database/sql"
	"time"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}


func (r *PostgresRepository) GetByEmail(email string) (*User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	query := `
		SELECT u.id, u.email, u.password_hash, u.auth_provider, u.verification_status, u.created_at, 
		       COALESCE(up.full_name, ''), COALESCE(up.phone_number, ''), COALESCE(up.location, ''), COALESCE(up.bio, ''), COALESCE(up.avatar_pic, '')
		FROM users u
		LEFT JOIN user_profiles up ON u.id = up.user_id
		WHERE u.email = $1`
	var u User
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.AuthProvider, &u.VerificationStatus, &u.CreatedAt, 
		&u.FullName, &u.PhoneNumber, &u.Location, &u.Bio, &u.AvatarPic,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *PostgresRepository) GetByID(id int) (*User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	query := `
		SELECT u.id, u.email, u.password_hash, u.auth_provider, u.verification_status, u.created_at, 
		       COALESCE(up.full_name, ''), COALESCE(up.phone_number, ''), COALESCE(up.location, ''), COALESCE(up.bio, ''), COALESCE(up.avatar_pic, '')
		FROM users u
		LEFT JOIN user_profiles up ON u.id = up.user_id
		WHERE u.id = $1`
	var u User
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.AuthProvider, &u.VerificationStatus, &u.CreatedAt, 
		&u.FullName, &u.PhoneNumber, &u.Location, &u.Bio, &u.AvatarPic,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *PostgresRepository) Create(user *User, fullName string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// 1. Begin Database Transaction
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() // Rollback is ignored if transaction is committed
	// 2. Insert into users table
	userQuery := `
		INSERT INTO users (email, password_hash, auth_provider, verification_status)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at`
	err = tx.QueryRowContext(ctx, userQuery, user.Email, user.PasswordHash, user.AuthProvider, user.VerificationStatus).Scan(
		&user.ID, &user.CreatedAt,
	)
	if err != nil {
		return err
	}
	// 3. Insert into user_profiles table
	profileQuery := `
		INSERT INTO user_profiles (user_id, full_name)
		VALUES ($1, $2)`
	_, err = tx.ExecContext(ctx, profileQuery, user.ID, fullName)
	if err != nil {
		return err
	}
	// 4. Assign default user role (role_id = 5) in user_roles table
	roleQuery := `
		INSERT INTO user_roles (user_id, role_id, event_id)
		VALUES ($1, 5, NULL)`
	_, err = tx.ExecContext(ctx, roleQuery, user.ID)
	if err != nil {
		return err
	}
	// 5. Commit transaction
	return tx.Commit()
}

func (r *PostgresRepository) GetUserRolesAndPermissions(userID int) ([]UserRoleMapping, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		SELECT ur.event_id, r.role_name, COALESCE(p.permission_name, '')
		FROM user_roles ur
		JOIN roles r ON ur.role_id = r.id
		LEFT JOIN role_permissions rp ON r.id = rp.role_id
		LEFT JOIN permissions p ON rp.permission_id = p.id
		WHERE ur.user_id = $1`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mappings []UserRoleMapping
	for rows.Next() {
		var mapping UserRoleMapping
		var eventID sql.NullInt64
		if err := rows.Scan(&eventID, &mapping.RoleName, &mapping.PermissionName); err != nil {
			return nil, err
		}
		if eventID.Valid {
			val := int(eventID.Int64)
			mapping.EventID = &val
		}
		mappings = append(mappings, mapping)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return mappings, nil
}

func (r *PostgresRepository) GetProfileStats(userID int) (ProfileStats, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var stats ProfileStats

	// Calculate TotalTickets
	ticketQuery := `
		SELECT COUNT(t.id)
		FROM tickets t
		JOIN orders o ON t.order_id = o.id
		WHERE o.purchaser_id = $1 AND o.status = 'paid'`
	err := r.db.QueryRowContext(ctx, ticketQuery, userID).Scan(&stats.TotalTickets)
	if err != nil {
		return stats, err
	}

	// Calculate EventsAttended (distinct events in the past with paid orders)
	attendedQuery := `
		SELECT COUNT(DISTINCT o.event_id)
		FROM orders o
		JOIN events e ON o.event_id = e.id
		WHERE o.purchaser_id = $1 AND o.status = 'paid' AND e.event_end < CURRENT_TIMESTAMP`
	err = r.db.QueryRowContext(ctx, attendedQuery, userID).Scan(&stats.EventsAttended)
	if err != nil {
		return stats, err
	}

	// Calculate TotalOrders (paid orders)
	orderQuery := `
		SELECT COUNT(id)
		FROM orders
		WHERE purchaser_id = $1 AND status = 'paid'`
	err = r.db.QueryRowContext(ctx, orderQuery, userID).Scan(&stats.TotalOrders)
	if err != nil {
		return stats, err
	}

	stats.SavedEvents = 0 // Mocked / stubbed to 0 as per the plan

	return stats, nil
}

func (r *PostgresRepository) GetAssociatedEvents(userID int, isOrganizer bool) ([]ProfileEventSummary, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var query string
	if isOrganizer {
		query = `
			SELECT id, event_name, event_start, event_end, COALESCE(cover_image_url, ''), status
			FROM events
			WHERE organizer_id = $1
			ORDER BY event_start DESC`
	} else {
		query = `
			SELECT DISTINCT e.id, e.event_name, e.event_start, e.event_end, COALESCE(e.cover_image_url, ''), e.status
			FROM events e
			JOIN orders o ON o.event_id = e.id
			WHERE o.purchaser_id = $1 AND o.status = 'paid'
			ORDER BY e.event_start DESC`
	}

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var summaries []ProfileEventSummary
	for rows.Next() {
		var s ProfileEventSummary
		err := rows.Scan(&s.EventID, &s.Title, &s.StartsAt, &s.EndsAt, &s.CoverImageURL, &s.Status)
		if err != nil {
			return nil, err
		}
		summaries = append(summaries, s)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return summaries, nil
}

func (r *PostgresRepository) UpdateProfile(userID int, req UpdateProfileRequest) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		INSERT INTO user_profiles (user_id, full_name, phone_number, location, bio)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id) 
		DO UPDATE SET full_name = EXCLUDED.full_name, 
		              phone_number = EXCLUDED.phone_number, 
		              location = EXCLUDED.location, 
		              bio = EXCLUDED.bio`
	_, err := r.db.ExecContext(ctx, query, userID, req.FullName, req.PhoneNumber, req.Location, req.Bio)
	return err
}


