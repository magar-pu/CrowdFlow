/**
 * lib/hooks/useSeatMap.ts
 *
 * All interactive state for the seat selection screen: pan/zoom transform,
 * active section, selected seats, and the sold-seat lookup. This is a
 * direct React port of the Alpine.js `seatMap()` component from the Stitch
 * seat_selection screen — same method names, same clamping logic — so the
 * behavior matches exactly, just expressed as hooks instead of x-data.
 */

import { useCallback, useRef, useState } from "react";
import type { SelectedSeat } from "@/types/ticket";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

interface UseSeatMapOptions {
  max_seats: number;
  /** Returns the sold seat codes (e.g. "A3") for a given section_id. */
  get_sold_seat_codes: (section_id: string) => string[];
  /** Returns the per-seat face value for a given section_id, for pricing the running subtotal. */
  get_unit_face_value: (section_id: string) => number;
}

export function useSeatMap({
  max_seats,
  get_sold_seat_codes,
  get_unit_face_value,
}: UseSeatMapOptions) {
  const [zoom, set_zoom] = useState(1);
  const [pan_x, set_pan_x] = useState(0);
  const [pan_y, set_pan_y] = useState(0);
  const [is_panning, set_is_panning] = useState(false);
  const [active_section_id, set_active_section_id] = useState<string | null>(
    null
  );
  const [active_section_label, set_active_section_label] = useState<
    string | null
  >(null);
  const [selected_seats, set_selected_seats] = useState<SelectedSeat[]>([]);
  const [panel_open, set_panel_open] = useState(true);

  const pan_start = useRef({ x: 0, y: 0 });

  const set_zoom_clamped = useCallback((next_zoom: number) => {
    set_zoom(Math.min(Math.max(MIN_ZOOM, next_zoom), MAX_ZOOM));
  }, []);

  const zoom_in = useCallback(
    () => set_zoom_clamped(zoom + 0.2),
    [zoom, set_zoom_clamped]
  );
  const zoom_out = useCallback(
    () => set_zoom_clamped(zoom - 0.2),
    [zoom, set_zoom_clamped]
  );

  const reset_view = useCallback(() => {
    set_zoom(1);
    set_pan_x(0);
    set_pan_y(0);
    set_active_section_id(null);
    set_active_section_label(null);
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
      const zoom_delta = delta_y > 0 ? -0.1 : 0.1;
      set_zoom_clamped(zoom + zoom_delta);
    },
    [zoom, set_zoom_clamped]
  );

  const select_section = useCallback((section_id: string | null, label: string | null = null) => {
    set_active_section_id(section_id);
    set_active_section_label(label);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      set_panel_open(true);
    }
    // Auto-zoom toward a conceptual center, matching the Stitch behavior.
    set_zoom(1.2);
    set_pan_x(0);
    set_pan_y(-100);
  }, []);

  const is_seat_sold = useCallback(
    (section_id: string, row: string, seat_number: number) => {
      return get_sold_seat_codes(section_id).includes(`${row}${seat_number}`);
    },
    [get_sold_seat_codes]
  );

  const is_seat_selected = useCallback(
    (section_id: string, row: string, seat_number: number) => {
      const seat_id = `${section_id}-${row}-${seat_number}`;
      return selected_seats.some((s) => s.seat_id === seat_id);
    },
    [selected_seats]
  );

  const toggle_seat = useCallback(
    (
      section_id: string,
      section_label: string,
      row: string,
      seat_number: number
    ) => {
      if (is_seat_sold(section_id, row, seat_number)) return;

      const seat_id = `${section_id}-${row}-${seat_number}`;
      const existing_index = selected_seats.findIndex(
        (s) => s.seat_id === seat_id
      );

      if (existing_index >= 0) {
        set_selected_seats((seats) =>
          seats.filter((s) => s.seat_id !== seat_id)
        );
        return;
      }

      if (selected_seats.length >= max_seats) {
        // Matches the Stitch demo's alert() — swap for a toast if you add one later.
        if (typeof window !== "undefined") {
          window.alert(`You can only select up to ${max_seats} seats.`);
        }
        return;
      }

      set_selected_seats((seats) => [
        ...seats,
        {
          seat_id,
          section_id,
          section_label,
          row,
          seat_number,
          unit_face_value: get_unit_face_value(section_id),
        },
      ]);
    },
    [is_seat_sold, selected_seats, max_seats, get_unit_face_value]
  );

  const remove_seat = useCallback((seat_id: string) => {
    set_selected_seats((seats) => seats.filter((s) => s.seat_id !== seat_id));
  }, []);

  const subtotal = selected_seats.reduce(
    (sum, seat) => sum + seat.unit_face_value,
    0
  );

  return {
    zoom,
    pan_x,
    pan_y,
    is_panning,
    active_section_id,
    active_section_label,
    selected_seats,
    panel_open,
    subtotal,
    set_panel_open,
    zoom_in,
    zoom_out,
    reset_view,
    start_pan,
    do_pan,
    end_pan,
    handle_wheel_zoom,
    select_section,
    is_seat_sold,
    is_seat_selected,
    toggle_seat,
    remove_seat,
  };
}