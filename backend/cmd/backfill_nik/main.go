// Command backfill_nik moves every existing tickets.attendee_nik (plaintext)
// into attendee_nik_enc (AES-GCM, internal/nik) and nulls the plaintext
// column once the encrypted value is confirmed written.
//
// Run once after migration 0032_order_attendees.sql is applied:
//
//	NIK_ENC_KEY=... DB_DSN=... go run ./backend/cmd/backfill_nik
//
// Idempotent: rows where attendee_nik IS NULL are skipped, so a second run
// (e.g. after a partial failure) only processes what is left. Each row is
// migrated in its own transaction — encrypt, write attendee_nik_enc, null
// attendee_nik, commit — so a crash mid-run leaves already-migrated rows
// correctly encrypted and the rest still in their original plaintext state,
// never a row with attendee_nik nulled and no encrypted value to show for it.
package main

import (
	"database/sql"
	"log"
	"os"

	"crowdflow-backend/internal/nik"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/crowdflow?sslmode=disable"
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("Failed to open DB: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping DB: %v", err)
	}

	// Fail fast if NIK_ENC_KEY is missing or malformed, before touching any
	// row — a run that gets partway through and then can't encrypt is worse
	// than one that never starts.
	if _, err := nik.Encrypt("0000000000000000"); err != nil {
		log.Fatalf("NIK_ENC_KEY is not usable: %v", err)
	}

	rows, err := db.Query(`SELECT id::text, attendee_nik FROM tickets WHERE attendee_nik IS NOT NULL`)
	if err != nil {
		log.Fatalf("Failed to query tickets with plaintext NIK: %v", err)
	}

	type row struct {
		id  string
		nik string
	}
	var pending []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.nik); err != nil {
			rows.Close()
			log.Fatalf("Failed to scan ticket row: %v", err)
		}
		pending = append(pending, r)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		log.Fatalf("Failed while reading ticket rows: %v", err)
	}

	log.Printf("backfill_nik: %d ticket(s) with plaintext NIK to migrate", len(pending))

	migrated := 0
	for _, r := range pending {
		enc, err := nik.Encrypt(r.nik)
		if err != nil {
			log.Fatalf("Failed to encrypt NIK for ticket %s: %v", r.id, err)
		}

		tx, err := db.Begin()
		if err != nil {
			log.Fatalf("Failed to begin transaction for ticket %s: %v", r.id, err)
		}

		// Write the encrypted value first; only null the plaintext column
		// once that write is confirmed, and both happen in the same
		// transaction so a failure between them leaves attendee_nik intact
		// rather than losing the value.
		if _, err := tx.Exec(
			`UPDATE tickets SET attendee_nik_enc = $1 WHERE id = $2::uuid AND attendee_nik_enc IS NULL`,
			enc, r.id,
		); err != nil {
			tx.Rollback()
			log.Fatalf("Failed to write attendee_nik_enc for ticket %s: %v", r.id, err)
		}

		if _, err := tx.Exec(
			`UPDATE tickets SET attendee_nik = NULL WHERE id = $1::uuid AND attendee_nik_enc IS NOT NULL`,
			r.id,
		); err != nil {
			tx.Rollback()
			log.Fatalf("Failed to null attendee_nik for ticket %s: %v", r.id, err)
		}

		if err := tx.Commit(); err != nil {
			log.Fatalf("Failed to commit migration for ticket %s: %v", r.id, err)
		}
		migrated++
	}

	log.Printf("backfill_nik: migrated %d/%d ticket(s)", migrated, len(pending))
}
