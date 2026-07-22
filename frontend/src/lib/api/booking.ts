import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";
import type { RenderableLayout, LayoutSeat } from "@/lib/api/venueLayouts";

/**
 * API client for the buyer-facing booking endpoints (internal/booking). Types
 * mirror the Go DTOs 1:1 (snake_case JSON) so nothing is remapped at this seam.
 *
 * Endpoints (public — no authentication):
 *   GET /api/v1/events/{id}/seatmap        layout geometry + tiers with seats + GA tiers
 *   GET /api/v1/events/{id}/ticket-tiers   on-sale tiers (see lib/api/events.ts)
 */

/** A seat's live per-event state, from event_seats_matrix.current_state. */
export type SeatStatus = "available" | "sold" | "held" | "blocked";

export interface SeatMapSeat {
  seat_id: number;
  row: string;
  number: string;
  status: SeatStatus;
  /** Coordinates within the venue layout; null when never placed in the editor. */
  pos_x: number | null;
  pos_y: number | null;
}

/**
 * One ticket tier with every seat assigned to it for this event. Tier is the
 * only grouping a seat has: the venue layout is an untiered reusable template,
 * and the assignment lives per-seat for this event alone.
 */
export interface SeatMapTier {
  ticket_tier_id: number;
  name: string;
  price: number;
  /** Drives the seat fill; null when the organizer picked no colour. */
  color: string | null;
  seats: SeatMapSeat[];
}

/**
 * The event's bound layout backdrop: stage, facilities, blueprint reference
 * and the decorative zone outlines, all inside the layout's geometry blob.
 */
export interface SeatMapLayout {
  layout_id: number;
  geometry: Record<string, unknown>;
}

/** A tier sold by quantity rather than by seat. */
export interface GaTier {
  ticket_tier_id: number;
  event_id: number;
  name: string;
  description: string;
  price: number;
  quota_remaining: number;
  max_per_transaction: number;
}

/**
 * Full seating payload for one event. A tier appears in either `tiers`
 * (assigned seating) or `ga_tiers` (general admission), never both.
 * `layout` is null when the event has no venue layout bound.
 */
export interface SeatMap {
  layout: SeatMapLayout | null;
  tiers: SeatMapTier[];
  ga_tiers: GaTier[];
}

export async function getSeatMap(
  eventId: number | string
): Promise<ApiResponse<SeatMap>> {
  return apiRequest<SeatMap>(`/api/v1/events/${eventId}/seatmap`, {
    method: "GET",
  });
}

// ── derived views ──────────────────────────────────────────────────────────

/**
 * Project the seat map onto the drawable layout shape, so the same renderer
 * the organizer uses can draw the buyer's map from this one request.
 *
 * Returns null when the event has no layout bound — callers should fall back
 * to general admission rather than rendering an empty canvas.
 */
export function seatMapToRenderableLayout(seatMap: SeatMap): RenderableLayout | null {
  if (!seatMap.layout) return null;

  // Seats arrive grouped by tier but are drawn as one flat set.
  const seats: LayoutSeat[] = seatMap.tiers.flatMap((t) =>
    t.seats.map((seat) => ({
      id: seat.seat_id,
      row: seat.row,
      number: seat.number,
      pos_x: seat.pos_x,
      pos_y: seat.pos_y,
    }))
  );

  return { geometry: seatMap.layout.geometry, seats };
}

/** Seat id -> live status, for colouring and click-eligibility. */
export function seatStatesFrom(seatMap: SeatMap): Map<number, SeatStatus> {
  const states = new Map<number, SeatStatus>();
  for (const tier of seatMap.tiers) {
    for (const seat of tier.seats) {
      states.set(seat.seat_id, seat.status);
    }
  }
  return states;
}

/** Seat id -> the price of the tier it is sold under. */
export function seatPricesFrom(seatMap: SeatMap): Map<number, number> {
  const prices = new Map<number, number>();
  for (const tier of seatMap.tiers) {
    for (const seat of tier.seats) {
      prices.set(seat.seat_id, tier.price);
    }
  }
  return prices;
}

/** Seat id -> its tier id, for colouring seats by tier on the buyer map. */
export function seatTiersFrom(seatMap: SeatMap): Map<number, number> {
  const tiers = new Map<number, number>();
  for (const tier of seatMap.tiers) {
    for (const seat of tier.seats) {
      tiers.set(seat.seat_id, tier.ticket_tier_id);
    }
  }
  return tiers;
}

/**
 * True when the event sells assigned seats. An event can legitimately have a
 * layout bound but no seats painted yet, which is not the same as being
 * general admission — hence checking tiers rather than `layout`.
 */
export function hasAssignedSeating(seatMap: SeatMap): boolean {
  return seatMap.tiers.length > 0;
}
