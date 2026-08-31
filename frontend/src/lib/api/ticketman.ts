import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";

export interface TicketmanGateGrant {
  id: number;
  name: string;
}

export interface TicketmanTierGrant {
  id: number;
  name: string;
}

export interface TicketmanSession {
  staffId: number;
  fullName: string;
  email: string;
  eventId: number;
  eventName: string;
  eventCode: string;
  grantedGates: TicketmanGateGrant[];
  grantedTiers: TicketmanTierGrant[];
}

export async function verifyTicketmanDevice(): Promise<ApiResponse<TicketmanSession>> {
  return apiRequest<TicketmanSession>("/api/ticketman/auth/verify-device", {
    method: "GET",
  });
}

export async function loginTicketman(body: {
  email: string;
  password: string;
  eventCode: string;
  turnstileToken: string;
}): Promise<ApiResponse<TicketmanSession>> {
  return apiRequest<TicketmanSession>("/api/ticketman/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function logoutTicketman(): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>("/api/ticketman/auth/logout", {
    method: "POST",
  });
}

export async function getTicketmanMe(): Promise<ApiResponse<TicketmanSession>> {
  return apiRequest<TicketmanSession>("/api/ticketman/auth/me", {
    method: "GET",
  });
}

// ──────────── Check-in (CF1 contract) ────────────

export interface TicketmanAttendee {
  fullName: string;
  nik: string;
  phone: string;
  dob: string;
}

export type TicketmanCheckInStatus =
  | "VALID"
  | "ALREADY_USED"
  | "WRONG_TIER"
  | "WRONG_EVENT"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED"
  | "INVALID";

export interface TicketmanCheckInResult {
  status: TicketmanCheckInStatus;
  ticketId?: string;
  orderId?: string;
  attendee: TicketmanAttendee | null;
  tierId?: number;
  tierName?: string;
  seatLabel?: string;
  checkInTime?: string;
  gateName?: string;
  message: string;
}

export async function ticketmanCheckIn(
  eventId: number,
  qrPayload: string,
  gateId: number | null
): Promise<ApiResponse<TicketmanCheckInResult>> {
  return apiRequest<TicketmanCheckInResult>(`/api/v1/scanner/checkin/${eventId}`, {
    method: "POST",
    body: JSON.stringify({ qr_payload: qrPayload, gate_id: gateId }),
  });
}

export async function ticketmanReject(
  eventId: number,
  ticketId: string,
  reason: string,
  note: string
): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/api/v1/scanner/checkin/${eventId}/reject`, {
    method: "POST",
    body: JSON.stringify({ ticket_id: ticketId, reason, note }),
  });
}

// ──────────── Dashboard / own log ────────────

export interface TicketmanGateStat {
  gateId: number;
  gateName: string;
  scans: number;
  status: string;
}

export interface TicketmanRecentScan {
  attendeeName: string;
  ticketType: string;
  gateName: string;
  status: string;
  checkedInAt: string;
}

export interface TicketmanDashboard {
  eventId: number;
  eventName: string;
  totalCheckedIn: number;
  totalCapacity: number;
  gateStats: TicketmanGateStat[];
  recentScans: TicketmanRecentScan[];
}

export async function getTicketmanDashboard(eventId: number): Promise<ApiResponse<TicketmanDashboard>> {
  return apiRequest<TicketmanDashboard>(`/api/v1/scanner/dashboard/${eventId}`, {
    method: "GET",
  });
}

export interface TicketmanScanLogEntry {
  action: string;
  detail: string;
  createdAt: string;
}

export async function getMyScanLog(): Promise<ApiResponse<TicketmanScanLogEntry[]>> {
  return apiRequest<TicketmanScanLogEntry[]>("/api/v1/scanner/my-log", {
    method: "GET",
  });
}
