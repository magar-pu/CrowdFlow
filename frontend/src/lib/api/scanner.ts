import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";

// Gate CRUD lives on the organizer console guard chain (not ticketman-gated).
// Check-in, dashboard and device/session concerns moved to
// @/lib/api/ticketman (CF1 contract, ticketman-session-gated).

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
