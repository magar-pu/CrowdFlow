package delegation

import (
	"context"
	"database/sql"
	"errors"
	"strconv"
	"strings"
	"time"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

const delegationSelectBase = `
	SELECT
		d.id, d.owner_id, d.delegate_id, d.scope, d.status,
		d.requested_by, d.approved_by, d.note,
		d.created_at, d.decided_at, d.updated_at,
		COALESCE(op.full_name, ow.email) AS owner_name, ow.email AS owner_email,
		COALESCE(dp.full_name, dl.email) AS delegate_name, dl.email AS delegate_email
	FROM organizer_delegations d
	JOIN users ow ON ow.id = d.owner_id
	LEFT JOIN user_profiles op ON op.user_id = d.owner_id
	JOIN users dl ON dl.id = d.delegate_id
	LEFT JOIN user_profiles dp ON dp.user_id = d.delegate_id
`

func scanDelegation(row interface{ Scan(...any) error }) (*Delegation, error) {
	var d Delegation
	err := row.Scan(
		&d.ID, &d.OwnerID, &d.DelegateID, &d.Scope, &d.Status,
		&d.RequestedBy, &d.ApprovedBy, &d.Note,
		&d.CreatedAt, &d.DecidedAt, &d.UpdatedAt,
		&d.OwnerName, &d.OwnerEmail, &d.DelegateName, &d.DelegateEmail,
	)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

// Upsert inserts a new delegation, or reactivates the existing (owner, delegate) row
// on conflict, then rewrites the covered events for scope='specific'.
func (r *PostgresRepository) Upsert(ctx context.Context, d *Delegation, eventIDs []int) (int, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var id int
	err = tx.QueryRowContext(ctx, `
		INSERT INTO organizer_delegations
			(owner_id, delegate_id, scope, status, requested_by, approved_by, note, decided_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
		ON CONFLICT (owner_id, delegate_id) DO UPDATE SET
			scope        = EXCLUDED.scope,
			status       = EXCLUDED.status,
			requested_by = EXCLUDED.requested_by,
			approved_by  = EXCLUDED.approved_by,
			note         = EXCLUDED.note,
			decided_at   = EXCLUDED.decided_at,
			updated_at   = now()
		RETURNING id
	`, d.OwnerID, d.DelegateID, d.Scope, d.Status, d.RequestedBy, d.ApprovedBy, d.Note, d.DecidedAt).Scan(&id)
	if err != nil {
		return 0, err
	}

	// Replace covered events. scope='all' carries no rows.
	if _, err = tx.ExecContext(ctx, `DELETE FROM organizer_delegation_events WHERE delegation_id = $1`, id); err != nil {
		return 0, err
	}
	if d.Scope == ScopeSpecific {
		for _, evID := range eventIDs {
			if _, err = tx.ExecContext(ctx,
				`INSERT INTO organizer_delegation_events (delegation_id, event_id) VALUES ($1, $2)`,
				id, evID); err != nil {
				return 0, err
			}
		}
	}

	if err = tx.Commit(); err != nil {
		return 0, err
	}
	return id, nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id int) (*Delegation, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	d, err := scanDelegation(r.db.QueryRowContext(ctx, delegationSelectBase+` WHERE d.id = $1`, id))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if err := r.loadEvents(ctx, []*Delegation{d}); err != nil {
		return nil, err
	}
	return d, nil
}

func (r *PostgresRepository) GetByOwnerAndDelegate(ctx context.Context, ownerID, delegateID int) (*Delegation, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	d, err := scanDelegation(r.db.QueryRowContext(ctx,
		delegationSelectBase+` WHERE d.owner_id = $1 AND d.delegate_id = $2`, ownerID, delegateID))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return d, nil
}

func (r *PostgresRepository) ListByOwner(ctx context.Context, ownerID int) ([]*Delegation, error) {
	return r.list(ctx, `WHERE d.owner_id = $1 ORDER BY d.created_at DESC`, ownerID)
}

func (r *PostgresRepository) ListByDelegate(ctx context.Context, delegateID int) ([]*Delegation, error) {
	return r.list(ctx, `WHERE d.delegate_id = $1 ORDER BY d.created_at DESC`, delegateID)
}

func (r *PostgresRepository) list(ctx context.Context, where string, arg int) ([]*Delegation, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, delegationSelectBase+where, arg)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*Delegation{}
	for rows.Next() {
		d, err := scanDelegation(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := r.loadEvents(ctx, out); err != nil {
		return nil, err
	}
	return out, nil
}

// loadEvents populates Events for every scope='specific' delegation in one query.
func (r *PostgresRepository) loadEvents(ctx context.Context, ds []*Delegation) error {
	byID := map[int]*Delegation{}
	var ids []string
	for _, d := range ds {
		if d.Scope == ScopeSpecific {
			byID[d.ID] = d
			ids = append(ids, strconv.Itoa(d.ID))
		}
		d.Events = []DelegationEvent{}
	}
	if len(ids) == 0 {
		return nil
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT de.delegation_id, e.id, e.event_name
		FROM organizer_delegation_events de
		JOIN events e ON e.id = de.event_id
		WHERE de.delegation_id IN (`+strings.Join(ids, ",")+`)
		ORDER BY e.event_name
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var delID int
		var ev DelegationEvent
		if err := rows.Scan(&delID, &ev.EventID, &ev.Name); err != nil {
			return err
		}
		if d, ok := byID[delID]; ok {
			d.Events = append(d.Events, ev)
		}
	}
	return rows.Err()
}

func (r *PostgresRepository) UpdateStatus(ctx context.Context, id int, status string, approvedBy *int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	res, err := r.db.ExecContext(ctx, `
		UPDATE organizer_delegations
		SET status = $2, approved_by = $3, decided_at = now(), updated_at = now()
		WHERE id = $1
	`, id, status, approvedBy)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PostgresRepository) UpdateScope(ctx context.Context, id int, scope string, eventIDs []int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(ctx,
		`UPDATE organizer_delegations SET scope = $2, updated_at = now() WHERE id = $1`, id, scope)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}

	if _, err = tx.ExecContext(ctx, `DELETE FROM organizer_delegation_events WHERE delegation_id = $1`, id); err != nil {
		return err
	}
	if scope == ScopeSpecific {
		for _, evID := range eventIDs {
			if _, err = tx.ExecContext(ctx,
				`INSERT INTO organizer_delegation_events (delegation_id, event_id) VALUES ($1, $2)`,
				id, evID); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

func (r *PostgresRepository) FindUserByEmail(ctx context.Context, email string) (int, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var id int
	err := r.db.QueryRowContext(ctx,
		`SELECT id FROM users WHERE lower(email) = lower($1)`, strings.TrimSpace(email)).Scan(&id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, ErrUserNotFound
		}
		return 0, err
	}
	return id, nil
}

func (r *PostgresRepository) UserExists(ctx context.Context, id int) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var exists bool
	err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, id).Scan(&exists)
	return exists, err
}

// IsVerifiedOrganizer reports whether the user holds the platform-wide Event
// Organizer role (event_id IS NULL) -- the D1 gate for delegates.
func (r *PostgresRepository) IsVerifiedOrganizer(ctx context.Context, userID int) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM user_roles ur
			JOIN roles r ON r.id = ur.role_id
			WHERE ur.user_id = $1 AND ur.event_id IS NULL AND r.role_name = 'Event Organizer'
		)`, userID).Scan(&exists)
	return exists, err
}

// EventsOwnedBy reports whether every event in eventIDs belongs to ownerID.
func (r *PostgresRepository) EventsOwnedBy(ctx context.Context, ownerID int, eventIDs []int) (bool, error) {
	if len(eventIDs) == 0 {
		return true, nil
	}
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	ids := make([]string, len(eventIDs))
	for i, id := range eventIDs {
		ids[i] = strconv.Itoa(id)
	}
	var count int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM events
		WHERE organizer_id = $1 AND id IN (`+strings.Join(ids, ",")+`)
	`, ownerID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count == len(eventIDs), nil
}

