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
 * A seated selection may span ticket tiers: the hold sends seat ids only and
 * the server resolves each seat's tier from event_seats_matrix, so mixing VIP
 * and Regular in one order is a single hold and a single order. The purchase
 * cap is one total across every tier (event.max_tickets_per_order), so a limit
 * of 10 permits 6 VIP and 4 Regular.
 *
 * General admission is the exception. It has no seats to derive a tier from and
 * its inventory is a per-tier counter, so it remains one tier per hold — which
 * is why choosing a GA tier clears any seats and vice versa.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { SeatMapHeader } from "@/components/seat-selection/SeatMapHeader";
import {
  TicketTypeSelector,
  type SelectableTier,
  type SelectionMode,
} from "@/components/seat-selection/TicketTypeSelector";
import { GaTierCards } from "@/components/seat-selection/GaTierCards";
import { MapLegend } from "@/components/seat-selection/MapLegend";
import { MapZoomControls } from "@/components/seat-selection/MapZoomControls";
import { SelectionPanel } from "@/components/seat-selection/SelectionPanel";
import { LayoutPreview } from "@/components/venue-editor/LayoutPreview";
import { useEventSeatMap } from "@/lib/hooks/useEventSeatMap";
import { useSeatSelection } from "@/lib/hooks/useSeatSelection";
import { useHoldCountdown } from "@/lib/hooks/useHoldCountdown";
import { readStoredHoldToken, storeHoldToken } from "@/lib/holdStorage";
import {
  createHold,
  getHold,
  releaseHold,
  seatMapToRenderableLayout,
  seatStatesFrom,
  type HoldDetail,
  type SeatMapSeat,
} from "@/lib/api/booking";
import { getEvent, listTicketTiers, type PublicTicketTier } from "@/lib/api/events";
import { tierColor } from "@/lib/tierColors";
import { useAuthStore } from "@/lib/store/authStore";
import { canPurchase, BUYER_BLOCKED_MESSAGE } from "@/lib/buyerGate";
import type { Event } from "@/types/ticket";
import { cn } from "@/lib/utils";

/**
 * Used only when the event payload has not arrived yet. 0 would read as
 * "uncapped" and briefly let the buyer over-select before the real cap loads,
 * so the placeholder is restrictive rather than permissive.
 */
const FALLBACK_MAX_PER_ORDER = 1;

/** Matches the "Unavailable" swatch in MapLegend. */
const UNAVAILABLE_SEAT_COLOR = "#cbd5e1";

/** Order-independent comparison of two seat-id selections. */
function sameSeats(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sorted_a = [...a].sort((x, y) => x - y);
  const sorted_b = [...b].sort((x, y) => x - y);
  return sorted_a.every((id, i) => id === sorted_b[i]);
}

