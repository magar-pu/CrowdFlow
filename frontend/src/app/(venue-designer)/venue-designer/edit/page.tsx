/**
 * app/(venue-designer)/venue-designer/edit/page.tsx
 *
 * Full-screen venue geometry designer (VenueMaster Pro, mode="admin"), bound to
 * ONE layout via ?venueId= & ?layoutId= (chosen in the selector at
 * /venue-designer). On mount it loads that layout and edits update the SAME
 * layout — no blank re-entry, no duplicate rows. Guarded by the (venue-designer)
 * AuthGuard + the edge middleware.
 */

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { EditorSidebar } from "@/components/venue-editor/EditorSidebar";
import { HierarchyPanel } from "@/components/venue-editor/HierarchyPanel";
import { FacilityIconsPanel } from "@/components/venue-editor/FacilityIconsPanel";
import { FloatingToolbar } from "@/components/venue-editor/FloatingToolbar";
import { SeatMapperCanvas } from "@/components/venue-editor/SeatMapperCanvas";
import { SeatPropertiesPanel } from "@/components/venue-editor/SeatPropertiesPanel";
import { SeatArrangePanel } from "@/components/venue-editor/SeatArrangePanel";
import { useVenueEditorStore } from "@/lib/store/venueEditorStore";
import { useVenueLayoutPersistence } from "@/lib/venueLayout/useVenueLayoutPersistence";
import { listVenues } from "@/lib/api/venues";

function DesignerLoading({ label }: { label: string }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface-dim">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-text-secondary">{label}</p>
      </div>
    </div>
  );
}

function VenueDesignerEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const venueId = Number(searchParams.get("venueId"));
  const layoutId = Number(searchParams.get("layoutId"));

  const {
    active_tool,
    set_active_tool,
    sections,
    renumber_seats,
    selected_seat,
    multi_selected_seat_ids,
    select_seat,
    update_seat,
    zoom_level,
    venue_name,
    layout_name,
    set_venues,
    set_venue,
  } = useVenueEditorStore();

  const [selected_hierarchy_section, set_selected_hierarchy_section] = useState<
    string | null
  >(null);
  const [hydrating, set_hydrating] = useState(true);
  const [load_error, set_load_error] = useState<string | null>(null);

  const persistence = useVenueLayoutPersistence();

  // Bind the editor to the chosen venue + layout: resolve the venue name for the
  // context header, then hydrate the store from the persisted layout.
  useEffect(() => {
    if (!Number.isInteger(venueId) || venueId <= 0 || !Number.isInteger(layoutId) || layoutId <= 0) {
      router.replace("/venue-designer");
      return;
    }
    let cancelled = false;
    (async () => {
      const vres = await listVenues();
      if (!cancelled && vres.success && vres.data) {
        set_venues(vres.data.map((v) => ({ venue_id: String(v.venue_id), name: v.name })));
        set_venue(String(venueId));
      }
      const lres = await persistence.load(layoutId);
      if (cancelled) return;
      if (!lres.ok) set_load_error(lres.error ?? "Failed to load layout");
      set_hydrating(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, layoutId]);

  if (hydrating) return <DesignerLoading label="Loading layout…" />;

  if (load_error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-surface-dim">
        <p className="text-sm font-semibold text-danger">{load_error}</p>
        <button
          onClick={() => router.push("/venue-designer")}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-sm hover:bg-primary-container"
        >
          Back to layouts
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface">
      <EditorSidebar
        active_tool={active_tool}
        on_tool_change={set_active_tool}
        on_save={async () => {
          // Labels drift while a plan is being built (each seat array restarts
          // at row A). Normalise from final geometry before the plan is saved.
          renumber_seats();
          if (!Number.isInteger(venueId) || venueId <= 0) {
            window.alert("Missing venue context — reopen from the layouts page.");
            return;
          }
          const result = await persistence.save(venueId);
          if (!result.ok) {
            window.alert(result.error ?? "Failed to save layout.");
          }
        }}
        mode="admin"
      />

      <div className="ml-64 flex flex-1 flex-col overflow-hidden">
        {/* Context header: which venue + layout is being edited, and the exit. */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle bg-surface-container-low px-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-sm font-bold text-text-primary">
              {layout_name || "Untitled Layout"}
            </span>
            <span className="text-text-secondary">·</span>
            <span className="truncate text-xs font-medium text-text-secondary">
              {venue_name || "Venue"}
            </span>
            <span className="ml-1 shrink-0 rounded bg-surface-container px-1.5 py-0.5 font-mono text-[10px] font-bold text-text-secondary">
              #{layoutId}
            </span>
          </div>
          <button
            onClick={() => router.push("/venue-designer")}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-subtle bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-container hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" />
            Close
          </button>
        </header>

        <main className="flex flex-1 overflow-hidden">
          {active_tool === "section_zone" && (
            <div className="flex h-full w-full overflow-hidden">
              <div className="relative h-full flex-1 overflow-hidden">
                <SeatMapperCanvas
                  sections={sections}
                  selected_seat={selected_seat}
                  on_seat_click={select_seat}
                  zoom_level={zoom_level}
                  is_locked_mode={true}
                />
                <FloatingToolbar />
              </div>
              {/* Ticket pricing is deliberately absent here. A venue layout is
                  an untiered, reusable template; tiers are painted onto seats
                  per event in the organizer workspace (WorkspaceSeatingAssign). */}
            </div>
          )}

          {(active_tool === "seat_mapper" || active_tool === "facility_icons") && (
            <>
              {active_tool === "seat_mapper" && (
                <HierarchyPanel
                  sections={sections}
                  selected_section_id={selected_hierarchy_section}
                  on_section_select={set_selected_hierarchy_section}
                />
              )}

              {active_tool === "facility_icons" && <FacilityIconsPanel />}

              <div className="relative h-full flex-1 overflow-hidden">
                <FloatingToolbar />
                <SeatMapperCanvas
                  sections={sections}
                  selected_seat={selected_seat}
                  on_seat_click={select_seat}
                  zoom_level={zoom_level}
                />
              </div>

              {active_tool === "seat_mapper" && (
                <>
                  {/* Multi-seat selection takes over the right sidebar; a single
                      selected seat falls back to its properties. */}
                  <SeatArrangePanel />
                  {multi_selected_seat_ids.length < 2 && (
                    <SeatPropertiesPanel seat={selected_seat} on_update={update_seat} />
                  )}
                </>
              )}
            </>
          )}

          {active_tool !== "section_zone" && active_tool !== "seat_mapper" && active_tool !== "facility_icons" && (
            <div className="flex flex-1 items-center justify-center bg-background">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-low">
                  <span className="text-2xl">🚧</span>
                </div>
                <h2 className="text-lg font-semibold text-primary">
                  {active_tool.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">This tool is coming soon.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function VenueDesignerEditPage() {
  return (
    <Suspense fallback={<DesignerLoading label="Loading designer…" />}>
      <VenueDesignerEditor />
    </Suspense>
  );
}
