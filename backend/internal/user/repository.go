package user

import (
	"database/sql"
)

type bankAccountRepository struct {
	db *sql.DB
}

func NewBankAccountRepository(db *sql.DB) BankAccountRepository {
	return &bankAccountRepository{db: db}
}

func (r *bankAccountRepository) GetByUserID(userID int) ([]*BankAccount, error) {
	query := `
		SELECT id, user_id, bank_name, account_number, account_holder_name, is_verified, verified_at, created_at, updated_at
		FROM user_bank_accounts
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []*BankAccount
	for rows.Next() {
		var acc BankAccount
		err := rows.Scan(
			&acc.ID,
			&acc.UserID,
			&acc.BankName,
			&acc.AccountNumber,
			&acc.AccountHolderName,
			&acc.IsVerified,
			&acc.VerifiedAt,
			&acc.CreatedAt,
			&acc.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		accounts = append(accounts, &acc)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return accounts, nil
}

func (r *bankAccountRepository) Create(account *BankAccount) error {
	query := `
		INSERT INTO user_bank_accounts (user_id, bank_name, account_number, account_holder_name, is_verified, verified_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`
	err := r.db.QueryRow(
		query,
		account.UserID,
		account.BankName,
		account.AccountNumber,
		account.AccountHolderName,
		account.IsVerified,
		account.VerifiedAt,
	).Scan(&account.ID, &account.CreatedAt, &account.UpdatedAt)

	if err != nil {
		return err
	}

	return nil
}
