import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";
import { AuthUser } from "@/lib/store/authStore";

export async function loginUser(body: any): Promise<ApiResponse<AuthUser>> {
  return apiRequest<AuthUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function registerUser(body: any): Promise<ApiResponse<void>> {
  return apiRequest<void>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function logoutUser(): Promise<ApiResponse<void>> {
  return apiRequest<void>("/api/auth/logout", {
    method: "POST",
  });
}
