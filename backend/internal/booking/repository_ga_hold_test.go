package booking

import (
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func newBookingTestRepo(t *testing.T) (*PostgresRedisRepository, sqlmock.Sqlmock, *miniredis.Miniredis) {
	t.Helper()
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = client.Close() })

	return NewPostgresRedisRepository(db, client), mock, mr
}

// TestAcquireGAHold_SumsActiveHoldsAcrossCalls is the M6 Phase C fix: with no
// cached counter, remaining capacity is allocation_limit - tickets_sold
// (always read fresh) minus the live sum of other still-active GA holds.
func TestAcquireGAHold_SumsActiveHoldsAcrossCalls(t *testing.T) {
	r, mock, _ := newBookingTestRepo(t)

	expectRemaining := func(n int) {
		mock.ExpectQuery(`SELECT allocation_limit - tickets_sold FROM ticket_tiers WHERE id = \$1`).
			WithArgs(9).
			WillReturnRows(sqlmock.NewRows([]string{"remaining"}).AddRow(n))
	}

	// Base capacity is 5 for the whole test; each call re-reads it fresh.
	expectRemaining(5)
	ok, err := r.AcquireGAHold(9, 3, "hold-a", time.Minute)
	if err != nil || !ok {
		t.Fatalf("hold-a for 3: ok=%v err=%v", ok, err)
	}

	expectRemaining(5)
	ok, err = r.AcquireGAHold(9, 3, "hold-b", time.Minute)
	if err != nil {
		t.Fatalf("hold-b: %v", err)
	}
	if ok {
		t.Fatalf("hold-b for 3 should have been refused: only 2 left after hold-a's 3 of 5")
	}

	expectRemaining(5)
	ok, err = r.AcquireGAHold(9, 2, "hold-c", time.Minute)
	if err != nil || !ok {
		t.Fatalf("hold-c for the remaining 2: ok=%v err=%v", ok, err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

// TestAcquireGAHold_ExpiredHoldReturnsCapacity is Phase C's whole point: a GA
// hold that is never explicitly released (the buyer pays and the hold is
// simply left to lapse, same as a seat lock) must give its capacity back on
// its own once its TTL runs out - not leak it forever like the old counter.
func TestAcquireGAHold_ExpiredHoldReturnsCapacity(t *testing.T) {
	r, mock, mr := newBookingTestRepo(t)

	expectRemaining := func(n int) {
		mock.ExpectQuery(`SELECT allocation_limit - tickets_sold FROM ticket_tiers WHERE id = \$1`).
			WithArgs(4).
			WillReturnRows(sqlmock.NewRows([]string{"remaining"}).AddRow(n))
	}

	expectRemaining(2)
	ok, err := r.AcquireGAHold(4, 2, "hold-x", time.Second)
	if err != nil || !ok {
		t.Fatalf("hold-x: ok=%v err=%v", ok, err)
	}

	// Refused while hold-x is still live: all 2 units are taken.
	expectRemaining(2)
	ok, err = r.AcquireGAHold(4, 2, "hold-y", time.Minute)
	if err != nil {
		t.Fatalf("hold-y: %v", err)
	}
	if ok {
		t.Fatalf("hold-y should have been refused while hold-x is still active")
	}

	// No ReleaseGAHold call - hold-x's own key simply expires, the same way
	// an abandoned seat lock does.
	mr.FastForward(2 * time.Second)

	// The identical request that was just refused must now succeed: capacity
	// self-healed with no explicit release and no counter to reseed.
	expectRemaining(2)
	ok, err = r.AcquireGAHold(4, 2, "hold-z", time.Minute)
	if err != nil || !ok {
		t.Fatalf("hold-z after hold-x expired: ok=%v err=%v (capacity did not self-heal)", ok, err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

// TestReleaseGAHold_ReturnsCapacityImmediately covers the explicit-cancel
// path (buyer abandons checkout via DELETE /booking/holds/{token}): capacity
// must come back right away, not wait out the TTL.
func TestReleaseGAHold_ReturnsCapacityImmediately(t *testing.T) {
	r, mock, _ := newBookingTestRepo(t)

	expectRemaining := func(n int) {
		mock.ExpectQuery(`SELECT allocation_limit - tickets_sold FROM ticket_tiers WHERE id = \$1`).
			WithArgs(2).
			WillReturnRows(sqlmock.NewRows([]string{"remaining"}).AddRow(n))
	}

	expectRemaining(1)
	ok, err := r.AcquireGAHold(2, 1, "hold-1", time.Minute)
	if err != nil || !ok {
		t.Fatalf("hold-1: ok=%v err=%v", ok, err)
	}

	if err := r.ReleaseGAHold(2, "hold-1"); err != nil {
		t.Fatalf("ReleaseGAHold: %v", err)
	}

	expectRemaining(1)
	ok, err = r.AcquireGAHold(2, 1, "hold-2", time.Minute)
	if err != nil || !ok {
		t.Fatalf("hold-2 after release: ok=%v err=%v", ok, err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
