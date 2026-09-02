package ticket

import (
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
)

func newTicketTestRepo(t *testing.T) (*PostgresRepository, sqlmock.Sqlmock) {
	t.Helper()
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return &PostgresRepository{db: db}, mock
}

// TestGenerateTicketsForPaidOrder_CommitsInventoryAtSettlement is the M6
// overselling fix itself: a seated attendee's seat must flip to 'sold' and a
// GA attendee's tier must gain tickets_sold, in the SAME transaction as the
// ticket rows, so a seat can never again read 'available' just because the
// Redis hold that protected it expired.
func TestGenerateTicketsForPaidOrder_CommitsInventoryAtSettlement(t *testing.T) {
	r, mock := newTicketTestRepo(t)
	orderID := "11111111-1111-1111-1111-111111111111"

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE orders SET status = 'paid'`).
		WithArgs(orderID).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM tickets WHERE order_id`).
		WithArgs(orderID).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	rows := sqlmock.NewRows([]string{
		"id", "ticket_tier_id", "event_seats_matrix_id",
		"full_name", "email", "nik_enc", "phone", "dob", "unit_price",
	}).
		AddRow("attendee-1", 5, 101, "Seated Buyer", "seated@example.com", []byte("nik1"), "0800", time.Now(), 100.0).
		AddRow("attendee-2", 7, nil, "GA Buyer", "ga@example.com", []byte("nik2"), "0801", time.Now(), 50.0)
	mock.ExpectQuery(`SELECT oa\.id::text`).
		WithArgs(orderID).
		WillReturnRows(rows)

	mock.ExpectExec(`INSERT INTO tickets`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`INSERT INTO tickets`).WillReturnResult(sqlmock.NewResult(0, 1))

	// The one seated attendee's event_seats_matrix_id (101) is what must be
	// marked sold - rendered as a Postgres array literal, per int64ArrayLiteral.
	mock.ExpectExec(`UPDATE event_seats_matrix`).
		WithArgs("{101}").
		WillReturnResult(sqlmock.NewResult(0, 1))
	// The one GA attendee's tier (7) gains exactly 1, not len(attendees) (2).
	mock.ExpectExec(`UPDATE ticket_tiers SET tickets_sold`).
		WithArgs(1, 7).
		WillReturnResult(sqlmock.NewResult(0, 1))

	mock.ExpectCommit()

	n, err := r.GenerateTicketsForPaidOrder(orderID)
	if err != nil {
		t.Fatalf("GenerateTicketsForPaidOrder: %v", err)
	}
	if n != 2 {
		t.Fatalf("got %d tickets issued, want 2", n)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

// TestGenerateTicketsForPaidOrder_DoubleWebhookIsIdempotent is the case
// payment/service.go:600 deliberately invites: Midtrans retries a webhook
// whose handler already succeeded, and the retry must not re-run the
// attendee loop or touch event_seats_matrix / ticket_tiers a second time.
// No INSERT or inventory-UPDATE expectation is registered below - sqlmock
// fails the call outright if the retry path attempts either, which is
// exactly what the existingCount > 0 early return exists to prevent.
func TestGenerateTicketsForPaidOrder_DoubleWebhookIsIdempotent(t *testing.T) {
	r, mock := newTicketTestRepo(t)
	orderID := "22222222-2222-2222-2222-222222222222"

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE orders SET status = 'paid'`).
		WithArgs(orderID).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM tickets WHERE order_id`).
		WithArgs(orderID).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))
	mock.ExpectCommit()

	n, err := r.GenerateTicketsForPaidOrder(orderID)
	if err != nil {
		t.Fatalf("GenerateTicketsForPaidOrder (retry): %v", err)
	}
	if n != 2 {
		t.Fatalf("retry returned %d, want the existing count 2", n)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations (retry touched something beyond the idempotency check): %v", err)
	}
}
