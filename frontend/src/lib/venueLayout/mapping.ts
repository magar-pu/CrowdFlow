/**
 * lib/venueLayout/mapping.ts
 *
 * Pure, page-agnostic mapping between the venue-editor Zustand state and the
 * venuelayout backend DTOs. Kept side-effect-free so it is unit-testable and so
 * the store/page wiring stays thin. No API calls, no store access here.
 */

import type {
  VenueSeat,
  VenueSection,
  VenueShape,
  VenueFacility,
  VenueBlueprint,
} from "@/types/ticket";
import type {
  SaveLayoutRequest,
  LayoutDetail,
} from "@/lib/api/venueLayouts";

/** Current geometry-bearing slice of the editor state a save needs. */
export interface EditorGeometry {
  stage_shape?: VenueShape | null;
  facilities: VenueFacility[];
  blueprint?: VenueBlueprint;
}

/** Everything buildSaveLayoutRequest needs from the store. */
export interface SavePayloadInput extends EditorGeometry {
  name: string;
  visibility: "public" | "event_exclusive";
  expectedUpdatedAt: string;
  /** Decorative zone outlines; persisted inside `geometry`, not as rows. */
  zones: VenueSection[];
  seats: VenueSeat[];
}

/**
 * Serialise the editor state into a SaveLayoutRequest. Seats keep their string
 * client ids as `key`; `db_id` (when present) becomes the real `id` so the
 * backend updates rather than re-inserts.
 *
 * A layout is an untiered, reusable template, so seats carry position only.
 * All decoration — stage, facilities, blueprint and the zone outlines — rides
 * along in the opaque `geometry` JSONB rather than as rows.
 */
export function buildSaveLayoutRequest(input: SavePayloadInput): SaveLayoutRequest {
  return {
    name: input.name,
    visibility: input.visibility,
    expected_updated_at: input.expectedUpdatedAt,
    geometry: {
      schema_version: 3,
      stage: input.stage_shape ?? null,
      facilities: input.facilities,
      blueprint: input.blueprint ?? null,
      zones: input.zones.map((z) => ({
        name: z.label,
        color: z.color,
        shape: z.shape ?? null,
      })),
    },
    seats: input.seats.map((s) => ({
      key: s.seat_id,
      id: s.db_id ?? null,
      row: s.row,
      number: String(s.number),
      pos_x: s.x,
      pos_y: s.y,
    })),
  };
}

/**
 * Fold the seat id map returned by a save back into the seats, stamping db_id
 * on the rows that were just inserted (matched by their client key). Seats that
 * already had a db_id (updates) aren't in the map and pass through.
 *
 * Zones need no reconciliation — they are decoration inside the geometry blob,
 * not rows with server-assigned ids.
 */
export function reconcileSavedIds(
  seats: VenueSeat[],
  seatIdMap: Record<string, number>
): VenueSeat[] {
  return seats.map((s) =>
    seatIdMap[s.seat_id] !== undefined ? { ...s, db_id: seatIdMap[s.seat_id] } : s
  );
}

/** The editor state produced by loading a persisted layout from the server. */
export interface HydratedLayout {
  layoutId: number;
  layoutUpdatedAt: string;
  name: string;
  seats: VenueSeat[];
  /** Decorative zone outlines, read out of the geometry blob. */
  zones: VenueSection[];
  stage_shape?: VenueShape;
  facilities?: VenueFacility[];
  blueprint?: VenueBlueprint;
}

/**
 * Hydrate a server LayoutDetail into editor state. Server rows carry integer
 * ids; the client key is the stringified id and db_id records the real id, so a
 * subsequent save updates in place. Seat status is not persisted at the layout
 * level (it is event-scoped), so seats come back as "available".
 */
export function layoutDetailToEditorState(detail: LayoutDetail): HydratedLayout {
  const geometry = (detail.geometry ?? {}) as {
    stage?: VenueShape | null;
    facilities?: VenueFacility[];
    blueprint?: VenueBlueprint | null;
    zones?: { name: string; color: string | null; shape?: unknown }[];
  };

  return {
    layoutId: detail.id,
    layoutUpdatedAt: detail.updated_at,
    name: detail.name,
    stage_shape: geometry.stage ?? undefined,
    facilities: geometry.facilities ?? undefined,
    blueprint: geometry.blueprint ?? undefined,
    // Zones come out of the geometry blob and have no db ids of their own; the
    // index is a stable enough client key for a decoration-only list.
    zones: (geometry.zones ?? []).map((z, i) => ({
      section_id: `zone-${i}`,
      label: z.name,
      color: z.color ?? "#888888",
      section_code: z.name,
      shape: (z.shape as VenueShape | undefined) ?? undefined,
    })),
    seats: detail.seats.map((s) => ({
      seat_id: String(s.id),
      db_id: s.id,
      row: s.row,
      number: Number(s.number) || 0,
      x: s.pos_x ?? 0,
      y: s.pos_y ?? 0,
      status: "available",
    })),
  };
}
