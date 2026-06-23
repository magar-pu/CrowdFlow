package auth

import(
	"context"
	"database/sql"
	"errors"
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
		SELECT u.id, u.email, u.password_hash, u.auth_provider, u.verification_status, u.created_at, up.full_name
		FROM users u
		LEFT JOIN user_profiles up ON u.id = up.user_id
		WHERE u.email = $1`
	var u User
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.AuthProvider, &u.VerificationStatus, &u.CreatedAt, &u.FullName,
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
		SELECT u.id, u.email, u.password_hash, u.auth_provider, u.verification_status, u.created_at, up.full_name
		FROM users u
		LEFT JOIN user_profiles up ON u.id = up.user_id
		WHERE u.id = $1`
	var u User
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.AuthProvider, &u.VerificationStatus, &u.CreatedAt, &u.FullName,
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
	// 4. Commit transaction
	return tx.Commit()
}



