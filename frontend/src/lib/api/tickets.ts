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
