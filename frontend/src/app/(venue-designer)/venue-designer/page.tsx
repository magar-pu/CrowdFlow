/**
 * app/(venue-designer)/venue-designer/page.tsx
 *
 * Venue-designer landing / selector. Pick a venue, then pick one of that venue's
 * layouts to edit — or create a new named one — before entering the full-screen
 * geometry designer at /venue-designer/edit?venueId=&layoutId=. This is what
 * gives the designer its "which venue / which layout" context; the layout list
 * is owner-scoped by the backend (your own + public), so organizers no longer
 * land in each other's layouts. Guarded by the (venue-designer) AuthGuard.
 *
 * The editor itself is a full-viewport takeover, but this selector is reached
 * from the organizer console (event workspace → Venue tab), so it mirrors the
 * console's page chrome — header, white bordered panels, card grid — rather
 * than looking like a separate product. It renders without OrganizerShell, so
 * the back link stands in for the sidebar.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Select from "@/components/ui/Select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Globe,
  Layers,
  Lock,
  Plus,
} from "lucide-react";
import { listVenues, type Venue } from "@/lib/api/venues";
import { listLayouts, createLayout, type LayoutSummary } from "@/lib/api/venueLayouts";

const labelClass = "text-[10px] font-mono font-bold text-text-secondary uppercase";
const inputClass =
  "w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none focus:border-outline disabled:opacity-50";

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

  const newNameRef = useRef<HTMLInputElement>(null);

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

  const selectedVenue = venues.find((v) => v.venue_id === selectedVenueId) ?? null;

  return (
    <div className="min-h-screen w-full bg-surface text-text-primary font-sans antialiased">
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-5 sm:px-6 md:p-8 space-y-6">
        <div className="space-y-8 text-left animate-fade-in">
          <div className="flex flex-col gap-4">
            <Link
              href="/organizer/events"
              className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to console
            </Link>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <h1 className="font-sans text-3xl font-bold tracking-tight text-text-primary">
                  Venue Designer
                </h1>
                <p className="mt-1 font-sans text-sm font-normal text-text-secondary">
                  Choose a venue, then open or create a seat-map layout to edit.
                </p>
              </div>

              {selectedVenue && (
                <span className="flex items-center gap-2 rounded-lg border border-border-subtle bg-white px-3 py-1.5 font-sans text-xs font-semibold text-text-primary shadow-sm">
                  <Building2 className="h-3.5 w-3.5 text-on-surface-variant" />
                  {selectedVenue.name}
                </span>
              )}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-semibold text-danger"
            >
              {error}
            </div>
          )}

          {/* Venue picker */}
          <section className="rounded-xl border border-border-subtle bg-white p-5 soft-shadow space-y-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">Venue</h2>
              <p className="text-xs text-text-secondary">
                Layouts are geometry that belongs to a single venue.
              </p>
            </div>

            {loadingVenues ? (
              <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-surface-container-low" />
            ) : venues.length === 0 ? (
              <div className="flex items-start gap-3 rounded-lg border border-dashed border-border-subtle p-4">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant" />
                <div className="text-xs">
                  <p className="font-bold text-text-primary">No venues available</p>
                  <p className="mt-0.5 text-text-secondary">
                    Add a venue from an event&apos;s Venue tab first — layouts are drawn
                    against a venue.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-md space-y-1.5">
                <label className={labelClass} htmlFor="designer-venue-select">
                  Select venue
                </label>
                <Select
                  id="designer-venue-select"
                  value={selectedVenueId ?? ""}
                  onChange={(e) => onSelectVenue(Number(e.target.value))}
                >
                  {venues.map((v) => (
                    <option key={v.venue_id} value={v.venue_id}>
                      {v.name}
                      {v.city ? ` — ${v.city}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </section>

          {/* Layout list */}
          {selectedVenueId != null && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-text-primary">Layouts</h2>
                  <p className="text-xs text-text-secondary">
                    Saved seat maps for this venue. Open one to edit its geometry.
                  </p>
                </div>
                <span className="shrink-0 rounded-lg border border-border-subtle bg-white px-3 py-1.5 font-mono text-[10px] font-bold text-text-secondary shadow-sm">
                  <Layers className="mr-1.5 inline h-3 w-3 text-on-surface-variant" />
                  {loadingLayouts ? "…" : layouts.length}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {loadingLayouts ? (
                  [...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-32 w-full animate-pulse rounded-xl border border-border-subtle bg-surface-container-low"
                    />
                  ))
                ) : layouts.length === 0 ? (
                  <div className="col-span-full mx-auto flex w-full max-w-lg flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-white py-16 text-center soft-shadow">
                    <Layers className="mb-3 h-8 w-8 animate-pulse text-on-surface-variant" />
                    <div className="mb-1 text-sm font-bold text-text-primary">
                      No Layouts For This Venue
                    </div>
                    <p className="mb-4 max-w-xs text-xs text-on-surface-variant">
                      Nothing has been drawn here yet. Create a named layout to start
                      placing seats, stages and facilities.
                    </p>
                    <button
                      onClick={() => newNameRef.current?.focus()}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-sans text-xs font-semibold text-on-primary shadow-md transition-colors hover:bg-primary/90"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create First Layout
                    </button>
                  </div>
                ) : (
                  layouts.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => openLayout(l.id)}
                      className="group flex flex-col rounded-xl border border-border-subtle bg-white p-5 text-left soft-shadow transition-all duration-300 hover:border-outline hover:shadow-lg cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="truncate font-sans text-base font-bold text-text-primary transition-colors group-hover:text-secondary">
                          {l.name}
                        </h3>
                        <span className="shrink-0 rounded bg-surface-container px-1.5 py-0.5 font-mono text-[10px] font-bold text-text-secondary">
                          #{l.id}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[10px] text-text-secondary">
                        {l.visibility === "public" ? (
                          <span className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-secondary" /> Public
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <Lock className="h-3.5 w-3.5 text-secondary" /> Private
                          </span>
                        )}
                        <span>updated {new Date(l.updated_at).toLocaleDateString()}</span>
                      </div>

                      <div className="mt-4 flex justify-end border-t border-border-subtle pt-4">
                        <span className="flex items-center gap-1 font-sans text-xs font-semibold text-secondary transition-all group-hover:gap-2">
                          Open in Designer
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Create new layout */}
          {selectedVenueId != null && (
            <section className="rounded-xl border border-border-subtle bg-white p-5 soft-shadow space-y-4">
              <div>
                <h2 className="text-base font-bold text-text-primary">New layout</h2>
                <p className="text-xs text-text-secondary">
                  Created private to you — an event can only bind a layout of its own
                  venue.
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[220px] flex-1 space-y-1.5">
                  <label className={labelClass} htmlFor="designer-new-layout">
                    Layout name
                  </label>
                  <input
                    id="designer-new-layout"
                    ref={newNameRef}
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onCreate();
                    }}
                    placeholder="e.g. Main Floor — Concert Config"
                    className={inputClass}
                  />
                </div>
                <button
                  onClick={onCreate}
                  disabled={creating || !newName.trim()}
                  className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-on-primary shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? (
                    "Creating…"
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Create &amp; Edit
                    </>
                  )}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
