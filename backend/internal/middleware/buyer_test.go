package middleware

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

func newBuyerTestMiddleware(t *testing.T) (*AuthMiddleware, sqlmock.Sqlmock) {
	t.Helper()
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return &AuthMiddleware{db: db}, mock
}

func requestWithClaims(claims *UserClaims) *http.Request {
	r := httptest.NewRequest(http.MethodPost, "/booking/holds", nil)
	if claims != nil {
		r = r.WithContext(context.WithValue(r.Context(), UserContextKey, claims))
	}
	return r
}

func callRequireBuyer(t *testing.T, m *AuthMiddleware, r *http.Request) *httptest.ResponseRecorder {
	t.Helper()
	called := false
	handler := m.RequireBuyer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	if w.Code == http.StatusOK && !called {
		t.Fatalf("recorder reports 200 but inner handler was never invoked")
	}
	return w
}

func TestRequireBuyer_AllowsUserRole(t *testing.T) {
	m, mock := newBuyerTestMiddleware(t)
	mock.ExpectQuery(`SELECT EXISTS`).
		WithArgs(42, BuyerRoleName).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	w := callRequireBuyer(t, m, requestWithClaims(&UserClaims{UserID: "42", Roles: []string{"User"}}))

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for a User-role account, got %d: %s", w.Code, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestRequireBuyer_DeniesOrganizer(t *testing.T) {
	m, mock := newBuyerTestMiddleware(t)
	mock.ExpectQuery(`SELECT EXISTS`).
		WithArgs(7, BuyerRoleName).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))

	w := callRequireBuyer(t, m, requestWithClaims(&UserClaims{UserID: "7", Roles: []string{"Event Organizer"}}))

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for an organizer account, got %d", w.Code)
	}
	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err == nil && body.Error.Code != ErrCodeBuyerRoleRequired {
		t.Fatalf("expected error code %q, got %q (raw body: %s)", ErrCodeBuyerRoleRequired, body.Error.Code, w.Body.String())
	}
}

// This is the regression guard for the exact trap RequireBuyer was built to
// avoid: RequirePlatformRole auto-passes any account carrying "Super Admin"
// before it looks at anything else, which would exempt precisely the account
// class this rule exists to block. RequireBuyer must read the DB role and
// deny a Super Admin who does not hold the platform "User" row, regardless
// of what their JWT claims say.
func TestRequireBuyer_DeniesSuperAdmin(t *testing.T) {
	m, mock := newBuyerTestMiddleware(t)
	mock.ExpectQuery(`SELECT EXISTS`).
		WithArgs(1, BuyerRoleName).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))

	w := callRequireBuyer(t, m, requestWithClaims(&UserClaims{UserID: "1", Roles: []string{"Super Admin"}}))

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for a Super Admin without the DB-level User role, got %d", w.Code)
	}
}

func TestRequireBuyer_DeniesMissingClaims(t *testing.T) {
	m, _ := newBuyerTestMiddleware(t)

	w := callRequireBuyer(t, m, requestWithClaims(nil))

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 with no claims in context, got %d", w.Code)
	}
}

func TestRequireBuyer_DeniesOnDatabaseError(t *testing.T) {
	m, mock := newBuyerTestMiddleware(t)
	mock.ExpectQuery(`SELECT EXISTS`).
		WithArgs(9, BuyerRoleName).
		WillReturnError(sql.ErrConnDone)

	w := callRequireBuyer(t, m, requestWithClaims(&UserClaims{UserID: "9", Roles: []string{"User"}}))

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected fail-closed 500 on a database error, got %d", w.Code)
	}
}
