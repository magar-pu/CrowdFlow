import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";

export interface ScannerCheckInResult {
  status: string;       // VALID, ALREADY_USED, INVALID, WRONG_EVENT, REFUNDED, CANCELLED, EXPIRED
  attendeeName?: string;
  ticketType?: string;
  seatNumber?: string;
  message: string;
  checkInTime?: string;
  gateName?: string;
}

export interface ScannerStatus {
  eventId: number;
  eventName: string;
  status: string;
  totalGates: number;
  activeScanners: number;
}

export interface ScannerGateStat {
  gateId: number;
  gateName: string;
  scans: number;
  status: string;
}

export interface ScannerRecentScan {
  attendeeName: string;
  ticketType: string;
  gateName: string;
  status: string;
  checkedInAt: string;
}

export interface ScannerDashboard {
  eventId: number;
  eventName: string;
  totalCheckedIn: number;
  totalCapacity: number;
  gateStats: ScannerGateStat[];
  recentScans: ScannerRecentScan[];
}

export interface ScannerEventInfo {
  eventId: number;
  eventName: string;
}

/**
 * Perform ticket check-in verification.
 */
export async function checkInScannerAttendee(
  eventId: number,
  qrToken: string,
  deviceToken?: string
): Promise<ApiResponse<ScannerCheckInResult>> {
  return apiRequest<ScannerCheckInResult>(`/api/scanner/checkin/${eventId}`, {
    method: "POST",
    body: JSON.stringify({ qr_token: qrToken, device_token: deviceToken }),
  });
}

/**
 * Get operational status of scanners for the event.
 */
export async function getScannerStatus(eventId: number): Promise<ApiResponse<ScannerStatus>> {
  return apiRequest<ScannerStatus>(`/api/scanner/status/${eventId}`, {
    method: "GET",
  });
}

/**
 * Get live scanner check-in dashboard metrics.
 */
export async function getScannerDashboard(eventId: number): Promise<ApiResponse<ScannerDashboard>> {
  return apiRequest<ScannerDashboard>(`/api/scanner/dashboard/${eventId}`, {
    method: "GET",
  });
}

/**
 * Get basic event info (name, id) for standalone page.
 */
export async function getScannerEventInfo(eventId: number): Promise<ApiResponse<ScannerEventInfo>> {
  return apiRequest<ScannerEventInfo>(`/api/scanner/event/${eventId}`, {
    method: "GET",
  });
}

/**
 * List gates for an event.
 */
export async function listEventGates(eventId: number): Promise<ApiResponse<any[]>> {
  return apiRequest<any[]>(`/api/scanner/events/${eventId}/gates`, {
    method: "GET",
  });
}

/**
 * Create a new gate for an event.
 */
export async function createEventGate(eventId: number, name: string): Promise<ApiResponse<any>> {
  return apiRequest<any>(`/api/scanner/events/${eventId}/gates`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

/**
 * Delete a gate for an event.
 */
export async function deleteEventGate(eventId: number, gateId: number): Promise<ApiResponse<any>> {
  return apiRequest<any>(`/api/scanner/events/${eventId}/gates/${gateId}`, {
    method: "DELETE",
  });
}

/**
 * List scanner devices for an event.
 */
export async function listScannerDevices(eventId: number): Promise<ApiResponse<any[]>> {
  return apiRequest<any[]>(`/api/scanner/events/${eventId}/devices`, {
    method: "GET",
  });
}

/**
 * Register a new scanner device for an event.
 */
export async function registerScannerDevice(
  eventId: number,
  deviceName: string,
  gateId: number | null,
  staffName: string,
  role: string
): Promise<ApiResponse<any>> {
  return apiRequest<any>(`/api/scanner/events/${eventId}/devices`, {
    method: "POST",
    body: JSON.stringify({ deviceName, gateId, staffName, role }),
  });
}

/**
 * Delete a scanner device.
 */
export async function deleteScannerDevice(eventId: number, deviceId: number): Promise<ApiResponse<any>> {
  return apiRequest<any>(`/api/scanner/events/${eventId}/devices/${deviceId}`, {
    method: "DELETE",
  });
}

export interface VerifyDeviceResult {
  valid: boolean;
  device?: {
    id: number;
    eventId: number;
    gateId?: number;
    deviceName: string;
    deviceToken: string;
    staffName: string;
    role: string;
    status: string;
    gateName?: string;
  };
  message?: string;
}

/**
 * Verify a handheld device access code/token.
 */
export async function verifyScannerDevice(token: string): Promise<ApiResponse<VerifyDeviceResult>> {
  return apiRequest<VerifyDeviceResult>("/api/scanner/verify-device", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
