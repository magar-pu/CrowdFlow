package eventstaff

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Create(eventID int, req *CreateStaffRequest, passwordHash, eventCode string, createdByOrganizerID int) (*EventStaff, error) {
	var s EventStaff
	err := r.db.QueryRow(`
		INSERT INTO event_staff (event_id, event_code, full_name, email, password_hash, valid_from, valid_until, created_by_organizer_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, event_id, event_code, full_name, email, status, valid_from, valid_until, created_at, updated_at
	`, eventID, eventCode, req.FullName, req.Email, passwordHash, req.ValidFrom, req.ValidUntil, createdByOrganizerID).Scan(
		&s.ID, &s.EventID, &s.EventCode, &s.FullName, &s.Email, &s.Status, &s.ValidFrom, &s.ValidUntil, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *PostgresRepository) List(eventID int) ([]*EventStaff, error) {
	rows, err := r.db.Query(`
		SELECT id, event_id, event_code, full_name, email, status, valid_from, valid_until, created_at, updated_at
		FROM event_staff WHERE event_id = $1 ORDER BY id
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	staffList := []*EventStaff{}
	for rows.Next() {
		var s EventStaff
		if err := rows.Scan(&s.ID, &s.EventID, &s.EventCode, &s.FullName, &s.Email, &s.Status, &s.ValidFrom, &s.ValidUntil, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		staffList = append(staffList, &s)
	}

	for _, s := range staffList {
		gateIDs, err := r.gateIDsFor(s.ID)
		if err != nil {
			return nil, err
		}
		s.GateIDs = gateIDs

		tierIDs, err := r.tierIDsFor(s.ID)
		if err != nil {
			return nil, err
		}
		s.TierIDs = tierIDs
	}

	return staffList, nil
}

func (r *PostgresRepository) Get(id int, eventID int) (*EventStaff, error) {
	var s EventStaff
	err := r.db.QueryRow(`
		SELECT id, event_id, event_code, full_name, email, status, valid_from, valid_until, created_at, updated_at
		FROM event_staff WHERE id = $1 AND event_id = $2
	`, id, eventID).Scan(&s.ID, &s.EventID, &s.EventCode, &s.FullName, &s.Email, &s.Status, &s.ValidFrom, &s.ValidUntil, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}

	gateIDs, err := r.gateIDsFor(s.ID)
	if err != nil {
		return nil, err
	}
	s.GateIDs = gateIDs

	tierIDs, err := r.tierIDsFor(s.ID)
	if err != nil {
		return nil, err
	}
	s.TierIDs = tierIDs

	return &s, nil
}

func (r *PostgresRepository) gateIDsFor(staffID int) ([]int, error) {
	rows, err := r.db.Query(`SELECT gate_id FROM event_staff_gates WHERE event_staff_id = $1 ORDER BY gate_id`, staffID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := []int{}
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func (r *PostgresRepository) tierIDsFor(staffID int) ([]int, error) {
	rows, err := r.db.Query(`SELECT ticket_tier_id FROM event_staff_tiers WHERE event_staff_id = $1 ORDER BY ticket_tier_id`, staffID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := []int{}
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

// SetGates replaces the full gate grant set for a staff account in one
// transaction — the organizer console sends the desired final set, not deltas.
func (r *PostgresRepository) SetGates(staffID int, gateIDs []int) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM event_staff_gates WHERE event_staff_id = $1`, staffID); err != nil {
		return err
	}
	for _, gateID := range gateIDs {
		if _, err := tx.Exec(`INSERT INTO event_staff_gates (event_staff_id, gate_id) VALUES ($1, $2)`, staffID, gateID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *PostgresRepository) SetTiers(staffID int, tierIDs []int) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM event_staff_tiers WHERE event_staff_id = $1`, staffID); err != nil {
		return err
	}
	for _, tierID := range tierIDs {
		if _, err := tx.Exec(`INSERT INTO event_staff_tiers (event_staff_id, ticket_tier_id) VALUES ($1, $2)`, staffID, tierID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *PostgresRepository) SetStatus(id int, eventID int, status string) error {
	res, err := r.db.Exec(`UPDATE event_staff SET status = $1, updated_at = NOW() WHERE id = $2 AND event_id = $3`, status, id, eventID)
	if err != nil {
		return err
	}
	return checkRowAffected(res)
}

func (r *PostgresRepository) SetValidity(id int, eventID int, validFrom, validUntil time.Time) error {
	res, err := r.db.Exec(`UPDATE event_staff SET valid_from = $1, valid_until = $2, updated_at = NOW() WHERE id = $3 AND event_id = $4`, validFrom, validUntil, id, eventID)
	if err != nil {
		return err
	}
	return checkRowAffected(res)
}

func (r *PostgresRepository) UpdatePasswordHash(id int, passwordHash string) error {
	res, err := r.db.Exec(`UPDATE event_staff SET password_hash = $1, updated_at = NOW() WHERE id = $2`, passwordHash, id)
	if err != nil {
		return err
	}
	return checkRowAffected(res)
}

func (r *PostgresRepository) Delete(id int, eventID int) error {
	res, err := r.db.Exec(`DELETE FROM event_staff WHERE id = $1 AND event_id = $2`, id, eventID)
	if err != nil {
		return err
	}
	return checkRowAffected(res)
}

func (r *PostgresRepository) EventCodeExists(eventCode string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(`SELECT EXISTS (SELECT 1 FROM event_staff WHERE event_code = $1)`, eventCode).Scan(&exists)
	return exists, err
}

// GatesBelongToEvent verifies every gate ID belongs to eventID, preventing an
// organizer from granting a staff account access to another event's gate.
func (r *PostgresRepository) GatesBelongToEvent(eventID int, gateIDs []int) (bool, error) {
	if len(gateIDs) == 0 {
		return true, nil
	}
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM event_gates WHERE event_id = $1 AND id = ANY($2::int[])`, eventID, pqIntArray(gateIDs)).Scan(&count)
	if err != nil {
		return false, err
	}
	return count == len(uniqueInts(gateIDs)), nil
}

func (r *PostgresRepository) TiersBelongToEvent(eventID int, tierIDs []int) (bool, error) {
	if len(tierIDs) == 0 {
		return true, nil
	}
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM ticket_tiers WHERE event_id = $1 AND id = ANY($2::int[])`, eventID, pqIntArray(tierIDs)).Scan(&count)
	if err != nil {
		return false, err
	}
	return count == len(uniqueInts(tierIDs)), nil
}

func checkRowAffected(res sql.Result) error {
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func uniqueInts(ids []int) []int {
	seen := make(map[int]bool, len(ids))
	out := make([]int, 0, len(ids))
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			out = append(out, id)
		}
	}
	return out
}

// pqIntArray renders a Postgres integer array literal for use with = ANY($n).
func pqIntArray(ids []int) string {
	parts := make([]string, len(ids))
	for i, id := range ids {
		parts[i] = fmt.Sprintf("%d", id)
	}
	return "{" + strings.Join(parts, ",") + "}"
}
