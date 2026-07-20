/**
 * components/venue-editor/HierarchyPanel.tsx
 *
 * Secondary tree-view panel for the Seat Mapper mode. Displays:
 * - Sections tree (colour swatch + count; click to select a section)
 * - Blueprint Layer (upload a floor plan, set opacity/scale/offset)
 * - Pricing Tiers (real tiers + seat tallies; click to select those seats)
 *
 * The placeholder "Seating Types" and "Allocation Rules" nodes were removed —
 * they had no backing data and rendered a chevron that expanded nothing.
 */

"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Layers,
  Upload,
  Trash2,
  Lock,
  LockOpen,
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
  /** Optional right-aligned tally (e.g. number of sections). */
  count?: number;
  children?: React.ReactNode;
}

function TreeNode({ label, icon, default_open = false, count, children }: TreeNodeProps) {
  const [open, set_open] = useState(default_open);
  const has_children = Boolean(children);

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => has_children && set_open(!open)}
        disabled={!has_children}
        aria-expanded={has_children ? open : undefined}
        className={cn(
          "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
          has_children
            ? "hover:bg-surface-container-low"
            : "cursor-default opacity-50"
        )}
      >
        {/* Only show a chevron when there's something to expand, so an empty
            node doesn't advertise an interaction it can't honour. */}
        <span className="flex h-3.5 w-3.5 items-center justify-center">
          {has_children &&
            (open ? (
              <ChevronDown size={14} className="text-on-surface-variant transition-colors group-hover:text-primary" />
            ) : (
              <ChevronRight size={14} className="text-on-surface-variant transition-colors group-hover:text-primary" />
            ))}
        </span>
        {icon}
        <span className="text-xs font-medium text-on-surface">{label}</span>
        {count !== undefined && (
          <span className="ml-auto text-[10px] font-medium text-text-secondary">{count}</span>
        )}
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
  const { blueprint, set_blueprint, update_blueprint, seats, pricing_tiers, set_multi_selected_seats } =
    useVenueEditorStore();
  const untagged_seats = seats.filter((s) => !s.tier_id);

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
        // Locked by default so the layer can't intercept marquee drags.
        is_locked: true,
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
          count={sections.length || undefined}
          default_open
        >
          {sections.length === 0 && (
            <p className="px-2 py-1.5 text-[11px] text-text-secondary">
              No sections yet — seats can exist without one.
            </p>
          )}
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
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() =>
                        update_blueprint({ is_locked: !(blueprint.is_locked ?? true) })
                      }
                      className={cn(
                        "rounded p-1 transition-colors hover:bg-surface-container-low",
                        blueprint.is_locked ?? true
                          ? "text-on-surface-variant hover:text-primary"
                          : "text-primary"
                      )}
                      title={
                        blueprint.is_locked ?? true
                          ? "Unlock to drag the blueprint on the canvas"
                          : "Lock the blueprint (click-through)"
                      }
                    >
                      {blueprint.is_locked ?? true ? <Lock size={14} /> : <LockOpen size={14} />}
                    </button>
                  </div>
                </div>

                {!(blueprint.is_locked ?? true) && (
                  <p className="rounded-md bg-surface-container-low px-2 py-1.5 text-[10px] text-text-secondary">
                    Unlocked — drag it on the canvas with the Select tool.
                  </p>
                )}
                
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

                {/* Removing clears the uploaded image; it isn't covered by undo,
                    so confirm before discarding it. */}
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Remove the blueprint image? It isn't covered by undo — you'll need to upload it again."
                      )
                    ) {
                      set_blueprint(undefined);
                    }
                  }}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 size={13} /> Remove blueprint
                </button>
              </div>
            )}
          </div>
        </TreeNode>

        {/* Pricing tiers — click one to select every seat carrying it */}
        <TreeNode
          label="Pricing Tiers"
          icon={<DollarSign size={14} className="text-on-surface-variant" />}
          count={pricing_tiers.length || undefined}
        >
          {pricing_tiers.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] text-text-secondary">
              No tiers yet — add them in Ticket Pricing.
            </p>
          ) : (
            <>
              {pricing_tiers.map((tier) => {
                const tier_seats = seats.filter((s) => s.tier_id === tier.tier_id);
                return (
                  <button
                    key={tier.tier_id}
                    type="button"
                    disabled={tier_seats.length === 0}
                    title={
                      tier_seats.length
                        ? `Select the ${tier_seats.length} seats on this tier`
                        : "No seats on this tier yet"
                    }
                    onClick={() =>
                      set_multi_selected_seats(tier_seats.map((s) => s.seat_id))
                    }
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-surface-container-low disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <div
                      className="h-2 w-2 shrink-0 rounded-sm"
                      style={{ backgroundColor: tier.color }}
                    />
                    <span className="truncate text-xs text-text-secondary">{tier.name}</span>
                    <span className="ml-auto text-[10px] text-text-secondary">
                      {tier_seats.length}
                    </span>
                  </button>
                );
              })}
              {untagged_seats.length > 0 && (
                <button
                  type="button"
                  title={`Select the ${untagged_seats.length} seats with no tier`}
                  onClick={() =>
                    set_multi_selected_seats(untagged_seats.map((s) => s.seat_id))
                  }
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-surface-container-low"
                >
                  <div className="h-2 w-2 shrink-0 rounded-sm bg-slate-300" />
                  <span className="truncate text-xs text-warning">Unassigned</span>
                  <span className="ml-auto text-[10px] text-text-secondary">
                    {untagged_seats.length}
                  </span>
                </button>
              )}
            </>
          )}
        </TreeNode>
      </div>
    </div>
  );
}
