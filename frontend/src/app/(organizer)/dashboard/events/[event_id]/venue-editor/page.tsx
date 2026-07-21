"use client";

import { useState, useRef } from "react";
import { UploadCloud } from "lucide-react";
import { EditorSidebar } from "@/components/venue-editor/EditorSidebar";
import { TicketConfigPanel } from "@/components/venue-editor/TicketConfigPanel";
import { SeatMapperCanvas } from "@/components/venue-editor/SeatMapperCanvas";
import { FloatingToolbar } from "@/components/venue-editor/FloatingToolbar";
import { useVenueEditorStore } from "@/lib/store/venueEditorStore";

export default function EOVenueEditorPage() {
  const {
    sections,
    selected_seat,
    select_seat,
    zoom_level,
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
    import_layout_json,
    validate_for_publish,
  } = useVenueEditorStore();

  const file_input_ref = useRef<HTMLInputElement>(null);

  const handle_save = () => {
    // TODO: call PUT /api/v1/organizer/venues/{id}/layout once the Go endpoint exists
    console.log("Save layout:", { sections, pricing_tiers });
  };

  const handle_save_draft = () => {
    // TODO: call PATCH /api/v1/organizer/events/{id} with status=draft
    console.log("Save draft:", { pricing_tiers, base_currency, tax_rate });
  };

  const handle_publish = () => {
    // TODO: call PATCH /api/v1/organizer/events/{id}/publish
    console.log("Publish event:", { pricing_tiers, base_currency, tax_rate });
  };

  const handle_file_upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        import_layout_json(json);
        set_selected_paint_tier_id(null);
        set_drawing_mode("select");
      } catch (err) {
        alert("Failed to parse layout file. Please ensure it is a valid VenueMaster JSON export.");
      }
    };
    reader.readAsText(file);
    
    // reset input
    if (file_input_ref.current) {
      file_input_ref.current.value = "";
    }
  };

  // If no sections exist, we consider the layout as empty/unimported.
  const is_empty = sections.length === 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface">
      {/* Sidebar (EO Mode) */}
      <EditorSidebar
        active_tool="section_zone"
        on_tool_change={() => {}} // Disabled in EO mode
        on_save={handle_save}
        mode="eo"
      />

      {/* Main content area (shifted right by sidebar width) */}
      <main className="ml-64 flex flex-1 overflow-hidden">
        {is_empty ? (
          // ── Empty State: Import Dropzone ──────────────────────────────
          <div className="flex flex-1 items-center justify-center p-12 bg-surface-container-lowest">
            <div className="flex max-w-md flex-col items-center text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <UploadCloud size={48} strokeWidth={1.5} />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-primary" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                Import Venue Layout
              </h1>
              <p className="mb-8 text-sm text-text-secondary">
                Upload the JSON layout file provided by the Venue Admin to start configuring ticket prices and quotas for your event.
              </p>
              
              <input 
                type="file" 
                accept=".json" 
                ref={file_input_ref} 
                onChange={handle_file_upload} 
                className="hidden" 
              />
              <button
                onClick={() => file_input_ref.current?.click()}
                className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-on-primary shadow-lg transition-transform hover:scale-[0.98]"
              >
                Select Layout File (.json)
              </button>
            </div>
          </div>
        ) : (
          // ── Pricing Mode: Interactive Canvas + Panel ──────────────────
          <div className="flex h-full w-full overflow-hidden">
            <div className="relative h-full flex-1 overflow-hidden">
              <SeatMapperCanvas
                sections={sections}
                selected_seat={selected_seat}
                on_seat_click={select_seat}
                zoom_level={zoom_level}
                is_locked_mode={true} // Restrict dragging/adding
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
              on_save_draft={handle_save_draft}
              on_publish={handle_publish}
              on_validate={validate_for_publish}
            />
          </div>
        )}
      </main>
    </div>
  );
}
