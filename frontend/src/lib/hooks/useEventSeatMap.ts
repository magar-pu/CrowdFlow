/**
 * lib/hooks/useEventSeatMap.ts
 *
 * Loads an event's public seat map (GET /events/{id}/seatmap) for read-only
 * display. Keeps the request out of the components that draw it, per the
 * architecture rule that components do not fetch.
 *
 * The endpoint is public, so this works for signed-out browsers on the event
 * detail page. Buying flows want the interactive state in `useSeatMap` instead;
 * this hook only fetches.
 */

"use client";

import { useEffect, useState } from "react";
import { getSeatMap, type SeatMap } from "@/lib/api/booking";

interface UseEventSeatMapResult {
  seat_map: SeatMap | null;
  loading: boolean;
  /** Set only when the request itself failed. An event with no seating is not an error. */
  error: string | null;
}

export function useEventSeatMap(event_id: string | number | undefined): UseEventSeatMapResult {
  const [seat_map, set_seat_map] = useState<SeatMap | null>(null);
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState<string | null>(null);

  useEffect(() => {
    if (event_id === undefined || event_id === null || event_id === "") {
      set_loading(false);
      return;
    }

    // Guards against a slow response for a previous event id overwriting a
    // newer one when the user navigates between events.
    let active = true;

    set_loading(true);
    set_error(null);

    getSeatMap(event_id)
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          set_seat_map(res.data);
        } else {
          set_seat_map(null);
          set_error(res.error?.message ?? "Gagal memuat denah venue.");
        }
      })
      .catch(() => {
        if (!active) return;
        set_seat_map(null);
        set_error("Gagal memuat denah venue.");
      })
      .finally(() => {
        if (active) set_loading(false);
      });

    return () => {
      active = false;
    };
  }, [event_id]);

  return { seat_map, loading, error };
}
