import { apiRequest } from '@/utils/api';
import { ApiResponse, SecurityAlert, Activity } from '@/types/admin';

export interface DashboardStats {
  totalEvents: number;
  totalUsers: number;
  totalRevenue: number;
  ticketsSold: number;
}

export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  return apiRequest<DashboardStats>("/api/v1/admin/dashboard/stats", {
    method: "GET",
  });
}

export async function listSecurityAlerts(): Promise<ApiResponse<SecurityAlert[]>> {
  return apiRequest<SecurityAlert[]>("/api/v1/admin/dashboard/alerts", {
    method: "GET",
  });
}

export async function listSystemActivities(): Promise<ApiResponse<Activity[]>> {
  return apiRequest<Activity[]>("/api/v1/admin/dashboard/activities", {
    method: "GET",
  });
}
