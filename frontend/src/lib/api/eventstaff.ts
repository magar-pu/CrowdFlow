import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";

export interface EventStaffMember {
  id: number;
  eventId: number;
  eventCode: string;
  fullName: string;
  email: string;
  status: "active" | "suspended" | "revoked";
  validFrom: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
  gateIds: number[];
  tierIds: number[];
}

export interface CreateStaffRequest {
  fullName: string;
  email: string;
  gateIds: number[];
  tierIds: number[];
  validFrom: string;
  validUntil: string;
}

export interface CreateStaffResponse {
  staff: EventStaffMember;
  email: string;
  password: string;
  eventCode: string;
}

export interface ResetCredentialsResponse {
  email: string;
  password: string;
}

export async function listEventStaff(eventId: number): Promise<ApiResponse<EventStaffMember[]>> {
  return apiRequest<EventStaffMember[]>(`/api/organizer/events/${eventId}/staff`, {
    method: "GET",
  });
}

export async function createEventStaff(
  eventId: number,
  req: CreateStaffRequest
): Promise<ApiResponse<CreateStaffResponse>> {
  return apiRequest<CreateStaffResponse>(`/api/organizer/events/${eventId}/staff`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function updateStaffGrants(
  eventId: number,
  staffId: number,
  gateIds: number[],
  tierIds: number[]
): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/api/organizer/events/${eventId}/staff/${staffId}/grants`, {
    method: "PUT",
    body: JSON.stringify({ gateIds, tierIds }),
  });
}

export async function updateStaffStatus(
  eventId: number,
  staffId: number,
  status: "active" | "suspended" | "revoked"
): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/api/organizer/events/${eventId}/staff/${staffId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function updateStaffValidity(
  eventId: number,
  staffId: number,
  validFrom: string,
  validUntil: string
): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/api/organizer/events/${eventId}/staff/${staffId}/validity`, {
    method: "PUT",
    body: JSON.stringify({ validFrom, validUntil }),
  });
}

export async function resetStaffCredentials(
  eventId: number,
  staffId: number
): Promise<ApiResponse<ResetCredentialsResponse>> {
  return apiRequest<ResetCredentialsResponse>(`/api/organizer/events/${eventId}/staff/${staffId}/reset-credentials`, {
    method: "POST",
  });
}

export async function deleteEventStaff(
  eventId: number,
  staffId: number
): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/api/organizer/events/${eventId}/staff/${staffId}`, {
    method: "DELETE",
  });
}
