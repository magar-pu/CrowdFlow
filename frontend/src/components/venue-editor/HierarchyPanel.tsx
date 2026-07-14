/**
 * components/venue-editor/HierarchyPanel.tsx
 *
 * Secondary tree-view panel for the Seat Mapper mode. Displays:
 * - Sections tree (with colored indicators)
 * - Seating Types (collapsed)
 * - Pricing Tiers (collapsed)
 * - Allocation Rules (collapsed)
 *
 * Matches the hierarchy panel from venue_map_editor code.html.
 */

"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Filter,
  Armchair,
  DollarSign,
  Scale,
  Layers,
  Upload,
  X,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VenueSection, VenueBlueprint } from "@/types/ticket";
import { useVenueEditorStore } from "@/lib/store/venueEditorStore";

interface HierarchyPanelProps {
  sections: VenueSection[];
  selected_section_id: string | null;
  on_section_select: (section_id: string) => void;
}

interface TreeNodeProps {
  label: string;
  icon: React.ReactNode;
  default_open?: boolean;
  children?: React.ReactNode;
}

function TreeNode({ label, icon, default_open = false, children }: TreeNodeProps) {
  const [open, set_open] = useState(default_open);

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => set_open(!open)}
        className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-container-low"
      >
        {children ? (
          open ? (
            <ChevronDown size={14} className="text-on-surface-variant transition-colors group-hover:text-primary" />
          ) : (
            <ChevronRight size={14} className="text-on-surface-variant transition-colors group-hover:text-primary" />
          )
        ) : (
          <ChevronRight size={14} className="text-on-surface-variant transition-colors group-hover:text-primary" />
        )}
        {icon}
        <span className="text-xs font-medium text-on-surface">{label}</span>
      </button>
      {open && children && (
        <div className="ml-6 mt-1 flex flex-col gap-1 border-l border-border-subtle pl-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function HierarchyPanel({
  sections,
  selected_section_id,
  on_section_select,
}: HierarchyPanelProps) {
  const [is_expanded, set_is_expanded] = useState(true);
  const { blueprint, set_blueprint, update_blueprint } = useVenueEditorStore();

  const handle_blueprint_upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      set_blueprint({
        image_url: event.target?.result as string,
        opacity: 0.5,
        scale: 1,
        offset_x: 0,
        offset_y: 0,
      });
    };
    reader.readAsDataURL(file);
  };

  if (!is_expanded) {
    return (
      <div className="relative z-30 flex h-full w-12 shrink-0 flex-col items-center border-r border-border-subtle bg-surface-white py-4 shadow-[4px_0_24px_rgba(15,23,42,0.02)] transition-all">
        <button
          type="button"
          onClick={() => set_is_expanded(true)}
          className="rounded-md p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
          title="Expand Hierarchy"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative z-30 flex h-full w-64 shrink-0 flex-col border-r border-border-subtle bg-surface-white shadow-[4px_0_24px_rgba(15,23,42,0.02)] transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle bg-surface-bright p-4">
        <h3 className="text-sm font-semibold text-primary">Hierarchy</h3>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
            title="Filter"
          >
            <Filter size={16} />
          </button>
          <button
            type="button"
            onClick={() => set_is_expanded(false)}
            className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
            title="Collapse"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Sections tree */}
        <TreeNode
          label="Sections"
          icon={<Database size={14} className="text-accent-blue" />}
          default_open
        >
          {sections.map((section) => (
            <div key={section.section_id} className="mb-0.5">
              <button
                type="button"
                onClick={() => on_section_select(section.section_id)}
                className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors",
                selected_section_id === section.section_id
                  ? "bg-surface-container-low"
                  : "hover:bg-surface-container-low"
              )}
            >
              <div
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: section.color }}
              />
              <span
                className={cn(
                  "text-xs",
                  selected_section_id === section.section_id
                    ? "font-medium text-primary"
                    : "text-text-secondary"
                )}
              >
                {section.label}
              </span>
            </button>
            </div>
          ))}
        </TreeNode>

        {/* Blueprint Layer */}
        <TreeNode
          label="Blueprint Layer"
          icon={<Layers size={14} className="text-accent-purple" />}
          default_open={false}
        >
          <div className="flex flex-col gap-3 px-2 py-2">
            {!blueprint ? (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border-subtle p-4 text-xs text-text-secondary transition-colors hover:bg-surface-container-low hover:text-primary">
                <Upload size={14} />
                <span>Upload Blueprint (JPG/PNG)</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  className="hidden"
                  onChange={handle_blueprint_upload}
                />
              </label>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">Image Uploaded</span>
                  <button
                    onClick={() => set_blueprint(undefined)}
                    className="rounded p-1 text-on-surface-variant hover:bg-surface-container-low hover:text-red-500"
                    title="Remove Blueprint"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-text-secondary">
                    <span>Opacity</span>
                    <span>{Math.round(blueprint.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1" max="1" step="0.1"
                    value={blueprint.opacity}
                    onChange={(e) => update_blueprint({ opacity: Number(e.target.value) })}
                    className="accent-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-text-secondary">
                    <span>Scale</span>
                    <span>{blueprint.scale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1" max="5" step="0.1"
                    value={blueprint.scale}
                    onChange={(e) => update_blueprint({ scale: Number(e.target.value) })}
                    className="accent-primary"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-[10px] text-text-secondary">Offset X</span>
                    <input
                      type="number"
                      value={blueprint.offset_x}
                      onChange={(e) => update_blueprint({ offset_x: Number(e.target.value) })}
                      className="w-full rounded border border-border-subtle bg-transparent px-2 py-1 text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-[10px] text-text-secondary">Offset Y</span>
                    <input
                      type="number"
                      value={blueprint.offset_y}
                      onChange={(e) => update_blueprint({ offset_y: Number(e.target.value) })}
                      className="w-full rounded border border-border-subtle bg-transparent px-2 py-1 text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </TreeNode>

        {/* Other tree nodes (collapsed) */}
        <div className="mt-2">
          <TreeNode
            label="Seating Types"
            icon={<Armchair size={14} className="text-on-surface-variant" />}
          />
        </div>
        <TreeNode
          label="Pricing Tiers"
          icon={<DollarSign size={14} className="text-on-surface-variant" />}
        />
        <TreeNode
          label="Allocation Rules"
          icon={<Scale size={14} className="text-on-surface-variant" />}
        />
      </div>
    </div>
  );
}
