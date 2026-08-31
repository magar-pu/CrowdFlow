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
  /** Event start time, ISO 8601. Absent when the event row is missing. */
  eventStart?: string;
  venueName?: string;
  venueCity?: string;
  coverImageUrl?: string;
  createdAt: string;
  updatedAt: string;
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
 * Complete payment and generate tickets for an order.
 */
export async function completeOrderPayment(orderId: string): Promise<ApiResponse<any>> {
  return apiRequest<any>("/api/v1/orders/complete-payment", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}

