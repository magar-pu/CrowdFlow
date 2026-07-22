package bankaccount

import (
	"encoding/json"
	"net/http"
	"strconv"

	"crowdflow-backend/internal/middleware"
	"crowdflow-backend/internal/response"
)

type BankAccountHandler struct {
	service BankAccountService
}

func NewBankAccountHandler(service BankAccountService) *BankAccountHandler {
	return &BankAccountHandler{service: service}
}

func (h *BankAccountHandler) RegisterRoutes(mux *http.ServeMux, auth func(http.Handler) http.Handler) {
	mux.Handle("GET /api/users/me/bank-accounts", auth(http.HandlerFunc(h.GetBankAccounts)))
	mux.Handle("POST /api/users/me/bank-accounts", auth(http.HandlerFunc(h.AddBankAccount)))
}

func (h *BankAccountHandler) GetBankAccounts(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User is not authenticated")
		return
	}

	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in token claims")
		return
	}

	accounts, err := h.service.GetBankAccounts(userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to retrieve bank accounts")
		return
	}

	response.JSON(w, http.StatusOK, MapBankAccountsToResponse(accounts))
}

func (h *BankAccountHandler) AddBankAccount(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "User is not authenticated")
		return
	}

	userID, err := strconv.Atoi(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user identifier in token claims")
		return
	}

	var req AddBankAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	// Basic validation
	if req.BankName == "" || req.AccountNumber == "" || req.AccountHolderName == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_FAILED", "All bank account fields are required")
		return
	}

	account, err := h.service.AddBankAccount(userID, req.BankName, req.AccountNumber, req.AccountHolderName)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to add bank account")
		return
	}

	response.JSON(w, http.StatusCreated, MapBankAccountToResponse(account))
}
