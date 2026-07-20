/**
 * components/venue-editor/FloatingToolbar.tsx
 *
 * Floating toolbar that appears above the Seat Mapper canvas. Contains:
 * - Undo / Redo
 * - Tool buttons (Select, Draw, Text, Group)
 * - Grid Snap toggle + Lock
 * - Zoom controls (−/+/percentage)
 *
 * Matches the floating toolbar from venue_map_editor code.html.
 */

"use client";

import {
  Undo2,
  Redo2,
  Hand,
  Pencil,
  Type,
  Circle,
  Square,
  CircleDot,
  MousePointer2,
  Grid3X3,
  LayoutGrid,
  Eye,
  EyeOff,
  Link2,
  Unlink2,
  PaintBucket,
  Lock,
  Minus,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useEffect } from "react";
import { useVenueEditorStore } from "@/lib/store/venueEditorStore";

export function FloatingToolbar() {
  const { 
    drawing_mode, set_drawing_mode,
    undo, redo, past, future,
    selected_seat, multi_selected_seat_ids, selected_shape_id, toggle_lock,
    seats, sections, stage_shape, zoom_level, set_zoom,
    snap_to_grid, toggle_snap_to_grid,
    grid_size_x, grid_size_y, grid_link_axes, show_grid, snap_threshold,
    set_grid_size, toggle_grid_link_axes, toggle_show_grid, set_snap_threshold,
  } = useVenueEditorStore();

  const handle_zoom_out = () => set_zoom(zoom_level - 10);
  const handle_zoom_in = () => set_zoom(zoom_level + 10);

  // Determine lock status of selected element
  let is_selected_locked = false;
  if (selected_shape_id === "stage") {
    is_selected_locked = !!stage_shape.is_locked;
  } else if (selected_shape_id) {
    const section = sections.find(s => s.section_id === selected_shape_id);
    is_selected_locked = !!section?.is_locked;
  } else if (selected_seat) {
    is_selected_locked = !!seats.find(s => s.seat_id === selected_seat.seat_id)?.is_locked;
  } else if (multi_selected_seat_ids.length > 0) {
    // Just check the first one
    is_selected_locked = !!seats.find(s => s.seat_id === multi_selected_seat_ids[0])?.is_locked;
  }

  const handle_lock = () => {
    if (selected_shape_id === "stage") toggle_lock("stage", "stage");
    else if (selected_shape_id) toggle_lock(selected_shape_id, "section");
    else if (selected_seat) toggle_lock(selected_seat.seat_id, "seat");
    else if (multi_selected_seat_ids.length > 0) {
      multi_selected_seat_ids.forEach(id => toggle_lock(id, "seat"));
    }
  };

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          if (future.length > 0) redo();
        } else {
          e.preventDefault();
          if (past.length > 0) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (future.length > 0) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, past.length, future.length]);

  return (
    <div className="absolute left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/50 bg-background/80 p-1.5 shadow-xl backdrop-blur-md">
      {/* Undo / Redo */}
      <ToolbarButton 
        icon={<Undo2 size={18} />}
        title="Undo"
        shortcut="Ctrl+Z"
        onClick={undo}
        disabled={past.length === 0}
      />
      <ToolbarButton 
        icon={<Redo2 size={18} />}
        title="Redo"
        shortcut="Ctrl+Y"
        onClick={redo}
        disabled={future.length === 0}
      />
      <div className="mx-1 h-5 w-px bg-border" />

      {/* Tools */}
      <ToolbarButton 
        icon={<MousePointer2 size={18} />} 
        title="Select" 
        active={drawing_mode === "select"} 
        onClick={() => set_drawing_mode("select")} 
      />
      <ToolbarButton 
        icon={<Hand size={18} />} 
        title="Pan Canvas" 
        active={drawing_mode === "pan"} 
        onClick={() => set_drawing_mode("pan")} 
      />
      <ToolbarButton 
        icon={<Square size={18} />} 
        title="Add Shape (Section)" 
        active={drawing_mode === "add_shape"} 
        onClick={() => set_drawing_mode("add_shape")} 
      />
      <ToolbarButton 
        icon={<CircleDot size={18} />} 
        title="Add Seat" 
        active={drawing_mode === "add_seat"} 
        onClick={() => set_drawing_mode("add_seat")} 
      />
      <ToolbarButton
        icon={<LayoutGrid size={18} />}
        title="Seat Array (drag to fill a region with seats)"
        active={drawing_mode === "seat_array"}
        onClick={() => set_drawing_mode("seat_array")}
      />
      <ToolbarButton
        icon={<PaintBucket size={18} />}
        title="Paint Bucket (Pricing Mode)"
        active={drawing_mode === "paint"}
        onClick={() => set_drawing_mode("paint")}
      />

      <div className="mx-1 h-5 w-px bg-border" />

      {/* Snapping / Grid / Lock */}
      <ToolbarButton icon={<Grid3X3 size={18} />} title="Snap to Grid" active={snap_to_grid} onClick={toggle_snap_to_grid} />
      <ToolbarButton
        icon={show_grid ? <Eye size={18} /> : <EyeOff size={18} />}
        title={show_grid ? "Hide grid" : "Show grid"}
        active={show_grid}
        onClick={toggle_show_grid}
      />

      {/* Grid settings — only relevant while snapping is on */}
      {snap_to_grid && (
        <div className="flex items-center gap-1 rounded-lg bg-surface-container-low px-2 py-1">
          <input
            type="number"
            min={1}
            max={200}
            value={grid_size_x}
            title="Horizontal grid step"
            onChange={(e) => set_grid_size("x", Number(e.target.value))}
            className="w-9 border-b border-transparent bg-transparent text-center text-[11px] text-on-surface outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={toggle_grid_link_axes}
            title={grid_link_axes ? "Axes linked (square grid)" : "Axes independent"}
            className={cn(
              "rounded p-0.5 transition-colors",
              grid_link_axes ? "text-primary" : "text-text-secondary hover:text-on-surface"
            )}
          >
            {grid_link_axes ? <Link2 size={12} /> : <Unlink2 size={12} />}
          </button>
          <input
            type="number"
            min={1}
            max={200}
            value={grid_size_y}
            title="Vertical grid step"
            disabled={grid_link_axes}
            onChange={(e) => set_grid_size("y", Number(e.target.value))}
            className={cn(
              "w-9 border-b border-transparent bg-transparent text-center text-[11px] text-on-surface outline-none focus:border-primary",
              grid_link_axes && "opacity-40"
            )}
          />
          <span className="mx-1 h-4 w-px bg-border-subtle" />
          <span className="text-[10px] text-text-secondary" title="Magnetic range: 0 always snaps, higher only snaps when close">
            ±
          </span>
          <input
            type="number"
            min={0}
            max={50}
            value={snap_threshold}
            title="Magnetic range in px (0 = always snap)"
            onChange={(e) => set_snap_threshold(Number(e.target.value))}
            className="w-9 border-b border-transparent bg-transparent text-center text-[11px] text-on-surface outline-none focus:border-primary"
          />
        </div>
      )}
      <ToolbarButton 
        icon={<Lock size={18} className={is_selected_locked ? "text-primary" : ""} />} 
        title="Lock Selection" 
        onClick={handle_lock}
        active={is_selected_locked}
        disabled={!selected_shape_id && !selected_seat && multi_selected_seat_ids.length === 0}
      />

      <Divider />

      {/* Zoom */}
      <div className="flex items-center gap-1 px-2">
        <Tooltip label="Zoom out">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => set_zoom(zoom_level - 25)}
            className="text-text-secondary transition-colors hover:text-primary"
          >
            <Minus size={16} />
          </button>
        </Tooltip>
        <span className="w-12 text-center text-xs font-medium text-primary">
          {zoom_level}%
        </span>
        <Tooltip label="Zoom in">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => set_zoom(zoom_level + 25)}
            className="text-text-secondary transition-colors hover:text-primary"
          >
            <Plus size={16} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

/**
 * Styled hover label for the icon-only toolbar controls. Sits below the
 * button since the toolbar is pinned to the top of the canvas.
 */
function Tooltip({
  label,
  shortcut,
  children,
}: {
  label: string;
  shortcut?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-on-primary opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100"
      >
        {label}
        {shortcut && (
          <kbd className="rounded border border-white/25 px-1 text-[10px] text-on-primary/70">
            {shortcut}
          </kbd>
        )}
      </span>
    </div>
  );
}

function ToolbarButton({
  icon,
  title,
  shortcut,
  active = false,
  disabled = false,
  variant = "default",
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  variant?: "default" | "accent";
  onClick?: () => void;
}) {
  return (
    <Tooltip label={title} shortcut={shortcut}>
      <button
        type="button"
        aria-label={title}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex cursor-pointer items-center justify-center rounded-lg p-2 transition-colors",
          disabled && "opacity-50 cursor-not-allowed",
          active
            ? variant === "default"
              ? "bg-primary text-on-primary"
              : "bg-accent-blue text-on-primary"
            : "text-on-surface hover:bg-surface-container-low"
        )}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

function Divider() {
  return <div className="mx-1 h-6 w-px bg-border-subtle" />;
}
