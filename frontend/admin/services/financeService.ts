import { apiRequest } from "../utils/api";
import { ApiResponse, Transaction, Payout } from "../types";

export async function listTransactions(): Promise<ApiResponse<Transaction[]>> {
  return apiRequest<Transaction[]>("/api/v1/finance/transactions", {
    method: "GET",
  });
}

export async function listPayouts(): Promise<ApiResponse<Payout[]>> {
  return apiRequest<Payout[]>("/api/v1/finance/payouts", {
    method: "GET",
  });
}

export async function processPayout(payoutId: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/finance/payouts/${payoutId}/process`, {
    method: "POST",
  });
}

export async function rejectPayout(payoutId: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/finance/payouts/${payoutId}/reject`, {
    method: "POST",
  });
}

export async function updateTransactionStatus(
  txId: string,
  newStatus: "Success" | "Refunded"
): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/finance/transactions/${txId}/status`, {
    method: "POST",
    body: JSON.stringify({ status: newStatus }),
  });
}
