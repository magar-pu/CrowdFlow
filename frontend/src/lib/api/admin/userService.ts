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
  return apiRequest<User[]>(`/api/v1/admin/users${query}`, {
    method: "GET",
  });
}

export async function toggleUserStatus(
  userId: string,
  newStatus: "Verified" | "Suspended"
): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/admin/users/${userId}/status`, {
    method: "POST",
    body: JSON.stringify({ status: newStatus }),
  });
}

// grantUserRole assigns a role to a user. eventId scopes event-bound roles
// (Auditor, Gate Scanner) to one event; pass null/undefined for platform-wide
// roles (Super Admin, Event Organizer). Maps to POST /admin/users/{id}/roles.
export async function grantUserRole(
  userId: string,
  roleId: number,
  eventId?: number | null
): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/admin/users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify({ role_id: roleId, event_id: eventId ?? null }),
  });
}

// revokeUserRole removes a role assignment. eventId must match the scope the
// role was granted with (the same event, or null for a platform-wide grant).
// Maps to DELETE /admin/users/{id}/roles.
export async function revokeUserRole(
  userId: string,
  roleId: number,
  eventId?: number | null
): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/admin/users/${userId}/roles`, {
    method: "DELETE",
    body: JSON.stringify({ role_id: roleId, event_id: eventId ?? null }),
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
  return apiRequest<VerificationApplication[]>(`/api/v1/admin/users/verifications${query}`, {
    method: "GET",
  });
}

export async function approveVerification(appId: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/admin/users/verifications/${appId}/approve`, {
    method: "POST",
  });
}

export async function rejectVerification(appId: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/admin/users/verifications/${appId}/reject`, {
    method: "POST",
  });
}
