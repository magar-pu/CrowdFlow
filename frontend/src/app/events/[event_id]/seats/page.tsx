"use client";

/**
 * app/events/[event_id]/seats/page.tsx
 *
 * Buyer seat selection, driven end-to-end by the real seat map:
 *
 *   GET  /events/{id}/seatmap       layout geometry, tiers, per-seat live state
 *   GET  /events/{id}/ticket-tiers  per-transaction cap and remaining quota
 *   POST /booking/holds             locks the selection before checkout
 *
 * The map is the same LayoutPreview the organizer paints with, so buyers see
 * exactly the layout that was designed rather than a stylised approximation.
 *
 * One constraint shapes the whole screen: a hold covers a single ticket tier,
 * so a selection may not span tiers. Seats outside the active tier stay drawn
 * for context but are not clickable, and switching tier clears the selection.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { SeatMapHeader } from "@/components/seat-selection/SeatMapHeader";
import {
  TicketTypeSelector,
  type SelectableTier,
} from "@/components/seat-selection/TicketTypeSelector";
import { MapLegend } from "@/components/seat-selection/MapLegend";
import { MapBottomToolbar } from "@/components/seat-selection/MapBottomToolbar";
import { SelectionPanel } from "@/components/seat-selection/SelectionPanel";
import { LayoutPreview } from "@/components/venue-editor/LayoutPreview";
import { useEventSeatMap } from "@/lib/hooks/useEventSeatMap";
import { useSeatSelection } from "@/lib/hooks/useSeatSelection";
import {
  createHold,
  seatMapToRenderableLayout,
  seatStatesFrom,
  type SeatMapSeat,
} from "@/lib/api/booking";
import { getEvent, listTicketTiers, type PublicTicketTier } from "@/lib/api/events";
import { tierColor } from "@/lib/tierColors";
import { useAuthStore } from "@/lib/store/authStore";
import type { Event } from "@/types/ticket";
import { cn } from "@/lib/utils";

/** Used only when a tier omits max_per_transaction. */
const FALLBACK_MAX_PER_TRANSACTION = 4;

/** Matches the "Tidak tersedia" swatch in MapLegend. */
const UNAVAILABLE_SEAT_COLOR = "#cbd5e1";

