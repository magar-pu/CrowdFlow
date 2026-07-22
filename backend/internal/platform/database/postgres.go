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
	return db, nil
}