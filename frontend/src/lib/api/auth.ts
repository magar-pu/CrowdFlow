import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";
import { AuthUser } from "@/lib/store/authStore";

export interface ProfileStats {
  total_tickets: number;
  events_attended: number;
  saved_events: number;
  total_orders: number;
}

export interface ProfileEventSummary {
  event_id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  cover_image_url: string;
  status: string;
}

export interface UserProfileResponse {
  user_id: string;
  email: string;
  full_name: string;
  phone_number: string;
  location: string;
  bio: string;
  avatar_url: string;
  role: string;
  member_since: string;
  stats: ProfileStats;
  events: ProfileEventSummary[];
}

export async function loginUser(body: any): Promise<ApiResponse<AuthUser>> {
  return apiRequest<AuthUser>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function registerUser(body: any): Promise<ApiResponse<void>> {
  return apiRequest<void>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function logoutUser(): Promise<ApiResponse<void>> {
  return apiRequest<void>("/api/v1/auth/logout", {
    method: "POST",
  });
}

export async function getMe(): Promise<ApiResponse<UserProfileResponse>> {
  return apiRequest<UserProfileResponse>("/api/v1/auth/me", {
    method: "GET",
  });
}

export async function updateProfile(body: {
  full_name: string;
  phone_number: string;
  location: string;
  bio: string;
}): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>("/api/v1/auth/me", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}



