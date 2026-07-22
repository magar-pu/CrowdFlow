import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";
import { Event } from "@/types/ticket";

export async function listEvents(limit?: number, offset?: number): Promise<ApiResponse<Event[]>> {
  let query = "";
  const params = [];
  if (limit !== undefined) params.push(`limit=${limit}`);
  if (offset !== undefined) params.push(`offset=${offset}`);
  if (params.length > 0) {
    query = "?" + params.join("&");
  }
  return apiRequest<Event[]>(`/api/v1/events${query}`, {
    method: "GET",
  });
}

export async function getEvent(id: number | string): Promise<ApiResponse<Event>> {
  return apiRequest<Event>(`/api/v1/events/${id}`, {
    method: "GET",
  });
}

/**
 * A ticket tier as returned by the public listing endpoint. The backend only
 * returns tiers that are currently on sale (visibility = 'public' and inside
 * the sales window), so every tier here is purchasable by definition.
 */
export interface PublicTicketTier {
  ticket_tier_id: number;
  event_id: number;
  name: string;
  description: string;
  price: number;
  quota_remaining: number;
  max_per_transaction: number;
}

export async function listTicketTiers(
  eventId: number | string
): Promise<ApiResponse<PublicTicketTier[]>> {
  return apiRequest<PublicTicketTier[]>(`/api/v1/events/${eventId}/ticket-tiers`, {
    method: "GET",
  });
}

export async function createEvent(formData: FormData): Promise<ApiResponse<Event>> {
  return apiRequest<Event>("/api/v1/events", {
    method: "POST",
    body: formData,
  });
}

/** The venue + bound-layout ids the venue workspace needs, read from the real
 *  EventDetailResponse (not the richer mock Event type used elsewhere). */
export interface EventLayoutBinding {
  event_id: number;
  venue_id: number;
  layout_id: number | null;
}

export async function getEventLayoutBinding(
  id: number | string
): Promise<ApiResponse<EventLayoutBinding>> {
  const res = await apiRequest<{
    event_id: number;
    layout_id: number | null;
    venue?: { venue_id: number };
  }>(`/api/v1/events/${id}`, { method: "GET" });
  if (!res.success || !res.data) return res as unknown as ApiResponse<EventLayoutBinding>;
  return {
    success: true,
    data: {
      event_id: res.data.event_id,
      venue_id: res.data.venue?.venue_id ?? 0,
      layout_id: res.data.layout_id ?? null,
    },
  };
}

/** Bind the event to a venue layout, or unbind it with layoutId = null. */
export async function bindEventLayout(
  id: number | string,
  layoutId: number | null
): Promise<ApiResponse<{ message: string; event_id: number; layout_id: number | null }>> {
  return apiRequest(`/api/v1/events/${id}/layout`, {
    method: "PUT",
    body: JSON.stringify({ layout_id: layoutId }),
  });
}
