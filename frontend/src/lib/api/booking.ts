import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";
import type { RenderableLayout, LayoutSeat } from "@/lib/api/venueLayouts";

/**
 * API client for the buyer-facing booking endpoints (internal/booking). Types
 * mirror the Go DTOs 1:1 (snake_case JSON) so nothing is remapped at this seam.
 *
 * Endpoints (public — no authentication):
 *   GET    /api/v1/events/{id}/seatmap      layout geometry + tiers with seats + GA tiers
 *   GET    /api/v1/events/{id}/ticket-tiers on-sale tiers (see lib/api/events.ts)
 *
 * Endpoints (authenticated):
 *   POST   /api/v1/booking/holds            lock seats, or GA quantity, before checkout
 *   DELETE /api/v1/booking/holds/{token}    release a hold early
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

// ── holds ──────────────────────────────────────────────────────────────────

/**
 * Reserve inventory before checkout. Carries `seat_ids` for assigned seating or
 * `quantity` for general admission — never both.
 *
 * Assigned seating sends NO ticket_tier_id: seats may span tiers in one hold,
 * and the server resolves each seat's tier from event_seats_matrix. That also
 * means the client cannot pair a cheap tier with another tier's seats.
 *
 * General admission has no seats to derive a tier from, so it names one and
 * stays one tier per hold.
 */
export interface HoldRequest {
  event_id: number;
  seat_ids?: number[];
  /** General admission only. */
  ticket_tier_id?: number;
  quantity?: number;
}

export interface Hold {
  hold_token: string;
  /** RFC3339. After this the seats return to the pool on their own. */
  expires_at: string;
}

/**
 * Acquire a hold. All-or-nothing for assigned seating: if any seat was taken
 * in the meantime the whole request fails and nothing stays locked, so the
 * caller should refetch the seat map and let the buyer pick again.
 *
 * Requires authentication — a signed-out buyer gets 401.
 */
export async function createHold(req: HoldRequest): Promise<ApiResponse<Hold>> {
  return apiRequest<Hold>("/api/v1/booking/holds", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/** One seat inside a hold, labelled as the buyer saw it on the map. */
export interface HoldSeat {
  seat_id: number;
  row: string;
  number: string;
}

/** One tier's worth of a hold. A seated hold may have several. */
export interface HoldItem {
  ticket_tier_id: number;
  tier_name: string;
  unit_price: number;
  quantity: number;
  /** Empty for a general-admission item. */
  seats: HoldSeat[];
}

/**
 * What a hold token resolves to. Checkout renders its cart from this rather
 * than from the query string, so prices come from the database and cannot be
 * edited by the buyer.
 */
export interface HoldDetail {
  hold_token: string;
  event_id: number;
  event_title: string;
  /** One entry per ticket tier in the hold. */
  items: HoldItem[];
  /** RFC3339. */
  expires_at: string;
}

/**
 * Resolve a hold token. Returns 404 HOLD_EXPIRED once the hold lapses, at
 * which point the seats are already back on the map and the buyer has to pick
 * again.
 */
export async function getHold(holdToken: string): Promise<ApiResponse<HoldDetail>> {
  return apiRequest<HoldDetail>(`/api/v1/booking/holds/${holdToken}`, {
    method: "GET",
  });
}

/** Release a hold early, e.g. when the buyer backs out of checkout. */
export async function releaseHold(holdToken: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/v1/booking/holds/${holdToken}`, {
    method: "DELETE",
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
