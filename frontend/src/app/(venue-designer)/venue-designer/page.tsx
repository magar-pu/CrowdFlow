/**
 * app/(venue-designer)/venue-designer/page.tsx
 *
 * Venue-designer landing / selector. Pick a venue, then pick one of that venue's
 * layouts to edit — or create a new named one — before entering the full-screen
 * geometry designer at /venue-designer/edit?venueId=&layoutId=. This is what
 * gives the designer its "which venue / which layout" context; the layout list
 * is owner-scoped by the backend (your own + public), so organizers no longer
 * land in each other's layouts. Guarded by the (venue-designer) AuthGuard.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Layers, ChevronRight, Lock, Globe } from "lucide-react";
import { listVenues, type Venue } from "@/lib/api/venues";
import { listLayouts, createLayout, type LayoutSummary } from "@/lib/api/venueLayouts";

export default function VenueDesignerSelectorPage() {
  const router = useRouter();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [layouts, setLayouts] = useState<LayoutSummary[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [loadingLayouts, setLoadingLayouts] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadLayouts = useCallback(async (venueId: number) => {
    setLoadingLayouts(true);
    setError(null);
    const res = await listLayouts(venueId);
    if (res.success && res.data) {
      setLayouts(res.data);
    } else {
      setLayouts([]);
      setError(res.error?.message ?? "Failed to load layouts");
    }
    setLoadingLayouts(false);
  }, []);

  // Load venues once; auto-select the first so the page isn't empty on arrival.
  useEffect(() => {
    let cancelled = false;
    listVenues().then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setVenues(res.data);
        if (res.data.length > 0) {
          setSelectedVenueId(res.data[0].venue_id);
          loadLayouts(res.data[0].venue_id);
        }
      } else {
        setError(res.error?.message ?? "Failed to load venues");
      }
      setLoadingVenues(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadLayouts]);

  const onSelectVenue = (venueId: number) => {
    setSelectedVenueId(venueId);
    setNewName("");
    loadLayouts(venueId);
  };

  const openLayout = (layoutId: number) => {
    if (selectedVenueId == null) return;
    router.push(`/venue-designer/edit?venueId=${selectedVenueId}&layoutId=${layoutId}`);
  };

  const onCreate = async () => {
    if (selectedVenueId == null || !newName.trim()) return;
    setCreating(true);
    setError(null);
    // Explicit event_exclusive keeps new layouts owner-only (the API defaults an
    // omitted visibility to public).
    const res = await createLayout(selectedVenueId, {
      name: newName.trim(),
      visibility: "event_exclusive",
    });
    setCreating(false);
    if (res.success && res.data) {
      openLayout(res.data.id);
    } else {
      setError(res.error?.message ?? "Failed to create layout");
    }
  };

  return (
    <div className="min-h-screen w-full bg-surface-dim px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          <h1 className="text-2xl font-black text-text-primary" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
            Venue Designer
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Choose a venue, then open or create a seat-map layout to edit.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-semibold text-danger">
            {error}
          </div>
        )}

        {/* Venue picker */}
        <section className="mb-6">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-text-primary">
            <Building2 className="h-3.5 w-3.5" /> Venue
          </label>
          {loadingVenues ? (
            <div className="h-11 w-full animate-pulse rounded-lg bg-surface-container" />
          ) : venues.length === 0 ? (
            <p className="rounded-lg border border-border-subtle bg-white px-4 py-3 text-xs text-text-secondary">
              No venues available for your account.
            </p>
          ) : (
            <select
              value={selectedVenueId ?? ""}
              onChange={(e) => onSelectVenue(Number(e.target.value))}
              className="h-11 w-full rounded-lg border border-border-subtle bg-white px-3 text-sm text-text-primary outline-none focus:border-outline"
            >
              {venues.map((v) => (
                <option key={v.venue_id} value={v.venue_id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </section>

        {/* Layout list */}
        {selectedVenueId != null && (
          <section className="mb-6">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-text-primary">
              <Layers className="h-3.5 w-3.5" /> Layouts
            </h2>
            <div className="space-y-2">
              {loadingLayouts ? (
                [...Array(2)].map((_, i) => (
                  <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-surface-container" />
                ))
              ) : layouts.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border-subtle bg-white px-4 py-6 text-center text-xs text-text-secondary">
                  No layouts yet for this venue. Create one below.
                </p>
              ) : (
                layouts.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => openLayout(l.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-outline hover:bg-surface-container-low"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-text-primary">{l.name}</span>
                        <span className="shrink-0 rounded bg-surface-container px-1.5 py-0.5 font-mono text-[10px] font-bold text-text-secondary">
                          #{l.id}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] font-medium text-text-secondary">
                        {l.visibility === "public" ? (
                          <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Public</span>
                        ) : (
                          <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private</span>
                        )}
                        <span>·</span>
                        <span className="font-mono">updated {new Date(l.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" />
                  </button>
                ))
              )}
            </div>
          </section>
        )}

        {/* Create new layout */}
        {selectedVenueId != null && (
          <section className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-text-primary">
              <Plus className="h-3.5 w-3.5" /> New layout
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCreate();
                }}
                placeholder="e.g. Main Floor — Concert Config"
                className="h-11 flex-1 rounded-lg border border-border-subtle bg-surface-container-low px-3 text-sm text-text-primary outline-none focus:border-outline"
              />
              <button
                onClick={onCreate}
                disabled={creating || !newName.trim()}
                className="shrink-0 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create & Edit"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
