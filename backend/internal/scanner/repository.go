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

// ──────────── Check-In ────────────

func (r *PostgresRepository) CheckIn(eventID int, qrToken string, deviceID *int, gateID *int) (*CheckInResponse, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 1. Locate ticket
	var tID string
	var fullName, tierName, currentStatus string
	var esmID *int
	var ticketEventID int

	err = tx.QueryRow(`
		SELECT t.id::text, t.attendee_full_name, tt.name, t.ticket_status::text, t.event_seats_matrix_id, tt.event_id
		FROM tickets t
		JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
		WHERE t.qr_signature = $1 OR t.id::text = $1
	`, qrToken).Scan(&tID, &fullName, &tierName, &currentStatus, &esmID, &ticketEventID)
	if err != nil {
		return &CheckInResponse{Status: "INVALID", Message: "QR code not recognized"}, nil
	}

	// 2. Check event match
	if ticketEventID != eventID {
		// Get the actual event name for helpful error
		var wrongEventName string
		_ = r.db.QueryRow("SELECT event_name FROM events WHERE id = $1", ticketEventID).Scan(&wrongEventName)
		return &CheckInResponse{
			Status:  "WRONG_EVENT",
			Message: fmt.Sprintf("This ticket is for: %s", wrongEventName),
		}, nil
	}

	// 3. Check ticket status
	switch currentStatus {
	case "used":
		// Fetch original check-in details for duplicate info
		var checkedAt time.Time
		var gateName string
		err = r.db.QueryRow(`
			SELECT tc.checked_in_at, COALESCE(eg.name, 'Unknown Gate')
			FROM ticket_checkins tc
			LEFT JOIN event_gates eg ON tc.gate_id = eg.id
			WHERE tc.ticket_id = $1
			ORDER BY tc.checked_in_at ASC LIMIT 1
		`, tID).Scan(&checkedAt, &gateName)
		resp := &CheckInResponse{
			Status:       "ALREADY_USED",
			AttendeeName: fullName,
			TicketType:   tierName,
			Message:      "This ticket has already been scanned",
			CheckInTime:  checkedAt.Format("15:04:05"),
			GateName:     gateName,
		}
		if err != nil {
			resp.CheckInTime = "Unknown"
			resp.GateName = "Unknown"
		}
		// Log the duplicate attempt
		r.LogScan(deviceID, eventID, "ALREADY_USED", fmt.Sprintf("Duplicate scan for ticket %s (%s)", tID, fullName), "", 0)
		return resp, nil

	case "cancelled":
		return &CheckInResponse{Status: "CANCELLED", AttendeeName: fullName, Message: "This ticket has been cancelled"}, nil
	case "refunded":
		return &CheckInResponse{Status: "REFUNDED", AttendeeName: fullName, Message: "This ticket has been refunded"}, nil
	}

	// 4. Update ticket status to used
	_, err = tx.Exec("UPDATE tickets SET ticket_status = 'used', updated_at = NOW() WHERE id = $1", tID)
	if err != nil {
		return &CheckInResponse{Status: "SERVER_ERROR", Message: "Failed to process check-in"}, nil
	}

	// 5. Resolve seat label
	seatLabel := "General Seating"
	if esmID != nil {
		var secName, rowName string
		var seatNum int
		err = tx.QueryRow(`
			SELECT COALESCE(section_name, ''), COALESCE(row_name, ''), COALESCE(seat_number, 0)
			FROM event_seats_matrix WHERE id = $1
		`, *esmID).Scan(&secName, &rowName, &seatNum)
		if err == nil && seatNum > 0 {
			seatLabel = fmt.Sprintf("%s Row %s Seat %d", secName, rowName, seatNum)
		}
	}

	// 6. Record check-in in ticket_checkins
	_, err = tx.Exec(`
		INSERT INTO ticket_checkins (ticket_id, event_id, gate_id, scanner_device_id, status, checked_in_at)
		VALUES ($1, $2, $3, $4, 'VALID', NOW())
	`, tID, eventID, gateID, deviceID)
	if err != nil {
		// Non-fatal: log but continue
		fmt.Printf("Warning: failed to insert ticket_checkins: %v\n", err)
	}

	err = tx.Commit()
	if err != nil {
		return &CheckInResponse{Status: "SERVER_ERROR", Message: "Transaction commit failed"}, nil
	}

	// 7. Log successful scan
	r.LogScan(deviceID, eventID, "VALID", fmt.Sprintf("Check-in: %s (%s) - %s", fullName, tierName, seatLabel), "", 0)

	return &CheckInResponse{
		Status:       "VALID",
		AttendeeName: fullName,
		TicketType:   tierName,
		SeatNumber:   seatLabel,
		Message:      "Check-in successful",
		CheckInTime:  time.Now().Format("15:04:05"),
	}, nil
}

