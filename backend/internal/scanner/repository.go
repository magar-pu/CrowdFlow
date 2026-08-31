package scanner

import (
	"database/sql"
	"fmt"
	"time"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) FindTicketByID(ticketID string) (*ticketForCheckIn, error) {
	var t ticketForCheckIn
	err := r.db.QueryRow(`
		SELECT t.id::text, t.order_id::text, tt.event_id, tt.id, tt.name, t.ticket_status::text,
		       COALESCE(t.secret_key, ''), t.event_seats_matrix_id,
		       t.attendee_full_name, COALESCE(t.attendee_nik_enc, ''::bytea), COALESCE(t.attendee_phone, ''), t.attendee_dob
		FROM tickets t
		JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
		WHERE t.id::text = $1
	`, ticketID).Scan(
		&t.TicketID, &t.OrderID, &t.EventID, &t.TierID, &t.TierName, &t.TicketStatus,
		&t.SecretKey, &t.EventSeatsID,
		&t.AttendeeName, &t.AttendeeNikEnc, &t.AttendeePhone, &t.AttendeeDob,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *PostgresRepository) StaffHasTierGrant(staffID, tierID int) (bool, error) {
	var exists bool
	err := r.db.QueryRow(`SELECT EXISTS (SELECT 1 FROM event_staff_tiers WHERE event_staff_id = $1 AND ticket_tier_id = $2)`, staffID, tierID).Scan(&exists)
	return exists, err
}

func (r *PostgresRepository) StaffGateGrants(staffID int) ([]int, error) {
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

func (r *PostgresRepository) OriginalCheckIn(ticketID string) (time.Time, string, error) {
	var checkedAt time.Time
	var gateName string
	err := r.db.QueryRow(`
		SELECT tc.checked_in_at, COALESCE(eg.name, 'Unknown Gate')
		FROM ticket_checkins tc
		LEFT JOIN event_gates eg ON tc.gate_id = eg.id
		WHERE tc.ticket_id = $1 AND tc.status = 'VALID'
		ORDER BY tc.checked_in_at ASC LIMIT 1
	`, ticketID).Scan(&checkedAt, &gateName)
	return checkedAt, gateName, err
}

// SeatLabel resolves row + seat only — event_seats_matrix carries no
// section/zone relation any more (dropped by 0011_seat_tiering.sql; zones
// now live in venue_layouts.geometry JSONB, out of scope here).
func (r *PostgresRepository) SeatLabel(esmID int) (string, error) {
	var rowNumber, seatNumber string
	err := r.db.QueryRow(`
		SELECT s.row_number, s.seat_number
		FROM seats s
		JOIN event_seats_matrix esm ON esm.seat_id = s.id
		WHERE esm.id = $1
	`, esmID).Scan(&rowNumber, &seatNumber)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("Row %s, Seat %s", rowNumber, seatNumber), nil
}

func (r *PostgresRepository) GateName(gateID int) (string, error) {
	var name string
	err := r.db.QueryRow(`SELECT name FROM event_gates WHERE id = $1`, gateID).Scan(&name)
	return name, err
}

// MarkUsedAndInsertCheckin is the one transaction the frozen contract
// requires (section 3, step 7): the UPDATE and the INSERT are one atomic
// unit and BOTH errors are checked — the bug this replaces silently
// swallowed the insert failure with fmt.Printf while the ticket was already
// burned, producing a used ticket with no check-in record.
func (r *PostgresRepository) MarkUsedAndInsertCheckin(ticketID string, eventID int, gateID *int, staffID int) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`UPDATE tickets SET ticket_status = 'used', updated_at = NOW() WHERE id = $1`, ticketID); err != nil {
		return fmt.Errorf("failed to mark ticket used: %w", err)
	}

	if _, err := tx.Exec(`
		INSERT INTO ticket_checkins (ticket_id, event_id, gate_id, event_staff_id, status, checked_in_at)
		VALUES ($1, $2, $3, $4, 'VALID', NOW())
	`, ticketID, eventID, gateID, staffID); err != nil {
		return fmt.Errorf("failed to record check-in: %w", err)
	}

	return tx.Commit()
}

func (r *PostgresRepository) LogScan(staffID int, eventID int, action string, detail string) error {
	_, err := r.db.Exec(`
		INSERT INTO scanner_logs (event_staff_id, event_id, action, detail)
		VALUES ($1, $2, $3, $4)
	`, staffID, eventID, action, detail)
	return err
}

func (r *PostgresRepository) GetEventName(eventID int) (string, error) {
	var name string
	err := r.db.QueryRow("SELECT event_name FROM events WHERE id = $1", eventID).Scan(&name)
	return name, err
}