export default function SeatSelectionPage() {
  const router = useRouter();
  const params = useParams<{ event_id: string }>();
  const search = useSearchParams();
  const event_id = params?.event_id ?? "";

  const [event, set_event] = useState<Event | null>(null);
  const [public_tiers, set_public_tiers] = useState<PublicTicketTier[]>([]);
  const [active_tier_id, set_active_tier_id] = useState<number | null>(null);
  const [quantity, set_quantity] = useState(0);
  const [is_submitting, set_is_submitting] = useState(false);
  const [hold_error, set_hold_error] = useState<string | null>(null);

  const { seat_map, loading: map_loading, error: map_error, reload } = useEventSeatMap(event_id);

  useEffect(() => {
    if (!event_id) return;
    getEvent(event_id).then((res) => {
      if (res.success && res.data) set_event(res.data);
    });
    listTicketTiers(event_id).then((res) => {
      if (res.success && res.data) set_public_tiers(res.data);
    });
  }, [event_id]);

  /**
   * Assigned tiers first, then GA. Palette index runs over the assigned tiers
   * in the same order the event page uses, so a tier is the same colour on
   * both screens.
   */
  const tiers: SelectableTier[] = useMemo(() => {
    if (!seat_map) return [];

    const quota_of = (id: number) =>
      public_tiers.find((t) => t.ticket_tier_id === id)?.quota_remaining;

    const assigned = seat_map.tiers.map((tier, i) => ({
      ticket_tier_id: tier.ticket_tier_id,
      name: tier.name,
      price: tier.price,
      color: tierColor(tier.color, i),
      available: tier.seats.some((s) => s.status === "available"),
      is_general_admission: false,
    }));

    const ga = seat_map.ga_tiers.map((tier, i) => ({
      ticket_tier_id: tier.ticket_tier_id,
      name: tier.name,
      price: tier.price,
      color: tierColor(null, seat_map.tiers.length + i),
      available: (quota_of(tier.ticket_tier_id) ?? tier.quota_remaining) > 0,
      is_general_admission: true,
    }));

    return [...assigned, ...ga];
  }, [seat_map, public_tiers]);

  const active_tier = tiers.find((t) => t.ticket_tier_id === active_tier_id) ?? null;

  /**
   * The cap the backend will enforce anyway; mirrored here so the UI refuses
   * before the round trip rather than after.
   */
  const max_per_transaction = useMemo(() => {
    const from_api = public_tiers.find(
      (t) => t.ticket_tier_id === active_tier_id
    )?.max_per_transaction;
    return from_api && from_api > 0 ? from_api : FALLBACK_MAX_PER_TRANSACTION;
  }, [public_tiers, active_tier_id]);

  const max_ga_quantity = useMemo(() => {
    const quota =
      public_tiers.find((t) => t.ticket_tier_id === active_tier_id)?.quota_remaining ??
      seat_map?.ga_tiers.find((t) => t.ticket_tier_id === active_tier_id)?.quota_remaining ??
      0;
    return Math.min(max_per_transaction, quota);
  }, [public_tiers, seat_map, active_tier_id, max_per_transaction]);

  const {
    zoom, pan_x, pan_y,
    zoom_in, zoom_out, reset_view,
    start_pan, do_pan, end_pan, handle_wheel_zoom,
    chosen_seats, selected_seat_ids, limit_notice,
    toggle_seat, remove_seat, clear_seats,
  } = useSeatSelection({ max_seats: max_per_transaction });

  // Default to the tier the buyer picked on the event page, else the first one
  // with anything left. Runs once tiers exist and only while none is chosen.
  useEffect(() => {
    if (active_tier_id !== null || tiers.length === 0) return;
    const from_query = Number(search?.get("ticket_category_id"));
    const requested = tiers.find((t) => t.ticket_tier_id === from_query);
    const chosen = requested ?? tiers.find((t) => t.available) ?? tiers[0];
    set_active_tier_id(chosen.ticket_tier_id);
    if (chosen.is_general_admission) {
      set_quantity(1);
    }
  }, [tiers, active_tier_id, search]);

  function handle_select_tier(next_id: number) {
    if (next_id === active_tier_id) return;
    // A hold covers one tier, so carrying seats across would silently drop them.
    clear_seats();
    const target = tiers.find((t) => t.ticket_tier_id === next_id);
    set_quantity(target?.is_general_admission ? 1 : 0);
    set_hold_error(null);
    set_active_tier_id(next_id);
  }

  const renderable = useMemo(
    () => (seat_map ? seatMapToRenderableLayout(seat_map) : null),
    [seat_map]
  );
  const seat_states = useMemo(
    () => (seat_map ? seatStatesFrom(seat_map) : new Map()),
    [seat_map]
  );

  /** Every seat drawn, by id, so a click can be resolved back to its seat. */
  const seats_by_id = useMemo(() => {
    const map = new Map<number, SeatMapSeat>();
    seat_map?.tiers.forEach((t) => t.seats.forEach((s) => map.set(s.seat_id, s)));
    return map;
  }, [seat_map]);

  /** Seats of the active tier — the only ones clickable. */
  const selectable_seat_ids = useMemo(() => {
    const ids = new Set<number>();
    seat_map?.tiers
      .filter((t) => t.ticket_tier_id === active_tier_id)
      .forEach((t) => t.seats.forEach((s) => ids.add(s.seat_id)));
    return ids;
  }, [seat_map, active_tier_id]);

  /**
   * Tier colour per seat, so the map reads the same as the event page — but
   * only for seats that can actually be bought. Anything sold, held or blocked
   * is greyed instead: seat_colors outranks status inside LayoutPreview, so
   * colouring those by tier would leave "Tidak tersedia" in the legend matching
   * nothing on the map, and a buyer has no reason to care WHY a seat is gone.
   */
  const seat_colors = useMemo(() => {
    const colors = new Map<number, string>();
    seat_map?.tiers.forEach((tier, i) => {
      const color = tierColor(tier.color, i);
      tier.seats.forEach((s) =>
        colors.set(s.seat_id, s.status === "available" ? color : UNAVAILABLE_SEAT_COLOR)
      );
    });
    return colors;
  }, [seat_map]);

  /** Back here, with this tier, after logging in. */
  function login_redirect() {
    const back = `/events/${event_id}/seats?ticket_category_id=${active_tier_id ?? ""}`;
    router.push(`/login?from=${encodeURIComponent(back)}`);
  }

  async function handle_proceed() {
    if (!active_tier) return;

    // Browsing the map is public but holding is not, and a signed-out browser
    // has no csrf_token cookie either — so the request would be rejected as
    // CSRF_TOKEN_MISSING (403) before ever reaching the auth middleware, never
    // as 401. Check the session here rather than trying to read intent out of
    // that response.
    if (!useAuthStore.getState().is_authenticated) {
      login_redirect();
      return;
    }

    set_is_submitting(true);
    set_hold_error(null);

    const res = await createHold({
      event_id: Number(event_id),
      ticket_tier_id: active_tier.ticket_tier_id,
      ...(active_tier.is_general_admission
        ? { quantity }
        : { seat_ids: chosen_seats.map((s) => s.seat_id) }),
    });

    set_is_submitting(false);

    if (res.success && res.data) {
      const qty = active_tier.is_general_admission ? quantity : chosen_seats.length;
      router.push(
        `/checkout/${event_id}?hold_token=${encodeURIComponent(res.data.hold_token)}&ticket_category_id=${active_tier.ticket_tier_id}&quantity=${qty || 1}&price=${active_tier.price}&name=${encodeURIComponent(active_tier.name)}`
      );
      return;
    }

    // A session that lapsed between the check above and this call. Matched on
    // the error code because ApiResponse carries no HTTP status.
    const session_codes = ["UNAUTHORIZED", "CSRF_TOKEN_MISSING", "CSRF_HEADER_MISSING", "CSRF_TOKEN_MISMATCH"];
    if (res.error && session_codes.includes(res.error.code)) {
      login_redirect();
      return;
    }

    // Anything else usually means someone took a seat first. The hold is
    // all-or-nothing, so nothing is locked — refetch and let them pick again.
    set_hold_error(
      res.error?.message ?? "Kursi yang dipilih baru saja diambil. Silakan pilih ulang."
    );
    clear_seats();
    reload();
  }

  const event_date = event
    ? new Date(event.starts_at).toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "";
  const event_time = event
    ? new Date(event.starts_at).toLocaleTimeString("id-ID", {
        hour: "2-digit", minute: "2-digit",
      })
    : "";

  const has_selection = active_tier?.is_general_admission
    ? quantity > 0
    : chosen_seats.length > 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8F9FA]">
      <SeatMapHeader
        event_title={event?.title ?? "Pilih Kursi"}
        event_date={event_date}
        event_time={event_time}
        event_venue={event?.venue?.name ?? ""}
        on_close={() => router.push(`/events/${event_id}`)}
      />

      <TicketTypeSelector
        tiers={tiers}
        active_tier_id={active_tier_id}
        on_select={handle_select_tier}
      />

      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="relative h-full flex-1">
          {map_loading ? (
            <div className="flex h-full items-center justify-center">
              <p className="font-body-sm text-body-sm text-text-secondary">Memuat denah kursi...</p>
            </div>
          ) : map_error ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="font-body-sm text-body-sm text-danger">{map_error}</p>
            </div>
          ) : active_tier?.is_general_admission ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="font-headline-sm text-headline-sm font-bold text-text-primary">
                {active_tier.name}
              </p>
              <p className="max-w-sm font-body-sm text-body-sm text-text-secondary">
                Kategori ini bebas memilih tempat. Tentukan jumlah tiket di panel
                sebelah, lalu lanjut ke pembayaran.
              </p>
            </div>
          ) : renderable ? (
            <div
              className={cn("h-full w-full", "cursor-grab active:cursor-grabbing")}
              onMouseDown={(e) => start_pan(e.clientX, e.clientY)}
              onMouseMove={(e) => do_pan(e.clientX, e.clientY)}
              onMouseUp={end_pan}
              onMouseLeave={end_pan}
              onWheel={(e) => handle_wheel_zoom(e.deltaY)}
            >
              <LayoutPreview
                detail={renderable}
                seat_states={seat_states}
                seat_colors={seat_colors}
                selected_seat_ids={selected_seat_ids}
                selectable_seat_ids={selectable_seat_ids}
                transform={{ zoom, pan_x, pan_y }}
                on_seat_click={(seat_id) => {
                  const seat = seats_by_id.get(seat_id);
                  if (seat && active_tier) toggle_seat(seat, active_tier.price);
                }}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="font-body-sm text-body-sm text-text-secondary">
                Event ini belum memiliki denah kursi.
              </p>
            </div>
          )}

          {!map_loading && !active_tier?.is_general_admission && tiers.length > 0 && (
            <>
              <MapLegend tiers={tiers} />
              <MapBottomToolbar
                on_zoom_in={zoom_in}
                on_zoom_out={zoom_out}
                on_fullscreen={reset_view}
              />
            </>
          )}
        </div>

        {/* Right panel (desktop) / bottom sheet (mobile) */}
        <aside
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] shrink-0 flex-col rounded-t-3xl border-t border-border-subtle bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-transform duration-300 translate-y-0",
            "md:static md:h-full md:w-[360px] md:rounded-none md:border-l md:border-t-0 md:shadow-[-4px_0_24px_rgba(0,0,0,0.04)]"
          )}
        >
          <SelectionPanel
            event_id={event_id}
            active_tier={active_tier}
            chosen_seats={chosen_seats}
            quantity={quantity}
            max_quantity={max_ga_quantity}
            notice={hold_error ?? limit_notice}
            is_submitting={is_submitting}
            on_remove_seat={remove_seat}
            on_change_quantity={(next) =>
              set_quantity(Math.min(Math.max(0, next), max_ga_quantity))
            }
            on_proceed={handle_proceed}
          />
        </aside>
      </main>
    </div>
  );
}
