/**
 * lib/hooks/useSeatSelection.ts
 *
 * Interactive state for the buyer's seat map: pan/zoom transform plus the set
 * of chosen seats.
 *
 * Replaces the section-based `useSeatMap`. Sections no longer exist — a seat's
 * only grouping is the ticket tier it was painted with — so selection is keyed
 * by the numeric `seat_id` the backend uses for holds, not by a synthesised
 * "section-row-number" string.
 *
 * Seats may span tiers. A hold no longer names a tier for assigned seating —
 * the server resolves each seat's tier from event_seats_matrix — so the buyer
 * can mix VIP and Regular in one order. Each seat therefore carries its own
 * tier and price here, and the per-order cap is applied per tier, matching what
 * the organizer configured on each one.
 */

"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { SeatMapSeat } from "@/lib/api/booking";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;
const WHEEL_ZOOM_STEP = 0.1;

export interface ChosenSeat {
  seat_id: number;
  row: string;
  number: string;
  ticket_tier_id: number;
  tier_name: string;
  unit_face_value: number;
}

/** The tier a seat belongs to, passed in on click. */
export interface SeatTierInfo {
  ticket_tier_id: number;
  name: string;
  price: number;
  color: string;
}

/** One tier's worth of the current selection, for rendering and for the hold. */
export interface SeatGroup {
  ticket_tier_id: number;
  tier_name: string;
  unit_face_value: number;
  seats: ChosenSeat[];
}

interface UseSeatSelectionOptions {
  /**
   * Per-order cap keyed by ticket_tier_id, from each tier's
   * max_per_transaction. A tier absent from the map, or mapped to 0, is
   * uncapped.
   */
  max_per_tier: Map<number, number>;
}

export function useSeatSelection({ max_per_tier }: UseSeatSelectionOptions) {
  const [zoom, set_zoom] = useState(1);
  const [pan_x, set_pan_x] = useState(0);
  const [pan_y, set_pan_y] = useState(0);
  const [is_panning, set_is_panning] = useState(false);
  const [chosen_seats, set_chosen_seats] = useState<ChosenSeat[]>([]);
  /** Set when a click is refused, so the page can surface why. */
  const [limit_notice, set_limit_notice] = useState<string | null>(null);

  const pan_start = useRef({ x: 0, y: 0 });

  const set_zoom_clamped = useCallback((next: number) => {
    set_zoom(Math.min(Math.max(MIN_ZOOM, next), MAX_ZOOM));
  }, []);

  const zoom_in = useCallback(() => set_zoom_clamped(zoom + ZOOM_STEP), [zoom, set_zoom_clamped]);
  const zoom_out = useCallback(() => set_zoom_clamped(zoom - ZOOM_STEP), [zoom, set_zoom_clamped]);

  // Exposed so controls can disable at the limits rather than duplicating the
  // clamp bounds, which live here.
  const can_zoom_in = zoom < MAX_ZOOM;
  const can_zoom_out = zoom > MIN_ZOOM;
  const is_default_view = zoom === 1 && pan_x === 0 && pan_y === 0;

  const reset_view = useCallback(() => {
    set_zoom(1);
    set_pan_x(0);
    set_pan_y(0);
  }, []);

  const start_pan = useCallback(
    (client_x: number, client_y: number) => {
      set_is_panning(true);
      pan_start.current = { x: client_x - pan_x, y: client_y - pan_y };
    },
    [pan_x, pan_y]
  );

  const do_pan = useCallback(
    (client_x: number, client_y: number) => {
      if (!is_panning) return;
      set_pan_x(client_x - pan_start.current.x);
      set_pan_y(client_y - pan_start.current.y);
    },
    [is_panning]
  );

  const end_pan = useCallback(() => set_is_panning(false), []);

  const handle_wheel_zoom = useCallback(
    (delta_y: number) => {
      set_zoom_clamped(zoom + (delta_y > 0 ? -WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP));
    },
    [zoom, set_zoom_clamped]
  );

  const toggle_seat = useCallback(
    (seat: SeatMapSeat, tier: SeatTierInfo) => {
      set_limit_notice(null);
      set_chosen_seats((seats) => {
        const existing = seats.find((s) => s.seat_id === seat.seat_id);
        if (existing) return seats.filter((s) => s.seat_id !== seat.seat_id);

        // The cap belongs to the tier being added to, not to the selection as
        // a whole: 4 VIP plus 4 Regular is allowed when both caps are 4.
        const cap = max_per_tier.get(tier.ticket_tier_id) ?? 0;
        const in_tier = seats.filter(
          (s) => s.ticket_tier_id === tier.ticket_tier_id
        ).length;
        if (cap > 0 && in_tier >= cap) {
          set_limit_notice(
            `Maximum ${cap} ${tier.name} tickets per order. Seats in other categories can still be added.`
          );
          return seats;
        }

        return [
          ...seats,
          {
            seat_id: seat.seat_id,
            row: seat.row,
            number: seat.number,
            ticket_tier_id: tier.ticket_tier_id,
            tier_name: tier.name,
            unit_face_value: tier.price,
          },
        ];
      });
    },
    [max_per_tier]
  );

  /**
   * Replace the selection wholesale, used to rebuild it from a hold the buyer
   * still owns after navigating back to the map. Bypasses the per-tier caps on
   * purpose: these seats are already locked to them and were capped when the
   * hold was taken.
   */
  const restore_seats = useCallback((seats: ChosenSeat[]) => {
    set_limit_notice(null);
    set_chosen_seats(seats);
  }, []);

  const remove_seat = useCallback((seat_id: number) => {
    set_limit_notice(null);
    set_chosen_seats((seats) => seats.filter((s) => s.seat_id !== seat_id));
  }, []);

  const clear_seats = useCallback(() => {
    set_limit_notice(null);
    set_chosen_seats([]);
  }, []);

  const selected_seat_ids = useMemo(
    () => new Set(chosen_seats.map((s) => s.seat_id)),
    [chosen_seats]
  );

  const subtotal = useMemo(
    () => chosen_seats.reduce((sum, s) => sum + s.unit_face_value, 0),
    [chosen_seats]
  );

  /**
   * The selection grouped by tier, in the order each tier was first picked, so
   * the panel and the hold agree on what is being bought.
   */
  const seat_groups: SeatGroup[] = useMemo(() => {
    const groups = new Map<number, SeatGroup>();
    for (const seat of chosen_seats) {
      const existing = groups.get(seat.ticket_tier_id);
      if (existing) {
        existing.seats.push(seat);
        continue;
      }
      groups.set(seat.ticket_tier_id, {
        ticket_tier_id: seat.ticket_tier_id,
        tier_name: seat.tier_name,
        unit_face_value: seat.unit_face_value,
        seats: [seat],
      });
    }
    return Array.from(groups.values());
  }, [chosen_seats]);

  return {
    // transform
    zoom,
    pan_x,
    pan_y,
    is_panning,
    zoom_in,
    zoom_out,
    reset_view,
    can_zoom_in,
    can_zoom_out,
    is_default_view,
    start_pan,
    do_pan,
    end_pan,
    handle_wheel_zoom,
    // selection
    chosen_seats,
    seat_groups,
    selected_seat_ids,
    subtotal,
    limit_notice,
    toggle_seat,
    restore_seats,
    remove_seat,
    clear_seats,
  };
}
