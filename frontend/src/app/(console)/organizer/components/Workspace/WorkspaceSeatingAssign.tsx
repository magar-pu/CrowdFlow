/**
 * Workspace/WorkspaceSeatingAssign.tsx
 *
 * Event seat painting. The bound venue layout is an untiered, reusable
 * template, so pricing happens here: pick one of the event's ticket tiers,
 * click seats on the map to paint them, and save. Saving writes the per-seat
 * availability matrix (event_seats_matrix) that booking reads from.
 *
 * Seats left unpainted block submitting the event for review (server-side
 * gate — every seat in the layout must carry a tier).
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Pencil, Ticket } from "lucide-react";
import {
  getEventSeating,
  seedEventSeating,
  listTicketTiers,
  type EventSeating,
  type OrganizerTicketTier,
} from "@/lib/api/eorganizer";
import { getLayout, type LayoutDetail } from "@/lib/api/venueLayouts";
import { getSeatMap, seatStatesFrom, type SeatStatus } from "@/lib/api/booking";
import { LayoutPreview } from "@/components/venue-editor/LayoutPreview";
import { tierColorAt } from "@/lib/tierColors";

interface WorkspaceSeatingAssignProps {
  eventId: number;
  /** The event's bound layout id; re-fetches when it changes (e.g. after binding). */
  layoutId: number | null;
}

function formatPrice(p: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(p);
}

// Palette lives in lib/tierColors so the buyer's event-page map draws this
// event in the same colours the organizer painted it in.