// ──────────── Event Info ────────────

func (r *PostgresRepository) GetEventInfo(eventID int) (string, error) {
	var name string
	err := r.db.QueryRow("SELECT event_name FROM events WHERE id = $1", eventID).Scan(&name)
	return name, err
}

// ──────────── Dashboard ────────────

func (r *PostgresRepository) GetDashboardStats(eventID int) (*DashboardResponse, error) {
	var eventName string
	err := r.db.QueryRow("SELECT event_name FROM events WHERE id = $1", eventID).Scan(&eventName)
	if err != nil {
		return nil, fmt.Errorf("event not found")
	}

	// Total checked-in
	var totalChecked int
	_ = r.db.QueryRow("SELECT COUNT(*) FROM ticket_checkins WHERE event_id = $1 AND status = 'VALID'", eventID).Scan(&totalChecked)

	// Total capacity
	var totalCap int
	_ = r.db.QueryRow("SELECT COALESCE(SUM(allocation_limit), 0) FROM ticket_tiers WHERE event_id = $1", eventID).Scan(&totalCap)

	// Gate stats
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

	// Recent scans
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

// ──────────── Device CRUD ────────────

func (r *PostgresRepository) RegisterDevice(eventID int, req *RegisterDeviceRequest, token string) (*ScannerDevice, error) {
	var d ScannerDevice
	role := req.Role
	if role == "" {
		role = "QR Scanner"
	}
	err := r.db.QueryRow(`
		INSERT INTO scanner_devices (event_id, gate_id, device_name, device_token, staff_name, role, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'online')
		RETURNING id, event_id, gate_id, device_name, device_token, staff_name, role, status, created_at
	`, eventID, req.GateID, req.DeviceName, token, req.StaffName, role).Scan(
		&d.ID, &d.EventID, &d.GateID, &d.DeviceName, &d.DeviceToken, &d.StaffName, &d.Role, &d.Status, &d.CreatedAt,
	)
	return &d, err
}

func (r *PostgresRepository) ListDevices(eventID int) ([]*ScannerDevice, error) {
	rows, err := r.db.Query(`
		SELECT sd.id, sd.event_id, sd.gate_id, sd.device_name, sd.device_token, COALESCE(sd.staff_name, ''), sd.role, sd.status, sd.created_at,
		       COALESCE(eg.name, 'Unassigned')
		FROM scanner_devices sd
		LEFT JOIN event_gates eg ON sd.gate_id = eg.id
		WHERE sd.event_id = $1
		ORDER BY sd.id
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	devices := []*ScannerDevice{}
	for rows.Next() {
		var d ScannerDevice
		rows.Scan(&d.ID, &d.EventID, &d.GateID, &d.DeviceName, &d.DeviceToken, &d.StaffName, &d.Role, &d.Status, &d.CreatedAt, &d.GateName)
		devices = append(devices, &d)
	}
	return devices, nil
}

func (r *PostgresRepository) DeleteDevice(deviceID int, eventID int) error {
	_, err := r.db.Exec("DELETE FROM scanner_devices WHERE id = $1 AND event_id = $2", deviceID, eventID)
	return err
}

func (r *PostgresRepository) GetDeviceByToken(token string) (*ScannerDevice, error) {
	var d ScannerDevice
	err := r.db.QueryRow(`
		SELECT sd.id, sd.event_id, sd.gate_id, sd.device_name, sd.device_token, COALESCE(sd.staff_name, ''), sd.role, sd.status, sd.created_at,
		       COALESCE(eg.name, 'Unassigned')
		FROM scanner_devices sd
		LEFT JOIN event_gates eg ON sd.gate_id = eg.id
		WHERE sd.device_token = $1
	`, token).Scan(&d.ID, &d.EventID, &d.GateID, &d.DeviceName, &d.DeviceToken, &d.StaffName, &d.Role, &d.Status, &d.CreatedAt, &d.GateName)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

// ──────────── Logs ────────────

func (r *PostgresRepository) LogScan(deviceID *int, eventID int, action string, detail string, ipAddress string, responseTimeMs int) error {
	_, err := r.db.Exec(`
		INSERT INTO scanner_logs (scanner_device_id, event_id, action, detail, ip_address, response_time_ms)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, deviceID, eventID, action, detail, ipAddress, responseTimeMs)
	return err
}