func (r *PostgresRepository) OwnScanLog(staffID int, limit int) ([]*ScanLogEntry, error) {
	rows, err := r.db.Query(`
		SELECT action, COALESCE(detail, ''), created_at
		FROM scanner_logs
		WHERE event_staff_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, staffID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := []*ScanLogEntry{}
	for rows.Next() {
		var e ScanLogEntry
		if err := rows.Scan(&e.Action, &e.Detail, &e.CreatedAt); err != nil {
			return nil, err
		}
		entries = append(entries, &e)
	}
	return entries, nil
}

func (r *PostgresRepository) GetDashboardStats(eventID int) (*DashboardResponse, error) {
	var eventName string
	err := r.db.QueryRow("SELECT event_name FROM events WHERE id = $1", eventID).Scan(&eventName)
	if err != nil {
		return nil, fmt.Errorf("event not found")
	}

	var totalChecked int
	_ = r.db.QueryRow("SELECT COUNT(*) FROM ticket_checkins WHERE event_id = $1 AND status = 'VALID'", eventID).Scan(&totalChecked)

	var totalCap int
	_ = r.db.QueryRow("SELECT COALESCE(SUM(allocation_limit), 0) FROM ticket_tiers WHERE event_id = $1", eventID).Scan(&totalCap)

	gateRows, err := r.db.Query(`
		SELECT eg.id, eg.name, eg.status, COALESCE(sub.cnt, 0) as scans
		FROM event_gates eg
		LEFT JOIN (
			SELECT gate_id, COUNT(*) as cnt FROM ticket_checkins WHERE event_id = $1 AND status = 'VALID' GROUP BY gate_id
		) sub ON sub.gate_id = eg.id
		WHERE eg.event_id = $1
		ORDER BY eg.id
	`, eventID)
	gateStats := []GateStat{}
	if err == nil {
		defer gateRows.Close()
		for gateRows.Next() {
			var gs GateStat
			gateRows.Scan(&gs.GateID, &gs.GateName, &gs.Status, &gs.Scans)
			gateStats = append(gateStats, gs)
		}
	}

	scanRows, err := r.db.Query(`
		SELECT tc.status, tc.checked_in_at,
		       COALESCE(t.attendee_full_name, 'Unknown'), COALESCE(tt.name, ''),
		       COALESCE(eg.name, 'Unknown Gate')
		FROM ticket_checkins tc
		LEFT JOIN tickets t ON tc.ticket_id = t.id
		LEFT JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
		LEFT JOIN event_gates eg ON tc.gate_id = eg.id
		WHERE tc.event_id = $1
		ORDER BY tc.checked_in_at DESC
		LIMIT 20
	`, eventID)
	recentScans := []RecentScanItem{}
	if err == nil {
		defer scanRows.Close()
		for scanRows.Next() {
			var rs RecentScanItem
			var checkedAt time.Time
			scanRows.Scan(&rs.Status, &checkedAt, &rs.AttendeeName, &rs.TicketType, &rs.GateName)
			rs.CheckedInAt = checkedAt.Format("15:04:05")
			recentScans = append(recentScans, rs)
		}
	}

	return &DashboardResponse{
		EventID:        eventID,
		EventName:      eventName,
		TotalCheckedIn: totalChecked,
		TotalCapacity:  totalCap,
		GateStats:      gateStats,
		RecentScans:    recentScans,
	}, nil
}

// ──────────── Gate CRUD ────────────

func (r *PostgresRepository) CreateGate(eventID int, name string) (*EventGate, error) {
	var g EventGate
	err := r.db.QueryRow(`
		INSERT INTO event_gates (event_id, name, status) VALUES ($1, $2, 'active') RETURNING id, event_id, name, status, created_at
	`, eventID, name).Scan(&g.ID, &g.EventID, &g.Name, &g.Status, &g.CreatedAt)
	return &g, err
}

func (r *PostgresRepository) ListGates(eventID int) ([]*EventGate, error) {
	rows, err := r.db.Query("SELECT id, event_id, name, status, created_at FROM event_gates WHERE event_id = $1 ORDER BY id", eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	gates := []*EventGate{}
	for rows.Next() {
		var g EventGate
		rows.Scan(&g.ID, &g.EventID, &g.Name, &g.Status, &g.CreatedAt)
		gates = append(gates, &g)
	}
	return gates, nil
}

func (r *PostgresRepository) DeleteGate(gateID int, eventID int) error {
	_, err := r.db.Exec("DELETE FROM event_gates WHERE id = $1 AND event_id = $2", gateID, eventID)
	return err
}