export default function WorkspaceSeatingAssign({ eventId, layoutId }: WorkspaceSeatingAssignProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [seating, setSeating] = useState<EventSeating | null>(null);
  const [tiers, setTiers] = useState<OrganizerTicketTier[]>([]);
  const [layout, setLayout] = useState<LayoutDetail | null>(null);
  /** Live seat state, so sold/blocked seats can be shown but not repainted. */
  const [seatStates, setSeatStates] = useState<Map<number, SeatStatus>>(new Map());

  /** seat id -> tier id the user has painted it with (local until saved). */
  const [painted, setPainted] = useState<Map<number, number>>(new Map());
  const [activeTierId, setActiveTierId] = useState<number | null>(null);
  /**
   * The map is read-only until Edit seating is pressed. Pricing is destructive
   * enough (it decides what buyers pay) that a stray click shouldn't change it.
   */
  const [editing, setEditing] = useState(false);
  /** Snapshot taken when editing starts, so Cancel can restore it. */
  const [paintedBeforeEdit, setPaintedBeforeEdit] = useState<Map<number, number>>(new Map());

  const load = useCallback(async () => {
    if (layoutId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const [seatingRes, tiersRes, layoutRes, mapRes] = await Promise.all([
      getEventSeating(eventId),
      listTicketTiers(eventId),
      getLayout(layoutId),
      getSeatMap(eventId),
    ]);

    if (seatingRes.success && seatingRes.data) {
      setSeating(seatingRes.data);
    } else {
      setError(seatingRes.error?.message ?? "Failed to load seating");
    }
    setTiers(tiersRes.success && tiersRes.data ? tiersRes.data : []);
    setLayout(layoutRes.success && layoutRes.data ? layoutRes.data : null);

    // Seed the local painting from what is already saved, so an edit session
    // starts from the current truth rather than a blank map.
    if (mapRes.success && mapRes.data) {
      const existing = new Map<number, number>();
      for (const tier of mapRes.data.tiers) {
        for (const seat of tier.seats) existing.set(seat.seat_id, tier.ticket_tier_id);
      }
      setPainted(existing);
      setSeatStates(seatStatesFrom(mapRes.data));
    }

    setLoading(false);
  }, [eventId, layoutId]);

  useEffect(() => {
    load();
  }, [load]);

  // The brush defaults to the cheapest tier (tiers arrive price-ascending).
  // Derived rather than synced into state, so there is no render where the
  // user has tiers but no brush.
  const brushTierId = activeTierId ?? (tiers.length > 0 ? Number(tiers[0].id) : null);

  const tierColor = useCallback(
    (tierId: number) => {
      const i = tiers.findIndex((t) => Number(t.id) === tierId);
      return tierColorAt(i);
    },
    [tiers]
  );

  /** Seat id -> fill colour, driven by what the user has painted so far. */
  const seatColors = useMemo(() => {
    const colors = new Map<number, string>();
    painted.forEach((tierId, seatId) => colors.set(seatId, tierColor(tierId)));
    return colors;
  }, [painted, tierColor]);

  const startEditing = () => {
    setPaintedBeforeEdit(new Map(painted));
    setEditing(true);
    setSaved(false);
  };

  const cancelEditing = () => {
    setPainted(new Map(paintedBeforeEdit));
    setEditing(false);
    setError(null);
  };

  const paintSeat = useCallback(
    (seatId: number) => {
      if (brushTierId == null) return;
      // Sold and blocked seats are already committed for this event; repainting
      // them would silently reprice a ticket somebody has bought.
      const state = seatStates.get(seatId);
      if (state === "sold" || state === "blocked") return;

      setPainted((prev) => {
        const next = new Map(prev);
        if (next.get(seatId) === brushTierId) {
          next.delete(seatId); // click the same tier again to unpaint
        } else {
          next.set(seatId, brushTierId);
        }
        return next;
      });
      setSaved(false);
    },
    [brushTierId, seatStates]
  );

  const unpaintedCount = useMemo(
    () => (layout ? layout.seats.length - painted.size : 0),
    [layout, painted]
  );

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    // Group the painted seats back into one assignment per tier.
    const byTier = new Map<number, number[]>();
    painted.forEach((tierId, seatId) => {
      const list = byTier.get(tierId) ?? [];
      list.push(seatId);
      byTier.set(tierId, list);
    });
    const assignments = Array.from(byTier.entries()).map(([ticket_tier_id, seat_ids]) => ({
      ticket_tier_id,
      seat_ids,
    }));

    const res = await seedEventSeating(eventId, assignments);
    if (res.success) {
      setSaved(true);
      setEditing(false);
      await load();
    } else {
      setError(res.error?.message ?? "Failed to save seating");
    }
    setSaving(false);
  };

  // No bound layout → nothing to paint here.
  if (layoutId == null) return null;
  if (loading) {
    return (
      <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
        <div className="h-24 animate-pulse rounded-lg bg-surface-container" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm space-y-4 text-left animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-text-primary">Seat Pricing</h3>
          <p className="text-xs text-text-secondary">
            {editing
              ? "Pick a tier, then click seats to price them."
              : "How this event's seats are priced. Press Edit seating to make changes."}
          </p>
        </div>

        {editing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={cancelEditing}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-outline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving || tiers.length === 0 || painted.size === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save seating"}
            </button>
          </div>
        ) : (
          <button
            onClick={startEditing}
            disabled={tiers.length === 0 || !layout || layout.seats.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-container-low px-4 py-2 text-xs font-semibold text-text-primary transition-colors hover:border-outline disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit seating
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-2 text-xs font-semibold text-danger">
          {error}
        </div>
      )}
      {saved && !error && (
        <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-4 py-2 text-xs font-semibold text-success">
          <Check className="h-3.5 w-3.5" /> Seating saved.
        </div>
      )}
      {(seating?.untiered_seats ?? 0) > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-4 py-2 text-xs font-semibold text-warning">
          <AlertTriangle className="h-3.5 w-3.5" />
          {seating!.untiered_seats} saved seat(s) still have no tier — the event can’t be submitted for
          review until every seat is priced.
        </div>
      )}

      {tiers.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-container-low px-4 py-3 text-xs text-text-secondary">
          <Ticket className="h-4 w-4" />
          No ticket tiers yet — create them in the <span className="font-bold">Tickets</span> tab, then price seats here.
        </div>
      ) : !layout || layout.seats.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-subtle px-4 py-6 text-center text-xs text-text-secondary">
          This layout has no seats yet. Place seats in the venue designer first.
        </p>
      ) : (
        <>
          {/* Tier legend; doubles as the brush picker while editing. */}
          <div className="flex flex-wrap gap-2">
            {tiers.map((t) => {
              const id = Number(t.id);
              const isActive = editing && brushTierId === id;
              const count = Array.from(painted.values()).filter((v) => v === id).length;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => editing && setActiveTierId(id)}
                  disabled={!editing}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-primary bg-primary/10 text-text-primary"
                      : "border-border-subtle bg-surface-container-low text-text-secondary"
                  } ${editing ? "hover:border-outline" : "cursor-default"}`}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: tierColor(id) }}
                  />
                  {t.name} · {formatPrice(t.price)}
                  <span className="font-mono text-text-secondary">{count}</span>
                </button>
              );
            })}
          </div>

          <div
            className={`h-[420px] rounded-lg border bg-surface-container-low transition-colors ${
              editing ? "border-primary" : "border-border-subtle"
            }`}
          >
            {/* Omitting on_seat_click entirely keeps the map read-only: seats
                render but are neither focusable nor clickable. */}
            <LayoutPreview
              detail={layout}
              seat_colors={seatColors}
              seat_states={seatStates}
              on_seat_click={editing ? paintSeat : undefined}
            />
          </div>

          <p className="text-xs text-text-secondary">
            {painted.size} of {layout.seats.length} seats priced
            {unpaintedCount > 0 && ` · ${unpaintedCount} still unpriced`}
            {editing
              ? ". Click a painted seat with the same tier selected to clear it. Sold and blocked seats can’t be repriced."
              : "."}
          </p>
        </>
      )}
    </div>
  );
}
