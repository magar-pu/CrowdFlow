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

export async function createEvent(formData: FormData): Promise<ApiResponse<Event>> {
  return apiRequest<Event>("/api/v1/events", {
    method: "POST",
    body: formData,
  });
}
