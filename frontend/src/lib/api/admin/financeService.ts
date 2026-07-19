import { apiRequest } from '@/utils/api';
import { ApiResponse, Transaction, Payout } from '@/types/admin';

export async function listTransactions(limit?: number, offset?: number): Promise<ApiResponse<Transaction[]>> {
  let query = "";
  const params = [];
  if (limit !== undefined) params.push(`limit=${limit}`);
  if (offset !== undefined) params.push(`offset=${offset}`);
  if (params.length > 0) {
    query = "?" + params.join("&");
  }
  return apiRequest<Transaction[]>(`/api/v1/admin/finance/transactions${query}`, {
    method: "GET",
  });
}

export async function listPayouts(limit?: number, offset?: number): Promise<ApiResponse<Payout[]>> {
  let query = "";
  const params = [];
  if (limit !== undefined) params.push(`limit=${limit}`);
  if (offset !== undefined) params.push(`offset=${offset}`);
  if (params.length > 0) {
    query = "?" + params.join("&");
  }
  return apiRequest<Payout[]>(`/api/v1/admin/finance/payouts${query}`, {
    method: "GET",
  });
}

export async function processPayout(payoutId: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/admin/finance/payouts/${payoutId}/process`, {
    method: "POST",
  });
}

export async function rejectPayout(payoutId: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/admin/finance/payouts/${payoutId}/reject`, {
    method: "POST",
  });
}

export async function updateTransactionStatus(
  txId: string,
  newStatus: "Success" | "Refunded"
): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/admin/finance/transactions/${txId}/status`, {
    method: "POST",
    body: JSON.stringify({ status: newStatus }),
  });
}
