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
  sections: VenueSection[];
  seats: VenueSeat[];
}

/**
 * Serialise the editor state into a SaveLayoutRequest. Seats/sections keep their
 * string client ids as `key`; `db_id` (when present) becomes the real `id` so
 * the backend updates rather than re-inserts. Decorative geometry (stage,
 * facilities, blueprint) rides along in the opaque `geometry` JSONB; section
 * shapes stay on the section rows.
 */
export function buildSaveLayoutRequest(input: SavePayloadInput): SaveLayoutRequest {
  return {
    name: input.name,
    visibility: input.visibility,
    expected_updated_at: input.expectedUpdatedAt,
    geometry: {
      schema_version: 2,
      stage: input.stage_shape ?? null,
      facilities: input.facilities,
      blueprint: input.blueprint ?? null,
    },
    sections: input.sections.map((s) => ({
      key: s.section_id,
      id: s.db_id ?? null,
      section_name: s.label,
      color: s.color,
      shape: s.shape ?? null,
    })),
    seats: input.seats.map((s) => ({
      key: s.seat_id,
      id: s.db_id ?? null,
      section_key: s.section_id ?? null,
      row: s.row,
      number: String(s.number),
      pos_x: s.x,
      pos_y: s.y,
    })),
  };
}

/**
 * Fold the id maps returned by a save back into the seats/sections, stamping
 * db_id on the rows that were just inserted (matched by their client key).
 * Rows that already had a db_id (updates) aren't in the maps and pass through.
 */
export function reconcileSavedIds(
  seats: VenueSeat[],
  sections: VenueSection[],
  seatIdMap: Record<string, number>,
  sectionIdMap: Record<string, number>
): { seats: VenueSeat[]; sections: VenueSection[] } {
  return {
    seats: seats.map((s) =>
      seatIdMap[s.seat_id] !== undefined ? { ...s, db_id: seatIdMap[s.seat_id] } : s
    ),
    sections: sections.map((s) =>
      sectionIdMap[s.section_id] !== undefined
        ? { ...s, db_id: sectionIdMap[s.section_id] }
        : s
    ),
  };
}

/** The editor state produced by loading a persisted layout from the server. */
export interface HydratedLayout {
  layoutId: number;
  layoutUpdatedAt: string;
  seats: VenueSeat[];
  sections: VenueSection[];
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
  };

  return {
    layoutId: detail.id,
    layoutUpdatedAt: detail.updated_at,
    stage_shape: geometry.stage ?? undefined,
    facilities: geometry.facilities ?? undefined,
    blueprint: geometry.blueprint ?? undefined,
    sections: detail.sections.map((s) => ({
      section_id: String(s.id),
      db_id: s.id,
      label: s.section_name,
      color: s.color ?? "#888888",
      section_code: s.section_name,
      shape: (s.shape as VenueShape | undefined) ?? undefined,
    })),
    seats: detail.seats.map((s) => ({
      seat_id: String(s.id),
      db_id: s.id,
      section_id: s.section_id != null ? String(s.section_id) : null,
      row: s.row,
      number: Number(s.number) || 0,
      x: s.pos_x ?? 0,
      y: s.pos_y ?? 0,
      status: "available",
    })),
  };
}