export default function SeatSelectionPage() {
  const router = useRouter();
  const params = useParams<{ event_id: string }>();
  const search = useSearchParams();
  const event_id = params?.event_id ?? "";

  const [event, set_event] = useState<Event | null>(null);
  const [public_tiers, set_public_tiers] = useState<PublicTicketTier[]>([]);
  // Null means "the buyer hasn't chosen yet, follow the default below".
  // Derived rather than seeded in an effect, so the first paint is already
  // correct instead of flipping once tiers arrive.
  const [chosen_mode, set_chosen_mode] = useState<SelectionMode | null>(null);
  const [chosen_ga_tier_id, set_chosen_ga_tier_id] = useState<number | null>(null);
  const [quantity, set_quantity] = useState(0);
  const [is_submitting, set_is_submitting] = useState(false);
  const [hold_error, set_hold_error] = useState<string | null>(null);
  /** A hold this buyer already owns for this event, restored on return. */
  const [active_hold, set_active_hold] = useState<HoldDetail | null>(null);

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

    const ga = seat_map.ga_tiers.map((tier, i) => {
      const remaining = quota_of(tier.ticket_tier_id) ?? tier.quota_remaining;
      return {
        ticket_tier_id: tier.ticket_tier_id,
        name: tier.name,
        price: tier.price,
        color: tierColor(null, seat_map.tiers.length + i),
        available: remaining > 0,
        is_general_admission: true,
        description: tier.description,
        quota_remaining: remaining,
      };
    });

    return [...assigned, ...ga];
  }, [seat_map, public_tiers]);

  const has_seated = tiers.some((t) => !t.is_general_admission);

  /**
   * A tier named in the URL (from an older link, when the event page still
   * picked one) only decides the starting mode now — seats are no longer
   * filtered by it, so a seated tier there means nothing.
   */
  const url_ga_tier_id = useMemo(() => {
    const from_query = Number(search?.get("ticket_category_id"));
    const requested = tiers.find((t) => t.ticket_tier_id === from_query);
    return requested?.is_general_admission ? requested.ticket_tier_id : null;
  }, [tiers, search]);

  // An event with no seated tiers has no map to start on.
  const mode: SelectionMode =
    chosen_mode ?? (has_seated && url_ga_tier_id === null ? "seats" : "ga");

  const ga_tier_id =
    chosen_ga_tier_id ??
    url_ga_tier_id ??
    tiers.find((t) => t.is_general_admission && t.available)?.ticket_tier_id ??
    tiers.find((t) => t.is_general_admission)?.ticket_tier_id ??
    null;

  const active_ga_tier =
    mode === "ga" ? tiers.find((t) => t.ticket_tier_id === ga_tier_id) ?? null : null;

  /**
   * The event's single cap on the whole order, across every tier. The backend
   * enforces the same number in CreateHold; mirrored here so the UI refuses
   * before the round trip rather than after.
   *
   * 0 from the server genuinely means uncapped, so it is passed through as-is;
   * only a not-yet-loaded event falls back.
   */
  // `??` not `||`: 0 is a real value here (uncapped) and must survive, while a
  // missing field — an event that hasn't loaded, or a backend older than 0030
  // — falls back to the restrictive placeholder rather than to "no limit".
  const max_per_order = event?.max_tickets_per_order ?? FALLBACK_MAX_PER_ORDER;

  const max_ga_quantity = useMemo(() => {
    if (ga_tier_id === null) return 0;
    const quota =
      public_tiers.find((t) => t.ticket_tier_id === ga_tier_id)?.quota_remaining ??
      seat_map?.ga_tiers.find((t) => t.ticket_tier_id === ga_tier_id)?.quota_remaining ??
      0;
    // GA is a single tier per hold, so the order cap and the tier's remaining
    // stock are the only two bounds. An uncapped event is bounded by quota
    // alone.
    return max_per_order > 0 ? Math.min(max_per_order, quota) : quota;
  }, [public_tiers, seat_map, ga_tier_id, max_per_order]);

  const {
    zoom, pan_x, pan_y,
    zoom_in, zoom_out, reset_view, can_zoom_in, can_zoom_out, is_default_view,
    start_pan, do_pan, end_pan, handle_wheel_zoom,
    chosen_seats, seat_groups, selected_seat_ids, limit_notice,
    toggle_seat, restore_seats, remove_seat, clear_seats,
  } = useSeatSelection({ max_total: max_per_order });

  /**
   * Rebuild the selection from a hold this buyer still owns. Everything the
   * chips and the cart need is on the hold itself, so this does not wait for
   * the seat map.
   */
  useEffect(() => {
    if (!event_id) return;
    const token = readStoredHoldToken(event_id);
    if (!token) return;

    let cancelled = false;
    getHold(token).then((res) => {
      if (cancelled) return;
      if (!res.success || !res.data) {
        // Expired, released, or from another session — forget it rather than
        // leaving a dead token to fail again on the next visit.
        storeHoldToken(event_id, null);
        return;
      }

      set_active_hold(res.data);

      const seated = res.data.items.filter((item) => item.seats.length > 0);
      if (seated.length > 0) {
        restore_seats(
          seated.flatMap((item) =>
            item.seats.map((seat) => ({
              seat_id: seat.seat_id,
              row: seat.row,
              number: seat.number,
              ticket_tier_id: item.ticket_tier_id,
              tier_name: item.tier_name,
              unit_face_value: item.unit_price,
            }))
          )
        );
        return;
      }

      // General admission: no seats, so restore the tier and quantity instead.
      const ga = res.data.items[0];
      if (ga) {
        set_chosen_mode("ga");
        set_chosen_ga_tier_id(ga.ticket_tier_id);
        set_quantity(ga.quantity);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [event_id, restore_seats]);

  /**
   * The hold lapsed while the buyer was still on the map. Redis released those
   * seats the moment the key died, so what is drawn as "yours" is no longer
   * yours — drop the selection, forget the token, and refetch so the map shows
   * who holds them now. Letting it stand would send them to checkout with a
   * dead token and fail there instead.
   */
  const handle_hold_expired = useCallback(() => {
    storeHoldToken(event_id, null);
    set_active_hold(null);
    clear_seats();
    set_quantity(0);
    set_hold_error(
      "Your hold expired and the tickets were released. Please choose again."
    );
    reload();
  }, [event_id, clear_seats, reload]);

  const { seconds_left: hold_seconds_left, is_expired: hold_expired } =
    useHoldCountdown(active_hold?.expires_at ?? null, handle_hold_expired);

  /**
   * Seats locked by THIS buyer's hold. The seat map reports them as "held",
   * which is correct for everyone else and wrong for them.
   */
  const my_held_seat_ids = useMemo(() => {
    const ids = new Set<number>();
    active_hold?.items.forEach((item) =>
      item.seats.forEach((seat) => ids.add(seat.seat_id))
    );
    return ids;
  }, [active_hold]);

  function handle_choose_seats() {
    if (mode === "seats") return;
    // Seats and GA cannot share a hold, so switching drops the other side.
    set_quantity(0);
    set_hold_error(null);
    set_chosen_mode("seats");
  }

  function handle_choose_ga(next_id: number) {
    if (mode === "ga" && next_id === ga_tier_id) return;
    clear_seats();
    const target = tiers.find((t) => t.ticket_tier_id === next_id);
    set_quantity(target?.is_general_admission ? 1 : 0);
    set_hold_error(null);
    set_chosen_mode("ga");
    set_chosen_ga_tier_id(next_id);
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

  /** The tier each seat belongs to, so a click knows what it is adding. */
  const tier_by_seat_id = useMemo(() => {
    const map = new Map<number, SelectableTier>();
    seat_map?.tiers.forEach((t) => {
      const tier = tiers.find((x) => x.ticket_tier_id === t.ticket_tier_id);
      if (!tier) return;
      t.seats.forEach((s) => map.set(s.seat_id, tier));
    });
    return map;
  }, [seat_map, tiers]);

  /**
   * Every available seat is clickable, whatever its tier — that is the point of
   * a mixed selection. Only GA mode takes the map out of play.
   */
  const selectable_seat_ids = useMemo(() => {
    const ids = new Set<number>();
    if (mode !== "seats") return ids;
    seat_map?.tiers.forEach((t) =>
      t.seats.forEach((s) => {
        // Seats this buyer is already holding read as "held" from the server;
        // to them they are still theirs to keep or give up.
        if (s.status === "available" || my_held_seat_ids.has(s.seat_id)) {
          ids.add(s.seat_id);
        }
      })
    );
    return ids;
  }, [seat_map, mode, my_held_seat_ids]);

  /**
   * Tier colour per seat, so the map reads the same as the event page — but
   * only for seats that can actually be bought. Anything sold, held or blocked
   * is greyed instead: seat_colors outranks status inside LayoutPreview, so
   * colouring those by tier would leave "Unavailable" in the legend matching
   * nothing on the map, and a buyer has no reason to care WHY a seat is gone.
   */
  const seat_colors = useMemo(() => {
    const colors = new Map<number, string>();
    seat_map?.tiers.forEach((tier, i) => {
      const color = tierColor(tier.color, i);
      tier.seats.forEach((s) => {
        const mine = my_held_seat_ids.has(s.seat_id);
        colors.set(
          s.seat_id,
          s.status === "available" || mine ? color : UNAVAILABLE_SEAT_COLOR
        );
      });
    });
    return colors;
  }, [seat_map, my_held_seat_ids]);

  /** Back here after logging in. */
  function login_redirect() {
    const back = `/events/${event_id}/seats`;
    router.push(`/login?from=${encodeURIComponent(back)}`);
  }

  async function handle_proceed() {
    set_hold_error(null);

    // Browsing the map is public but holding is not, and a signed-out browser
    // has no csrf_token cookie either — so the request would be rejected as
    // CSRF_TOKEN_MISSING (403) before ever reaching the auth middleware, never
    // as 401. Check the session here rather than trying to read intent out of
    // that response.
    if (!useAuthStore.getState().is_authenticated) {
      login_redirect();
      return;
    }

    // Same check the server makes (RequireBuyer) — caught here so the buyer
    // sees the reason immediately instead of a hold request round-tripping
    // just to come back with the same 403.
    if (!canPurchase(useAuthStore.getState().user)) {
      set_hold_error(BUYER_BLOCKED_MESSAGE);
      return;
    }

    set_is_submitting(true);

    const seat_ids = chosen_seats.map((s) => s.seat_id);

    // Unchanged from the hold already owned: reuse it rather than releasing and
    // re-acquiring the same seats, which would briefly put them back on sale.
    if (active_hold && mode === "seats" && sameSeats(seat_ids, [...my_held_seat_ids])) {
      set_is_submitting(false);
      router.push(
        `/checkout/${event_id}?hold_token=${encodeURIComponent(active_hold.hold_token)}`
      );
      return;
    }

    // The selection changed. The old hold still locks its seats — including any
    // the buyer kept — so it has to go before the new one can take them.
    if (active_hold) {
      await releaseHold(active_hold.hold_token);
      storeHoldToken(event_id, null);
      set_active_hold(null);
    }

    // Seat ids only: the server derives each seat's tier, so a mixed selection
    // needs no tier from us and cannot be mispriced by us.
    const res = await createHold(
      mode === "ga" && active_ga_tier
        ? {
            event_id: Number(event_id),
            ticket_tier_id: active_ga_tier.ticket_tier_id,
            quantity,
          }
        : { event_id: Number(event_id), seat_ids }
    );

    set_is_submitting(false);

    if (res.success && res.data) {
      storeHoldToken(event_id, res.data.hold_token);
      const active_tier = active_ga_tier || tiers[0] || { ticket_tier_id: 1, price: 0, name: "Ticket", is_general_admission: false };
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
      res.error?.message ?? "Those seats were just taken. Please choose again."
    );
    clear_seats();
    reload();
  }

  const event_date = event
    ? new Date(event.starts_at).toLocaleDateString("en-US", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "";
  const event_time = event
    ? new Date(event.starts_at).toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit",
      })
    : "";

  // Mobile bottom sheet. Explicit state rather than "is anything selected",
  // which forced the sheet open over the map on the first seat click and gave
  // no way back short of clearing the selection. Collapsed still shows the
  // running count and total in the header, so picking seats needs no round
  // trip through the sheet.
  const [sheet_open, set_sheet_open] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8F9FA]">
      <SeatMapHeader
        event_title={event?.title ?? "Select Seats"}
        event_date={event_date}
        event_time={event_time}
        event_venue={event?.venue?.name ?? ""}
        hold_seconds_left={active_hold ? hold_seconds_left : null}
        hold_expired={hold_expired}
        on_close={() => router.push(`/events/${event_id}`)}
      />

      {/* Redundant once the GA card grid fills the main area AND there is no
          seated option to switch to: the same chips would appear twice with
          nothing left for the strip to uniquely offer. Kept for a mixed
          event, where it still carries the one thing the cards cannot
          express — the Reserved Seats / GA mode switch. */}
      {has_seated && (
        <TicketTypeSelector
          tiers={tiers}
          mode={mode}
          active_ga_tier_id={ga_tier_id}
          on_choose_seats={handle_choose_seats}
          on_choose_ga={handle_choose_ga}
        />
      )}

      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="relative h-full flex-1">
          {map_loading ? (
            <div className="flex h-full items-center justify-center">
              <p className="font-body-sm text-body-sm text-text-secondary">Loading the seat map…</p>
            </div>
          ) : map_error ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="font-body-sm text-body-sm text-danger">{map_error}</p>
            </div>
          ) : tiers.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="font-body-sm text-body-sm text-text-secondary">
                No tickets are on sale for this event right now.
              </p>
            </div>
          ) : mode === "ga" && active_ga_tier ? (
            <GaTierCards
              tiers={tiers.filter((t) => t.is_general_admission)}
              active_tier_id={ga_tier_id}
              on_choose={handle_choose_ga}
            />
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
                  const tier = tier_by_seat_id.get(seat_id);
                  if (seat && tier) {
                    toggle_seat(seat, {
                      ticket_tier_id: tier.ticket_tier_id,
                      name: tier.name,
                      price: tier.price,
                      color: tier.color,
                    });
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="font-body-sm text-body-sm text-text-secondary">
                This event doesn&apos;t have a seat map yet.
              </p>
            </div>
          )}

          {/* Only over an actual map: the GA panel and the empty states have
              nothing to zoom. Legend sits bottom-left, zoom top-right, so
              neither covers the other or the middle of the map. */}
          {!map_loading && mode === "seats" && tiers.length > 0 && renderable && (
            <>
              <MapLegend tiers={tiers} />
              <MapZoomControls
                on_zoom_in={zoom_in}
                on_zoom_out={zoom_out}
                on_reset_view={reset_view}
                can_zoom_in={can_zoom_in}
                can_zoom_out={can_zoom_out}
                is_default_view={is_default_view}
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
            active_tier={active_ga_tier}
            seat_groups={seat_groups}
            quantity={quantity}
            max_quantity={max_ga_quantity}
            notice={hold_error ?? limit_notice}
            is_submitting={is_submitting}
            on_remove_seat={remove_seat}
            on_change_quantity={(next) =>
              set_quantity(Math.min(Math.max(0, next), max_ga_quantity))
            }
            on_proceed={handle_proceed}
            is_sheet_open={sheet_open}
            on_toggle_sheet={() => set_sheet_open((open) => !open)}
          />
        </aside>
      </main>
    </div>
  );
}
