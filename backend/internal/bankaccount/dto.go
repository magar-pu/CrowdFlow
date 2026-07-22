package bankaccount

type AddBankAccountRequest struct {
	BankName          string `json:"bank_name"`
	AccountNumber     string `json:"account_number"`
	AccountHolderName string `json:"account_holder_name"`
}

type BankAccountResponse struct {
	ID                int    `json:"id"`
	BankName          string `json:"bank_name"`
	AccountNumber     string `json:"account_number"`
	AccountHolderName string `json:"account_holder_name"`
	IsVerified        bool   `json:"is_verified"`
}

func MapBankAccountToResponse(account *BankAccount) BankAccountResponse {
	return BankAccountResponse{
		ID:                account.ID,
		BankName:          account.BankName,
		AccountNumber:     account.AccountNumber,
		AccountHolderName: account.AccountHolderName,
		IsVerified:        account.IsVerified,
	}
}

func MapBankAccountsToResponse(accounts []*BankAccount) []BankAccountResponse {
	if accounts == nil {
		return []BankAccountResponse{}
	}
	var res []BankAccountResponse
	for _, acc := range accounts {
		res = append(res, MapBankAccountToResponse(acc))
	}
	return res
}
