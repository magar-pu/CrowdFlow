import { apiRequest } from '@/utils/api';
import { ApiResponse, Event, EventDetail, EventStatusLogEntry, EventType, Scanner, TicketTier, UpdateEventPayload, Venue, VenueSection } from '@/types/admin';

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

// Hits the event package's /api/events/{id} (not /api/v1/events/{id}, which
// isn't registered in the admin package) - same reasoning as createEvent
// below. Super Admin already bypasses that route's ownership check, so it
// can fetch the raw editable details of any event regardless of status.
export async function getEvent(id: string): Promise<ApiResponse<EventDetail>> {
  return apiRequest<EventDetail>(`/api/events/${id}`, {
    method: "GET",
  });
}

export async function updateEvent(id: string, payload: UpdateEventPayload): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// Deliberately posts to /api/events (the event package's real endpoint,
// Organizer-gated - Super Admin bypasses that check) rather than /api/v1/events,
// which is not a registered route. See admin/handler.go's RegisterRoutes comment.
export async function createEvent(formData: FormData): Promise<ApiResponse<Event>> {
  return apiRequest<Event>("/api/events", {
    method: "POST",
    body: formData,
  });
}

// Same reasoning as createEvent above: these hit the event package's plain
// /api/ routes (not /api/v1/), since no venue/event-type listing exists
// anywhere in the admin package.
export async function listVenues(): Promise<ApiResponse<Venue[]>> {
  return apiRequest<Venue[]>("/api/venues", {
    method: "GET",
  });
}

export async function listEventTypes(): Promise<ApiResponse<EventType[]>> {
  return apiRequest<EventType[]>("/api/event-types", {
    method: "GET",
  });
}

export async function publishEvent(id: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/events/${id}/publish`, {
    method: "PATCH",
  });
}

export async function approveEvent(id: string, notes?: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/events/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes: notes ?? "" }),
  });
}

export async function rejectEvent(id: string, notes: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/events/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

export async function setEventStatus(id: string, status: 'draft' | 'pending_review'): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/events/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function listEventStatusLog(id: string): Promise<ApiResponse<EventStatusLogEntry[]>> {
  return apiRequest<EventStatusLogEntry[]>(`/api/v1/events/${id}/status-log`, {
    method: "GET",
  });
}

export async function listScanners(eventId: string): Promise<ApiResponse<Scanner[]>> {
  return apiRequest<Scanner[]>(`/api/v1/events/${eventId}/scanners`, {
    method: "GET",
  });
}

export async function addScanner(eventId: string, data: any): Promise<ApiResponse<Scanner>> {
  return apiRequest<Scanner>(`/api/v1/events/${eventId}/scanners`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteScanner(eventId: string, scannerId: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/events/${eventId}/scanners/${scannerId}`, {
    method: "DELETE",
  });
}

export async function getTicketTiers(eventId: string): Promise<ApiResponse<TicketTier[]>> {
  return apiRequest<TicketTier[]>(`/api/v1/events/${eventId}/ticket-tiers`, {
    method: "GET",
  });
}

export async function updateTicketTiers(eventId: string, tiers: TicketTier[]): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/events/${eventId}/ticket-tiers`, {
    method: "PUT",
    body: JSON.stringify(tiers),
  });
}

export async function deleteTicketTier(eventId: string, tierId: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/events/${eventId}/ticket-tiers/${tierId}`, {
    method: "DELETE",
  });
}

export async function getVenueSections(eventId: string): Promise<ApiResponse<VenueSection[]>> {
  return apiRequest<VenueSection[]>(`/api/v1/events/${eventId}/venue-sections`, {
    method: "GET",
  });
}

export async function updateVenueSections(eventId: string, sections: VenueSection[]): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/events/${eventId}/venue-sections`, {
    method: "PUT",
    body: JSON.stringify(sections),
  });
}
