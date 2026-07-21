/**
 * app/(venue-designer)/venue-designer/page.tsx
 *
 * Full-screen venue geometry designer (VenueMaster Pro, mode="admin").
 * Guarded by the (venue-designer) group's AuthGuard + the edge middleware, so
 * only authenticated organizers/admins can reach it. The authenticated session
 * also lets listVenues()/save() succeed against the backend.
 */

"use client";

import { useEffect, useState } from "react";
import { EditorSidebar } from "@/components/venue-editor/EditorSidebar";
import { VenueMapPreview } from "@/components/venue-editor/VenueMapPreview";
import { TicketConfigPanel } from "@/components/venue-editor/TicketConfigPanel";
import { HierarchyPanel } from "@/components/venue-editor/HierarchyPanel";
import { FacilityIconsPanel } from "@/components/venue-editor/FacilityIconsPanel";
import { FloatingToolbar } from "@/components/venue-editor/FloatingToolbar";
import { SeatMapperCanvas } from "@/components/venue-editor/SeatMapperCanvas";
import { SeatPropertiesPanel } from "@/components/venue-editor/SeatPropertiesPanel";
import { SeatArrangePanel } from "@/components/venue-editor/SeatArrangePanel";
import { useVenueEditorStore } from "@/lib/store/venueEditorStore";
import { useVenueLayoutPersistence } from "@/lib/venueLayout/useVenueLayoutPersistence";
import { listVenues } from "@/lib/api/venues";

export default function VenueDesignerPage() {
  const {
    active_tool,
    set_active_tool,
    seats,
    sections,
    renumber_seats,
    selected_seat,
    multi_selected_seat_ids,
    select_seat,
    update_seat,
    zoom_level,
    set_zoom,
    event_title,
    venue_name,
    venues,
    selected_venue_id,
    set_venue,
    set_venues,
    base_currency,
    tax_rate,
    set_currency,
    set_tax_rate,
    pricing_tiers,
    selected_paint_tier_id,
    set_selected_paint_tier_id,
    add_pricing_tier,
    update_pricing_tier,
    remove_pricing_tier,
    set_drawing_mode,
    stage_shape,
    validate_for_publish,
  } = useVenueEditorStore();

  const [selected_hierarchy_section, set_selected_hierarchy_section] = useState<
    string | null
  >(null);

  const persistence = useVenueLayoutPersistence();

  // Load real venues so the layout saves against a real integer venue id
  // (the store's mock venues use string ids the backend can't accept).
  useEffect(() => {
    let cancelled = false;
    listVenues().then((res) => {
      if (cancelled || !res.success || !res.data || res.data.length === 0) return;
      set_venues(res.data.map((v) => ({ venue_id: String(v.venue_id), name: v.name })));
      set_venue(String(res.data[0].venue_id));
    });
    return () => {
      cancelled = true;
    };
  }, [set_venues, set_venue]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface">
      <EditorSidebar
        active_tool={active_tool}
        on_tool_change={set_active_tool}
        on_save={async () => {
          // Labels drift while a plan is being built (each seat array restarts
          // at row A). Normalise from final geometry before the plan is saved.
          renumber_seats();
          const venueId = Number(selected_venue_id);
          if (!Number.isInteger(venueId) || venueId <= 0) {
            window.alert("Select a venue before saving.");
            return;
          }
          const result = await persistence.save(venueId);
          if (!result.ok) {
            window.alert(result.error ?? "Failed to save layout.");
          }
        }}
        mode="admin"
      />

      <main className="ml-64 flex flex-1 overflow-hidden">
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
            <TicketConfigPanel
              base_currency={base_currency}
              tax_rate={tax_rate}
              pricing_tiers={pricing_tiers}
              sections={sections}
              selected_paint_tier_id={selected_paint_tier_id}
              on_tier_select={(id) => {
                set_selected_paint_tier_id(id);
                set_drawing_mode(id ? "paint" : "select");
              }}
              on_currency_change={set_currency}
              on_tax_rate_change={set_tax_rate}
              on_tier_add={add_pricing_tier}
              on_tier_update={update_pricing_tier}
              on_tier_remove={remove_pricing_tier}
              on_save_draft={() => console.log("Save draft")}
              on_publish={() => console.log("Publish event")}
              on_validate={validate_for_publish}
            />
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
  );
}
