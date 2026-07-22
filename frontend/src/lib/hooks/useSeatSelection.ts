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
 * Selection is confined to ONE tier because a hold covers exactly one tier
 * (POST /booking/holds takes a single ticket_tier_id). Switching tier clears
 * the selection rather than silently dropping seats at hold time.
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
  unit_face_value: number;
}

interface UseSeatSelectionOptions {
  /** Upper bound from the tier's max_per_transaction. */
  max_seats: number;
}

export function useSeatSelection({ max_seats }: UseSeatSelectionOptions) {
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
    (seat: SeatMapSeat, unit_face_value: number) => {
      set_limit_notice(null);
      set_chosen_seats((seats) => {
        const existing = seats.find((s) => s.seat_id === seat.seat_id);
        if (existing) return seats.filter((s) => s.seat_id !== seat.seat_id);

        if (seats.length >= max_seats) {
          set_limit_notice(
            `Maksimal ${max_seats} tiket per transaksi untuk kategori ini.`
          );
          return seats;
        }

        return [
          ...seats,
          {
            seat_id: seat.seat_id,
            row: seat.row,
            number: seat.number,
            unit_face_value,
          },
        ];
      });
    },
    [max_seats]
  );

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

  return {
    // transform
    zoom,
    pan_x,
    pan_y,
    is_panning,
    zoom_in,
    zoom_out,
    reset_view,
    start_pan,
    do_pan,
    end_pan,
    handle_wheel_zoom,
    // selection
    chosen_seats,
    selected_seat_ids,
    subtotal,
    limit_notice,
    toggle_seat,
    remove_seat,
    clear_seats,
  };
}
