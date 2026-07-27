package database 

import (
	"database/sql"
	"time"
	_ "github.com/jackc/pgx/v5/stdlib"
)

type Config struct {
	DSN				string
	MaxOpenConns	int
	MaxIdleConns	int
	ConnMaxIdleTime time.Duration
	ConnMaxLifetime time.Duration
}

func Connect(cfg Config) (*sql.DB, error){
	db, err := sql.Open("pgx", cfg.DSN)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}

	EnsureSchema(db)

	return db, nil
}

func EnsureSchema(db *sql.DB) {
	query := `
	ALTER TABLE tickets ADD COLUMN IF NOT EXISTS secret_key VARCHAR(255);
	ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
	CREATE TABLE IF NOT EXISTS ticket_access_otps (
		id SERIAL PRIMARY KEY,
		ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
		email VARCHAR(255) NOT NULL,
		otp_code VARCHAR(10) NOT NULL,
		expires_at TIMESTAMPTZ NOT NULL,
		is_verified BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_ticket_access_otps_ticket_id ON ticket_access_otps(ticket_id);
	`
	_, _ = db.Exec(query)
}