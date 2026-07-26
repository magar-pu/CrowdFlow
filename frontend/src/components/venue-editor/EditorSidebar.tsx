/**
 * components/venue-editor/EditorSidebar.tsx
 *
 * Fixed left sidebar for the venue layout editor. Contains:
 * - Brand header, with the collapse toggle
 * - Footer actions (Export, Save Layout) + auto-save indicator
 *
 * There is deliberately NO tool navigation. The editor had four tools; three
 * were removed as dead or out of scope (Ticket Pricing — tiers are per-event,
 * not part of a reusable layout; Layer Manager — never built; Facility Icons —
 * its panel crowded the canvas), leaving a nav that could not navigate. Editing
 * geometry is now the editor's only mode, so the mode selector is gone with it.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload, Save, Edit, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVenueEditorStore } from "@/lib/store/venueEditorStore";
import { MAX_IMPORT_BYTES } from "@/lib/venueLayout/importLayout";

interface EditorSidebarProps {
  on_save: () => void;
  mode?: "admin" | "eo";
  /** Collapsed state is owned by the page: the canvas margin must track it. */
  is_collapsed: boolean;
  on_toggle_collapse: () => void;
  /**
   * Body of the sidebar — the layout hierarchy. Passed as children rather than
   * imported here so this component stays presentational and the page keeps
   * owning the panel's state. Hidden while collapsed; there is no useful 88px
   * rendering of a tree view.
   */
  children?: React.ReactNode;
}

