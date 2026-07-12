package user

import (
	"time"
)

type bankAccountService struct {
	repo BankAccountRepository
}

func NewBankAccountService(repo BankAccountRepository) BankAccountService {
	return &bankAccountService{repo: repo}
}

func (s *bankAccountService) GetBankAccounts(userID int) ([]*BankAccount, error) {
	return s.repo.GetByUserID(userID)
}

func (s *bankAccountService) AddBankAccount(userID int, bankName, accountNumber, accountHolderName string) (*BankAccount, error) {
	now := time.Now()
	
	// Auto verify for now
	account := &BankAccount{
		UserID:            userID,
		BankName:          bankName,
		AccountNumber:     accountNumber,
		AccountHolderName: accountHolderName,
		IsVerified:        true,
		VerifiedAt:        &now,
	}

	err := s.repo.Create(account)
	if err != nil {
		return nil, err
	}

	return account, nil
}
