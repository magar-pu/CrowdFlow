import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";

/** A venue as returned by the backend event package (VenueResponse). */
export interface Venue {
  venue_id: number;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  total_capacity?: number;
}

/** GET /api/v1/venues — venues the current organizer may build layouts for. */
export async function listVenues(): Promise<ApiResponse<Venue[]>> {
  return apiRequest<Venue[]>("/api/v1/venues", { method: "GET" });
}
