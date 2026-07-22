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

/**
 * A physical seat row as stored on the server. A layout is an untiered,
 * reusable template, so a seat carries position only — which ticket tier
 * sells it is decided per event, never here.
 */
export interface LayoutSeat {
  id: number;
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
  seats: LayoutSeat[];
}

/**
 * The subset of a layout that is actually drawable.
 *
 * `LayoutDetail` satisfies this structurally, but so does the geometry carried
 * on the public seat map (GET /events/{id}/seatmap), which has no reason to
 * expose a layout's visibility, owner or audit timestamps to buyers. Renderers
 * should take this rather than the full detail so both callers fit without
 * inventing fields.
 *
 * Zone outlines live inside `geometry.zones` alongside the stage and
 * facilities — they are decoration, not rows.
 */
export interface RenderableLayout {
  /** Used for the accessible label only; omitted on the public seat map. */
  name?: string;
  geometry: Record<string, unknown>;
  seats: LayoutSeat[];
}

/** One decorative zone outline, stored inside a layout's geometry blob. */
export interface LayoutZone {
  name: string;
  color: string | null;
  shape?: unknown;
}

/** Read the zone outlines out of a layout's geometry blob. */
export function zonesOf(geometry: Record<string, unknown>): LayoutZone[] {
  const zones = geometry?.zones;
  return Array.isArray(zones) ? (zones as LayoutZone[]) : [];
}

export interface CreateLayoutRequest {
  name: string;
  visibility?: "public" | "event_exclusive";
}

/** One seat in a save payload. `key` is the client's stable handle; `id` is the
 *  real DB id when the seat already exists (null = insert). */
export interface SeatInput {
  key: string;
  id: number | null;
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
  seats: SeatInput[];
}

/** Response from PUT save: the persisted layout plus the map the client uses
 *  to reconcile temporary seat keys to the new DB ids (inserts only). */
export interface SaveLayoutResponse {
  layout: LayoutDetail;
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
