import { apiRequest } from '@/utils/api';
import { ApiResponse, User, VerificationApplication } from '@/types/admin';

export async function listUsers(limit?: number, offset?: number): Promise<ApiResponse<User[]>> {
  let query = "";
  const params = [];
  if (limit !== undefined) params.push(`limit=${limit}`);
  if (offset !== undefined) params.push(`offset=${offset}`);
  if (params.length > 0) {
    query = "?" + params.join("&");
  }
  return apiRequest<User[]>(`/api/v1/users${query}`, {
    method: "GET",
  });
}

export async function toggleUserStatus(
  userId: string,
  newStatus: "Verified" | "Suspended"
): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/users/${userId}/status`, {
    method: "POST",
    body: JSON.stringify({ status: newStatus }),
  });
}

export async function listVerifications(limit?: number, offset?: number): Promise<ApiResponse<VerificationApplication[]>> {
  let query = "";
  const params = [];
  if (limit !== undefined) params.push(`limit=${limit}`);
  if (offset !== undefined) params.push(`offset=${offset}`);
  if (params.length > 0) {
    query = "?" + params.join("&");
  }
  return apiRequest<VerificationApplication[]>(`/api/v1/users/verifications${query}`, {
    method: "GET",
  });
}

export async function approveVerification(appId: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/users/verifications/${appId}/approve`, {
    method: "POST",
  });
}

export async function rejectVerification(appId: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/users/verifications/${appId}/reject`, {
    method: "POST",
  });
}
