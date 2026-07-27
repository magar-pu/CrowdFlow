import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";

export interface UserTicket {
  id: string;
  orderId: string;
  eventId: number;
  eventName: string;
  ticketTierId: number;
  tierName: string;
  attendeeFullName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  attendeeNik?: string;
  ticketStatus: string;
  seatLabel: string;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketQRResponse {
  ticketId: string;
  secureToken: string;
  timeWindow: number;
  refreshInSeconds: number;
  expiredAt: string;
}

export interface MyTicketsListResponse {
  tickets: UserTicket[];
  count: number;
}

/**
 * Fetch all tickets owned by the current authenticated user.
 */
export async function getMyTickets(): Promise<ApiResponse<MyTicketsListResponse>> {
  return apiRequest<MyTicketsListResponse>("/api/v1/my-tickets", {
    method: "GET",
  });
}

/**
 * Fetch active 10-minute dynamic QR token for a specific ticket.
 */
export async function getTicketQR(ticketId: string): Promise<ApiResponse<TicketQRResponse>> {
  return apiRequest<TicketQRResponse>(`/api/v1/tickets/${ticketId}/qr`, {
    method: "GET",
  });
}

/**
 * Complete payment and generate tickets for an order.
 */
export async function completeOrderPayment(orderId: string): Promise<ApiResponse<any>> {
  return apiRequest<any>("/api/v1/orders/complete-payment", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}

export interface TicketVaultDataResponse {
  ticketId: string;
  eventId: number;
  eventName: string;
  tierName: string;
  attendeeFullName: string;
  attendeeEmail: string;
  seatLabel: string;
  ticketStatus: string;
  secretKey: string;
  eventEndTime: string;
}

/**
 * Request OTP via email for high-friction ticket vault access
 */
export async function requestTicketOTP(ticketId: string, email?: string): Promise<ApiResponse<{ message: string; debugOtp?: string }>> {
  return apiRequest<{ message: string; debugOtp?: string }>(`/api/v1/tickets/${ticketId}/request-otp`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/**
 * Verify OTP code for ticket vault access
 */
export async function verifyTicketOTP(ticketId: string, otpCode: string, email?: string): Promise<ApiResponse<{ verified: boolean; vaultToken: string; message: string }>> {
  return apiRequest<{ verified: boolean; vaultToken: string; message: string }>(`/api/v1/tickets/${ticketId}/verify-otp`, {
    method: "POST",
    body: JSON.stringify({ otpCode, email }),
  });
}

/**
 * Fetch secret key & metadata to vault ticket offline
 */
export async function getTicketVaultData(ticketId: string): Promise<ApiResponse<TicketVaultDataResponse>> {
  return apiRequest<TicketVaultDataResponse>(`/api/v1/tickets/${ticketId}/vault`, {
    method: "GET",
  });
}
