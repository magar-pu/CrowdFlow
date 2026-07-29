import { apiRequest } from '@/utils/api';
import { ApiResponse } from '@/types/admin';

// Same shape as AuditorNotification (lib/api/auditor.ts) - both consoles read
// the same `notifications` table, and Super Admins already receive the rows
// written for auditors.
export interface AdminNotification {
  id: number;
  userId: number;
  title: string;
  detail: string;
  resourceType: string;
  resourceId: string;
  isRead: boolean;
  createdAt: string;
}

export async function listAdminNotifications(): Promise<ApiResponse<AdminNotification[]>> {
  return apiRequest<AdminNotification[]>("/api/v1/admin/notifications", {
    method: "GET",
  });
}

// Omitting notificationIds marks every unread notification read.
export async function markAdminNotificationsRead(
  notificationIds?: number[],
): Promise<ApiResponse<void>> {
  return apiRequest<void>("/api/v1/admin/notifications/read", {
    method: "PUT",
    body: notificationIds ? JSON.stringify({ notificationIds }) : undefined,
  });
}