// DelegateAuditsCovered reports whether delegateID holds an event-scoped Auditor
// role on any event the delegation covers. scope='specific' checks eventIDs;
// scope='all' checks every current event owned by ownerID.
func (r *PostgresRepository) DelegateAuditsCovered(ctx context.Context, delegateID, ownerID int, scope string, eventIDs []int) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var exists bool
	if scope == ScopeAll {
		err := r.db.QueryRowContext(ctx, `
			SELECT EXISTS (
				SELECT 1 FROM user_roles ur
				JOIN roles r ON r.id = ur.role_id
				JOIN events e ON e.id = ur.event_id
				WHERE ur.user_id = $1 AND e.organizer_id = $2 AND r.role_name = 'Auditor'
			)`, delegateID, ownerID).Scan(&exists)
		return exists, err
	}

	if len(eventIDs) == 0 {
		return false, nil
	}
	ids := make([]string, len(eventIDs))
	for i, id := range eventIDs {
		ids[i] = strconv.Itoa(id)
	}
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM user_roles ur
			JOIN roles r ON r.id = ur.role_id
			WHERE ur.user_id = $1 AND r.role_name = 'Auditor'
			  AND ur.event_id IN (`+strings.Join(ids, ",")+`)
		)`, delegateID).Scan(&exists)
	return exists, err
}

func (r *PostgresRepository) Notify(ctx context.Context, userID int, title, detail string, delegationID int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO notifications (user_id, title, detail, resource_type, resource_id, is_read, created_at)
		VALUES ($1, $2, $3, 'delegation', $4, FALSE, now())
	`, userID, title, detail, strconv.Itoa(delegationID))
	return err
}
