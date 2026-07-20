import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";

/**
 * API client for the venue-layout backend (internal/venuelayout). Types mirror
 * the Go DTOs 1:1 (snake_case JSON) so no field remapping happens at this seam;
 * the venue-editor store <-> DTO mapping lives separately in the editor wiring.
 *
 * Endpoints (all require an authenticated Event Organizer / Super Admin):
 *   GET    /api/v1/venues/{venueId}/layouts          list (public + own-exclusive)
 *   POST   /api/v1/venues/{venueId}/layouts          create
 *   GET    /api/v1/layouts/{layoutId}                load one (full)
 *   PUT    /api/v1/venues/{venueId}/layouts/{lid}    save/diff
 */

/** A section row as stored on the server (decorative tag + optional shape). */
export interface LayoutSection {
  id: number;
  section_name: string;
  color: string | null;
  shape?: unknown;
}

/** A physical seat row as stored on the server. */
export interface LayoutSeat {
  id: number;
  section_id: number | null;
  row: string;
  number: string;
  pos_x: number | null;
  pos_y: number | null;
}

/** Layout header returned by list + embedded in the full detail. */
export interface LayoutSummary {
  id: number;
  venue_id: number;
  name: string;
  schema_version: number;
  geometry: Record<string, unknown>;
  visibility: "public" | "event_exclusive";
  owner_user_id: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/** Full read shape from GET /layouts/{id} — the editor's entire persisted state. */
export interface LayoutDetail extends LayoutSummary {
  sections: LayoutSection[];
  seats: LayoutSeat[];
}

export interface CreateLayoutRequest {
  name: string;
  visibility?: "public" | "event_exclusive";
}

/** One section in a save payload. `key` is the client's stable handle; `id` is
 *  the real DB id when the section already exists (null = insert). */
export interface SectionInput {
  key: string;
  id: number | null;
  section_name: string;
  color?: string | null;
  shape?: unknown;
}

/** One seat in a save payload. `section_key` references a SectionInput.key in
 *  the same payload (or null for a section-free seat). */
export interface SeatInput {
  key: string;
  id: number | null;
  section_key: string | null;
  row: string;
  number: string;
  pos_x: number | null;
  pos_y: number | null;
}

export interface SaveLayoutRequest {
  name: string;
  visibility: "public" | "event_exclusive";
  geometry: Record<string, unknown>;
  /** The updated_at the client loaded — server rejects with 409 if stale. */
  expected_updated_at: string;
  sections: SectionInput[];
  seats: SeatInput[];
}

/** Response from PUT save: the persisted layout plus the maps the client uses
 *  to reconcile temporary client keys to the new DB ids (inserts only). */
export interface SaveLayoutResponse {
  layout: LayoutDetail;
  section_id_map: Record<string, number>;
  seat_id_map: Record<string, number>;
}

export async function listLayouts(venueId: number): Promise<ApiResponse<LayoutSummary[]>> {
  return apiRequest<LayoutSummary[]>(`/api/v1/venues/${venueId}/layouts`, {
    method: "GET",
  });
}

export async function getLayout(layoutId: number): Promise<ApiResponse<LayoutDetail>> {
  return apiRequest<LayoutDetail>(`/api/v1/layouts/${layoutId}`, {
    method: "GET",
  });
}

export async function createLayout(
  venueId: number,
  req: CreateLayoutRequest
): Promise<ApiResponse<LayoutSummary>> {
  return apiRequest<LayoutSummary>(`/api/v1/venues/${venueId}/layouts`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function saveLayout(
  venueId: number,
  layoutId: number,
  req: SaveLayoutRequest
): Promise<ApiResponse<SaveLayoutResponse>> {
  return apiRequest<SaveLayoutResponse>(`/api/v1/venues/${venueId}/layouts/${layoutId}`, {
    method: "PUT",
    body: JSON.stringify(req),
  });
}
