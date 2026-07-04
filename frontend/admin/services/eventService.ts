import { apiRequest } from "../utils/api";
import { ApiResponse, Event, Scanner, TicketTier, VenueSection } from "../types";

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

export async function getEvent(id: string): Promise<ApiResponse<Event>> {
  return apiRequest<Event>(`/api/v1/events/${id}`, {
    method: "GET",
  });
}

export async function createEvent(formData: FormData): Promise<ApiResponse<Event>> {
  return apiRequest<Event>("/api/v1/events", {
    method: "POST",
    body: formData,
  });
}

export async function publishEvent(id: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/events/${id}/publish`, {
    method: "PATCH",
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

export async function updateTicketTiers(eventId: string, tiers: TicketTier[]): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/events/${eventId}/ticket-tiers`, {
    method: "PUT",
    body: JSON.stringify(tiers),
  });
}

export async function updateVenueSections(eventId: string, sections: VenueSection[]): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/events/${eventId}/venue-sections`, {
    method: "PUT",
    body: JSON.stringify(sections),
  });
}
