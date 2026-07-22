/**
 * Workspace/WorkspaceSeatingAssign.tsx
 *
 * Phase 4 seat overlay UI. For the event's bound layout, assign each physical
 * section to one of the event's ticket tiers and save — which seeds the
 * per-seat availability matrix (event_sections + event_seats_matrix) booking
 * reads from. Untiered sectioned seats block submitting the event for review
 * (the server-side publish gate, Phase 5).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Ticket } from "lucide-react";
import {
  getEventSeating,
  seedEventSeating,
  listTicketTiers,
  type EventSeating,
  type OrganizerTicketTier,
} from "@/lib/api/eorganizer";

interface WorkspaceSeatingAssignProps {
  eventId: number;
  /** The event's bound layout id; re-fetches when it changes (e.g. after binding). */
  layoutId: number | null;
}

function formatPrice(p: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(p);
}

export default function WorkspaceSeatingAssign({ eventId, layoutId }: WorkspaceSeatingAssignProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [seating, setSeating] = useState<EventSeating | null>(null);
  const [tiers, setTiers] = useState<OrganizerTicketTier[]>([]);
  // venue_section_id -> tier id (string, "" = unassigned)
  const [assign, setAssign] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [s, t] = await Promise.all([getEventSeating(eventId), listTicketTiers(eventId)]);
    if (s.success && s.data) {
      setSeating(s.data);
      const init: Record<number, string> = {};
      s.data.sections.forEach((sec) => {
        init[sec.venue_section_id] = sec.ticket_tier_id != null ? String(sec.ticket_tier_id) : "";
      });
      setAssign(init);
    } else {
      setError(s.error?.message ?? "Failed to load seating");
    }
    setTiers(t.success && t.data ? t.data : []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load, layoutId]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    const assignments = Object.entries(assign)
      .filter(([, tierId]) => tierId !== "")
      .map(([sectionId, tierId]) => ({
        venue_section_id: Number(sectionId),
        ticket_tier_id: Number(tierId),
      }));
    const res = await seedEventSeating(eventId, assignments);
    if (res.success) {
      setSaved(true);
      await load();
    } else {
      setError(res.error?.message ?? "Failed to save seating");
    }
    setSaving(false);
  };

  // No bound layout → nothing to tier here.
  if (layoutId == null) return null;
  if (loading) {
    return (
      <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
        <div className="h-24 animate-pulse rounded-lg bg-surface-container" />
      </div>
    );
  }

  const sections = seating?.sections ?? [];

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm space-y-4 text-left animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-text-primary">Seat Pricing</h3>
          <p className="text-xs text-text-secondary">
            Assign each section to a ticket tier. Saving seeds the seat map buyers select from.
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={saving || tiers.length === 0 || sections.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save seating"}
        </button>
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
          {seating!.untiered_seats} seat(s) not yet tiered — the event can’t be submitted for review until every seat has a tier.
        </div>
      )}

      {tiers.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-container-low px-4 py-3 text-xs text-text-secondary">
          <Ticket className="h-4 w-4" />
          No ticket tiers yet — create them in the <span className="font-bold">Tickets</span> tab, then assign sections here.
        </div>
      ) : sections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-subtle px-4 py-6 text-center text-xs text-text-secondary">
          This layout has no sections. Add section zones in the venue designer.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-left text-text-secondary">
                <th className="py-2 pr-3 font-semibold">Section</th>
                <th className="py-2 pr-3 font-semibold">Seats</th>
                <th className="py-2 pr-3 font-semibold">Sold</th>
                <th className="py-2 font-semibold">Ticket tier</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((sec) => (
                <tr key={sec.venue_section_id} className="border-b border-border-subtle/50">
                  <td className="py-2 pr-3 font-bold text-text-primary">{sec.section_name}</td>
                  <td className="py-2 pr-3 font-mono text-text-secondary">{sec.seat_count}</td>
                  <td className="py-2 pr-3 font-mono text-text-secondary">{sec.sold}</td>
                  <td className="py-2">
                    <select
                      value={assign[sec.venue_section_id] ?? ""}
                      onChange={(e) =>
                        setAssign((prev) => ({ ...prev, [sec.venue_section_id]: e.target.value }))
                      }
                      className="h-9 w-full max-w-xs rounded-lg border border-border-subtle bg-surface-container-low px-2 text-text-primary outline-none focus:border-outline"
                    >
                      <option value="">— Unassigned —</option>
                      {tiers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · {formatPrice(t.price)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
