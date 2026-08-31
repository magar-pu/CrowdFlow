import { apiRequest } from '@/utils/api';
import { ApiResponse, Event, EventDetail, EventStatusLogEntry, EventType, TicketTier, UpdateEventPayload, Venue } from '@/types/admin';

export async function listEvents(limit?: number, offset?: number): Promise<ApiResponse<Event[]>> {
  let query = "";
  const params = [];
  if (limit !== undefined) params.push(`limit=${limit}`);
  if (offset !== undefined) params.push(`offset=${offset}`);
  if (params.length > 0) {
    query = "?" + params.join("&");
  }
  return apiRequest<Event[]>(`/api/v1/admin/events${query}`, {
    method: "GET",
  });
}

// Hits the event package's /api/v1/events/{id} (not the admin namespace, which
// doesn't register a plain GET one) - same reasoning as createEvent below.
// Super Admin already bypasses that route's ownership check, so it can fetch
// the raw editable details of any event regardless of status.
export async function getEvent(id: string): Promise<ApiResponse<EventDetail>> {
  return apiRequest<EventDetail>(`/api/v1/events/${id}`, {
    method: "GET",
  });
}

export async function updateEvent(id: string, payload: UpdateEventPayload): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// Deliberately posts to the event package's /api/v1/events (Organizer-gated -
// Super Admin bypasses that check) rather than the admin namespace, which does
// not register event creation. See admin/handler.go's RegisterRoutes comment.
export async function createEvent(formData: FormData): Promise<ApiResponse<Event>> {
  return apiRequest<Event>("/api/v1/events", {
    method: "POST",
    body: formData,
  });
}

// Same reasoning as createEvent above: these hit the event package's
// /api/v1/ routes (not the admin namespace), since no venue/event-type listing
// exists anywhere in the admin package.
export async function listVenues(): Promise<ApiResponse<Venue[]>> {
  return apiRequest<Venue[]>("/api/v1/venues", {
    method: "GET",
  });
}

export async function listEventTypes(): Promise<ApiResponse<EventType[]>> {
  return apiRequest<EventType[]>("/api/v1/event-types", {
    method: "GET",
  });
}

// Event package endpoint (PATCH /api/v1/events/{id}/publish), not admin-namespaced.
export async function publishEvent(id: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/events/${id}/publish`, {
    method: "PATCH",
  });
}

export async function approveEvent(id: string, notes?: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/admin/events/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes: notes ?? "" }),
  });
}

export async function rejectEvent(id: string, notes: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/admin/events/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

export async function setEventStatus(id: string, status: 'draft' | 'pending_review'): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/admin/events/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function listEventStatusLog(id: string): Promise<ApiResponse<EventStatusLogEntry[]>> {
  return apiRequest<EventStatusLogEntry[]>(`/api/v1/admin/events/${id}/status-log`, {
    method: "GET",
  });
}

export async function getTicketTiers(eventId: string): Promise<ApiResponse<TicketTier[]>> {
  return apiRequest<TicketTier[]>(`/api/v1/admin/events/${eventId}/ticket-tiers`, {
    method: "GET",
  });
}

export async function updateTicketTiers(eventId: string, tiers: TicketTier[]): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/admin/events/${eventId}/ticket-tiers`, {
    method: "PUT",
    body: JSON.stringify(tiers),
  });
}

export async function deleteTicketTier(eventId: string, tierId: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/admin/events/${eventId}/ticket-tiers/${tierId}`, {
    method: "DELETE",
  });
}

