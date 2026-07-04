import { apiRequest } from "../utils/api";
import { ApiResponse, User, VerificationApplication } from "../types";

export async function listUsers(): Promise<ApiResponse<User[]>> {
  return apiRequest<User[]>("/api/v1/users", {
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

export async function listVerifications(): Promise<ApiResponse<VerificationApplication[]>> {
  return apiRequest<VerificationApplication[]>("/api/v1/users/verifications", {
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
