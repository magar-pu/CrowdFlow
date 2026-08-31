package ticketman

import "database/sql"

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) GetByEventCode(eventCode string) (*staffAuthRow, error) {
	var row staffAuthRow
	err := r.db.QueryRow(`
		SELECT es.id, es.event_id, e.event_name, es.full_name, es.email, es.password_hash, es.status, es.valid_from, es.valid_until
		FROM event_staff es
		JOIN events e ON e.id = es.event_id
		WHERE es.event_code = $1
	`, eventCode).Scan(&row.ID, &row.EventID, &row.EventName, &row.FullName, &row.Email, &row.PasswordHash, &row.Status, &row.ValidFrom, &row.ValidUntil)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *PostgresRepository) GetSessionInfo(staffID int) (*SessionInfo, error) {
	var info SessionInfo
	err := r.db.QueryRow(`
		SELECT es.id, es.full_name, es.email, es.event_id, e.event_name, es.event_code
		FROM event_staff es
		JOIN events e ON e.id = es.event_id
		WHERE es.id = $1
	`, staffID).Scan(&info.StaffID, &info.FullName, &info.Email, &info.EventID, &info.EventName, &info.EventCode)
	if err != nil {
		return nil, err
	}

	gates, err := r.staffGateGrants(staffID)
	if err != nil {
		return nil, err
	}
	info.GrantedGates = gates

	tiers, err := r.staffTierGrants(staffID)
	if err != nil {
		return nil, err
	}
	info.GrantedTiers = tiers

	return &info, nil
}

func (r *PostgresRepository) staffGateGrants(staffID int) ([]GateGrant, error) {
	rows, err := r.db.Query(`
		SELECT eg.id, eg.name
		FROM event_staff_gates esg
		JOIN event_gates eg ON eg.id = esg.gate_id
		WHERE esg.event_staff_id = $1
		ORDER BY eg.name
	`, staffID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	grants := []GateGrant{}
	for rows.Next() {
		var g GateGrant
		if err := rows.Scan(&g.ID, &g.Name); err != nil {
			return nil, err
		}
		grants = append(grants, g)
	}
	return grants, rows.Err()
}

func (r *PostgresRepository) staffTierGrants(staffID int) ([]TierGrant, error) {
	rows, err := r.db.Query(`
		SELECT tt.id, tt.name
		FROM event_staff_tiers est
		JOIN ticket_tiers tt ON tt.id = est.ticket_tier_id
		WHERE est.event_staff_id = $1
		ORDER BY tt.name
	`, staffID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	grants := []TierGrant{}
	for rows.Next() {
		var t TierGrant
		if err := rows.Scan(&t.ID, &t.Name); err != nil {
			return nil, err
		}
		grants = append(grants, t)
	}
	return grants, rows.Err()
}
