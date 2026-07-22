/**
 * Workspace/WorkspaceLayoutBinder.tsx
 *
 * Event Venue tab: bind the event to one of its venue's saved layouts and render
 * that layout read-only on the floorplan canvas. Reads the binding from the
 * event detail (layout_id), lists the venue's layouts, and PUTs the choice via
 * bindEventLayout. The heavy geometry editing still lives in /venue-designer;
 * this is the event-side "which layout does this event use" + preview.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Maximize2, MapPin } from "lucide-react";
import {
  getEventLayoutBinding,
  bindEventLayout,
  type EventLayoutBinding,
} from "@/lib/api/events";
import {
  listLayouts,
  getLayout,
  type LayoutSummary,
  type LayoutDetail,
} from "@/lib/api/venueLayouts";
import { LayoutPreview } from "@/components/venue-editor/LayoutPreview";
import WorkspaceSeatingAssign from "./WorkspaceSeatingAssign";

interface WorkspaceLayoutBinderProps {
  eventId: number;
}

export default function WorkspaceLayoutBinder({ eventId }: WorkspaceLayoutBinderProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [binding, setBinding] = useState<EventLayoutBinding | null>(null);
  const [layouts, setLayouts] = useState<LayoutSummary[]>([]);
  const [detail, setDetail] = useState<LayoutDetail | null>(null);

  const loadDetail = useCallback(async (layoutId: number | null) => {
    if (layoutId == null) {
      setDetail(null);
      return;
    }
    const res = await getLayout(layoutId);
    setDetail(res.success && res.data ? res.data : null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const b = await getEventLayoutBinding(eventId);
    if (!b.success || !b.data) {
      setError(b.error?.message ?? "Failed to load event venue");
      setLoading(false);
      return;
    }
    setBinding(b.data);
    if (b.data.venue_id > 0) {
      const ls = await listLayouts(b.data.venue_id);
      setLayouts(ls.success && ls.data ? ls.data : []);
    }
    await loadDetail(b.data.layout_id);
    setLoading(false);
  }, [eventId, loadDetail]);

  useEffect(() => {
    load();
  }, [load]);

  const onBind = async (layoutId: number | null) => {
    setSaving(true);
    setError(null);
    const res = await bindEventLayout(eventId, layoutId);
    if (res.success) {
      setBinding((prev) => (prev ? { ...prev, layout_id: layoutId } : prev));
      await loadDetail(layoutId);
    } else {
      setError(res.error?.message ?? "Failed to set layout");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
    <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm space-y-4 text-left animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-text-primary">Event Seat Map</h3>
          <p className="text-xs text-text-secondary">
            The saved venue layout this event uses for seating.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={binding?.layout_id ?? ""}
            disabled={saving || loading || (binding?.venue_id ?? 0) === 0}
            onChange={(e) => onBind(e.target.value === "" ? null : Number(e.target.value))}
            className="h-9 rounded-lg border border-border-subtle bg-surface-container-low px-3 text-xs text-text-primary outline-none focus:border-outline disabled:opacity-50"
          >
            <option value="">— No layout —</option>
            {layouts.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} (#{l.id})
              </option>
            ))}
          </select>
          <Link
            href="/venue-designer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Designer
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-2 text-xs font-semibold text-danger">
          {error}
        </div>
      )}

      <div className="relative min-h-[320px] overflow-hidden rounded-xl border border-border-subtle/50 bg-surface-container-low">
        {loading ? (
          <div className="flex h-[320px] items-center justify-center">
            <span className="text-xs font-mono text-on-surface-variant animate-pulse">Loading seat map…</span>
          </div>
        ) : (binding?.venue_id ?? 0) === 0 ? (
          <div className="flex h-[320px] flex-col items-center justify-center gap-2 text-center">
            <MapPin className="h-6 w-6 text-text-secondary" />
            <p className="text-xs text-text-secondary">This event has no venue set.</p>
          </div>
        ) : detail ? (
          <div className="h-[380px] w-full p-3">
            <LayoutPreview detail={detail} />
          </div>
        ) : (
          <div className="flex h-[320px] flex-col items-center justify-center gap-2 text-center">
            <Layers className="h-6 w-6 text-text-secondary" />
            <p className="text-xs text-text-secondary">
              {layouts.length === 0
                ? "No layouts exist for this venue yet."
                : "No layout bound. Pick one above."}
            </p>
            <Link href="/venue-designer" className="text-xs font-bold text-secondary hover:underline">
              Open the venue designer →
            </Link>
          </div>
        )}
      </div>

      {detail && (
        <p className="text-[11px] font-mono text-text-secondary">
          {detail.name} · {detail.seats.length} seats
        </p>
      )}
    </div>
      <WorkspaceSeatingAssign eventId={eventId} layoutId={binding?.layout_id ?? null} />
    </div>
  );
}