function format_time_ago(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function EditorSidebar({
  on_save,
  mode = "admin",
  is_collapsed,
  on_toggle_collapse,
  children,
}: EditorSidebarProps) {
  const export_layout_json = useVenueEditorStore((s) => s.export_layout_json);
  const import_layout_json = useVenueEditorStore((s) => s.import_layout_json);
  const last_saved_at = useVenueEditorStore((s) => s.last_saved_at);
  const [time_ago, set_time_ago] = useState<string | null>(null);
  const file_input_ref = useRef<HTMLInputElement>(null);
  const [import_feedback, set_import_feedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  /**
   * Import is destructive (it replaces the entire layout) and the file is
   * untrusted, so the guards run in order of cost: cheap file-level checks
   * here, then the full field-by-field sanitiser in parse_layout_import.
   *
   * Note this only writes to the editor — the layout is not persisted until
   * the user presses Save, so a bad import is undoable by closing without saving.
   */
  const handle_import_file = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset immediately so re-picking the same file still fires onChange.
    e.target.value = "";
    if (!file) return;

    set_import_feedback(null);

    // Extension is advisory (trivially spoofed) — it just catches honest
    // mistakes early. The real gate is the parse below.
    if (!/\.json$/i.test(file.name)) {
      set_import_feedback({ type: "error", message: "Choose a .json layout file." });
      return;
    }
    // Checked before reading so an oversized file is never pulled into memory.
    if (file.size > MAX_IMPORT_BYTES) {
      set_import_feedback({ type: "error", message: "That file is larger than 5MB." });
      return;
    }

    if (
      !window.confirm(
        "Import this layout?\n\n" +
          "It REPLACES every seat, section and tier currently in the editor. " +
          "Nothing is saved until you press Save Layout, so you can close without saving to undo."
      )
    ) {
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      set_import_feedback({ type: "error", message: "Couldn't read that file." });
      return;
    }

    const result = import_layout_json(text);
    if (!result.ok) {
      set_import_feedback({ type: "error", message: result.error ?? "Import failed." });
      return;
    }
    set_import_feedback({
      type: "success",
      message: result.warnings.length
        ? `Layout imported. ${result.warnings.join(" ")}`
        : "Layout imported.",
    });
  };

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
    // Matches the console shell: same width, surface, 72px bordered header and
    // nav item treatment as the organizer/admin/auditor sidebars.
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border-subtle bg-surface-white text-text-primary transition-all duration-300",
        is_collapsed ? "w-[88px]" : "w-[280px]"
      )}
    >
      {/* Header — mirrors the console's brand block, including its collapse
          affordance: chevron inline when open, centred below when collapsed. */}
      <div
        className={cn(
          "flex h-[72px] items-center border-b border-border-subtle",
          is_collapsed ? "justify-center px-4" : "justify-between px-6"
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Edit className="h-5 w-5 text-on-primary" />
          </div>
          {!is_collapsed && (
            <div className="text-left">
              {/* Was text-xl font-black with an inline Hanken Grotesk override —
                  the only hardcoded font-family in the app, which is what made
                  this panel read as a different product. */}
              {/* "Editor Tools" no longer describes anything now the tool nav
                  is gone; the layout and venue being edited are named in the
                  page header just to the right. */}
              <span className="text-lg font-bold tracking-normal text-text-primary">Venue Editor</span>
              <div className="text-xs font-medium text-text-secondary">Layout Designer</div>
            </div>
          )}
        </div>

        {!is_collapsed && (
          <button
            type="button"
            onClick={on_toggle_collapse}
            className="cursor-pointer rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-container-low hover:text-text-primary"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {is_collapsed && (
        <button
          type="button"
          onClick={on_toggle_collapse}
          className="mx-auto mt-4 cursor-pointer rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-container-low hover:text-text-primary"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Body: the hierarchy tree, which used to be a second fixed column
          beside this one. min-h-0 is what lets the tree scroll inside a flex
          column instead of pushing the footer off-screen. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!is_collapsed && children}
      </div>

      {/* Footer. "History" lived here as a <button> with no onClick at all —
          removed rather than wired up, since undo/redo already exist in the
          FloatingToolbar with Ctrl+Z / Ctrl+Shift+Z shortcuts. */}
      <div
        className={cn(
          "mt-auto flex flex-col gap-3 border-t border-border-subtle py-4",
          is_collapsed ? "px-3" : "px-4"
        )}
      >
        {/* Auto-save indicator. Collapsed keeps the tick — losing the only
            confirmation that a save landed would be worse than losing a label. */}
        {time_ago && (
          <div
            className={cn("flex items-center gap-2", is_collapsed ? "justify-center" : "px-1")}
            title={is_collapsed ? `Saved ${time_ago}` : undefined}
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10">
              <Check size={12} className="text-success" />
            </div>
            {!is_collapsed && (
              <span className="text-xs font-medium text-success">Saved {time_ago}</span>
            )}
          </div>
        )}

        {import_feedback && !is_collapsed && (
          <div
            className={cn(
              "rounded-lg border px-3 py-2 text-[11px] font-medium",
              import_feedback.type === "error"
                ? "border-danger/30 bg-danger/10 text-danger"
                : "border-success/30 bg-success/10 text-success"
            )}
          >
            {import_feedback.message}
          </div>
        )}

        {mode === "admin" && (
          <>
            <input
              ref={file_input_ref}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handle_import_file}
            />

            <div className={cn("flex gap-2", is_collapsed && "flex-col")}>
              <button
                type="button"
                onClick={() => file_input_ref.current?.click()}
                title={is_collapsed ? "Import layout JSON" : undefined}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border border-border-subtle py-2.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-container-low hover:text-text-primary cursor-pointer",
                  is_collapsed && "px-0"
                )}
              >
                <Upload className="h-4 w-4 shrink-0" />
                {!is_collapsed && "Import"}
              </button>
              <button
                type="button"
                onClick={export_layout_json}
                title={is_collapsed ? "Export" : undefined}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border border-border-subtle py-2.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-container-low hover:text-text-primary cursor-pointer",
                  is_collapsed && "px-0"
                )}
              >
                <Download className="h-4 w-4 shrink-0" />
                {!is_collapsed && "Export"}
              </button>
            </div>
            <button
              type="button"
              onClick={on_save}
              title={is_collapsed ? "Save Layout" : undefined}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-bold text-on-primary shadow-sm transition-colors hover:bg-primary/90 cursor-pointer",
                is_collapsed && "px-0"
              )}
            >
              <Save className="h-4 w-4 shrink-0" />
              {!is_collapsed && "Save Layout"}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
