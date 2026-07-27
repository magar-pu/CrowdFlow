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

export type AnalyticsRange = '7d' | '30d' | '90d';

export interface AnalyticsPoint {
  label: string;
  revenue: number;
  registrations: number;
  events: number;
  ticketsSold: number;
}

// Each field is a summed orders column, never an assumed percentage.
export interface RevenueBreakdown {
  ticketFaceValue: number;
  platformFee: number;
  gatewayFee: number;
  entertainmentTax: number;
  grossTotal: number;
}

export interface PlatformAnalytics {
  range: AnalyticsRange;
  series: AnalyticsPoint[];
  breakdown: RevenueBreakdown;
}

export async function getPlatformAnalytics(range: AnalyticsRange): Promise<ApiResponse<PlatformAnalytics>> {
  return apiRequest<PlatformAnalytics>(`/api/v1/admin/dashboard/analytics?range=${range}`, {
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
