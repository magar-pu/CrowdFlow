import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";

/**
 * Client for the link-as-credential booking-access endpoints
 * (backend `GET /order-access/{orderId}` and
 * `GET /order-access/{orderId}/tickets/{ticketId}`, internal/ticket). No JWT
 * is ever sent here on purpose — the order/ticket UUID in the URL is the
 * credential (plan decision 4). These back the /booking/<order_uuid> and
 * /booking/<order_uuid>/t/<ticket_uuid> pages.
 *
 * Deliberately its own file rather than added to lib/api/booking.ts — that
 * file already owns a distinct, pre-existing domain (seat holds via
 * internal/booking, `POST /api/v1/booking/holds`), and the backend keeps the
 * same separation (see the "/order-access" comment in ticket/handler.go).
 */

export interface OrderAccessTicket {
  ticketId: string;
  attendeeFullName: string;
  tierName: string;
  seatLabel: string;
  ticketStatus: string;
}

export interface OrderAccessResponse {
  orderId: string;
  orderIdShort: string;
  purchaserName: string;
  eventName: string;
  eventStart?: string;
  venueName?: string;
  venueCity?: string;
  coverImageUrl?: string;
  tickets: OrderAccessTicket[];
}

export interface TicketAccessResponse {
  ticketId: string;
  orderId: string;
  orderIdShort: string;
  purchaserName: string;
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

export async function getOrderAccess(orderId: string): Promise<ApiResponse<OrderAccessResponse>> {
  return apiRequest<OrderAccessResponse>(`/api/v1/order-access/${orderId}`, {
    method: "GET",
  });
}

export async function getTicketAccess(
  orderId: string,
  ticketId: string
): Promise<ApiResponse<TicketAccessResponse>> {
  return apiRequest<TicketAccessResponse>(`/api/v1/order-access/${orderId}/tickets/${ticketId}`, {
    method: "GET",
  });
}

export interface RotateSecretResponse {
  ticketId: string;
  rotated: boolean;
}

/**
 * M3/M4: purchaser-authorized "panic revoke" — rotates this ticket's
 * secret_key so a previously shared/leaked copy of this ticket's QR (or of
 * its per-ticket booking link, since re-fetching from that link is how the
 * new secret is picked up) stops validating at the gate. Same
 * link-as-credential scoping as the GET above: whoever holds this
 * (orderId, ticketId) pair may rotate it, no login required.
 */
export async function rotateTicketAccess(
  orderId: string,
  ticketId: string
): Promise<ApiResponse<RotateSecretResponse>> {
  return apiRequest<RotateSecretResponse>(`/api/v1/order-access/${orderId}/tickets/${ticketId}/rotate`, {
    method: "POST",
  });
}
