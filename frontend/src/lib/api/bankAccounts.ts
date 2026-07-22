import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";

export interface BankAccount {
  id: number;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  is_verified: boolean;
}

export interface AddBankAccountRequest {
  bank_name: string;
  account_number: string;
  account_holder_name: string;
}

export async function getBankAccounts(): Promise<ApiResponse<BankAccount[]>> {
  return apiRequest<BankAccount[]>("/api/users/me/bank-accounts", {
    method: "GET",
  });
}

export async function addBankAccount(
  req: AddBankAccountRequest
): Promise<ApiResponse<BankAccount>> {
  return apiRequest<BankAccount>("/api/users/me/bank-accounts", {
    method: "POST",
    body: JSON.stringify(req),
  });
}
