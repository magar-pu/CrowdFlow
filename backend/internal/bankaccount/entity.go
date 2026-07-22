package bankaccount

import (
	"time"
)

type BankAccount struct {
	ID                int        `json:"id"`
	UserID            int        `json:"user_id"`
	BankName          string     `json:"bank_name"`
	AccountNumber     string     `json:"account_number"`
	AccountHolderName string     `json:"account_holder_name"`
	IsVerified        bool       `json:"is_verified"`
	VerifiedAt        *time.Time `json:"verified_at"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type BankAccountRepository interface {
	GetByUserID(userID int) ([]*BankAccount, error)
	Create(account *BankAccount) error
}

type BankAccountService interface {
	GetBankAccounts(userID int) ([]*BankAccount, error)
	AddBankAccount(userID int, bankName, accountNumber, accountHolderName string) (*BankAccount, error)
}
