/**
 * components/venue-editor/EditorSidebar.tsx
 *
 * Fixed left sidebar for the VenueMaster Pro editor. Contains:
 * - Brand header ("Editor Tools / Venue Configuration")
 * - Tool navigation (Selection, Seat Mapper, Section Zone, etc.)
 * - Footer actions (History, Export, Save Layout)
 * - Auto-save indicator
 *
 * Matches the Stitch markup from venue_map_editor code.html.
 */

"use client";

import { useEffect, useState } from "react";
import {
  MousePointer2,
  Armchair,
  Layers,
  Store,
  SquareStack,
  Grid3X3,
  History,
  Download,
  Save,
  Edit,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VenueEditorTool } from "@/types/ticket";
import { useVenueEditorStore } from "@/lib/store/venueEditorStore";

const TOOLS: { id: VenueEditorTool; label: string; icon: typeof MousePointer2 }[] = [
  { id: "seat_mapper", label: "Map Editor", icon: Armchair },
  { id: "section_zone", label: "Ticket Pricing", icon: Layers },
  { id: "facility_icons", label: "Facility Icons", icon: Store },
  { id: "layer_manager", label: "Layer Manager", icon: SquareStack },
];

interface EditorSidebarProps {
  active_tool: VenueEditorTool;
  on_tool_change: (tool: VenueEditorTool) => void;
  on_save: () => void;
  mode?: "admin" | "eo";
}

function format_time_ago(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function EditorSidebar({
  active_tool,
  on_tool_change,
  on_save,
  mode = "admin",
}: EditorSidebarProps) {
  const export_layout_json = useVenueEditorStore((s) => s.export_layout_json);
  const last_saved_at = useVenueEditorStore((s) => s.last_saved_at);
  const [time_ago, set_time_ago] = useState<string | null>(null);

  // Update the "X seconds ago" text every 5 seconds
  useEffect(() => {
    if (!last_saved_at) {
      set_time_ago(null);
      return;
    }
    set_time_ago(format_time_ago(last_saved_at));
    const interval = setInterval(() => {
      set_time_ago(format_time_ago(last_saved_at));
    }, 5000);
    return () => clearInterval(interval);
  }, [last_saved_at]);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border-subtle bg-surface-container-low p-4">
      {/* Header */}
      <div className="mb-8 px-2">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-on-primary shadow-sm">
            <Edit size={16} />
          </div>
          <h2 className="text-xl font-black text-primary" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
            Editor Tools
          </h2>
        </div>
        <p className="ml-11 text-xs font-medium tracking-wide text-text-secondary">
          Venue Configuration
        </p>
      </div>

      {/* Tool Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {TOOLS.filter(t => mode === "admin" || t.id === "section_zone").map((tool) => {
          const Icon = tool.icon;
          const is_active = active_tool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => on_tool_change(tool.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all",
                is_active
                  ? "translate-x-1 bg-primary-container font-bold text-on-primary-container shadow-sm"
                  : "text-text-secondary hover:bg-surface-variant"
              )}
            >
              <Icon size={20} />
              <span>{tool.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-3 border-t border-border-subtle pt-4">
        {/* Auto-save indicator */}
        {time_ago && (
          <div className="flex items-center gap-2 px-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
              <Check size={12} className="text-emerald-600" />
            </div>
            <span className="text-[11px] font-medium text-emerald-600">
              Saved {time_ago}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-variant"
          >
            <History size={16} />
            History
          </button>
          {mode === "admin" && (
            <button
              type="button"
              onClick={export_layout_json}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-variant"
            >
              <Download size={16} />
              Export
            </button>
          )}
        </div>
        {mode === "admin" && (
          <button
            type="button"
            onClick={on_save}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-on-primary shadow-sm transition-colors hover:bg-primary-container hover:text-on-primary-container"
          >
            <Save size={16} />
            Save Layout
          </button>
        )}
      </div>
    </aside>
  );
}
