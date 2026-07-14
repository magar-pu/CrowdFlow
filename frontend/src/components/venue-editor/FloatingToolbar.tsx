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
    sections, stage_shape, zoom_level, set_zoom,
    snap_to_grid, toggle_snap_to_grid,
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
    const section = sections.find(s => s.section_id === selected_seat.section_id);
    const seat = section?.seats.find(s => s.seat_id === selected_seat.seat_id);
    is_selected_locked = !!seat?.is_locked;
  } else if (multi_selected_seat_ids.length > 0) {
    // Just check the first one
    const first_id = multi_selected_seat_ids[0];
    const section = sections.find(s => s.seats.some(seat => seat.seat_id === first_id));
    const seat = section?.seats.find(s => s.seat_id === first_id);
    is_selected_locked = !!seat?.is_locked;
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
        onClick={undo}
        disabled={past.length === 0}
      />
      <ToolbarButton 
        icon={<Redo2 size={18} />} 
        title="Redo" 
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
        icon={<PaintBucket size={18} />} 
        title="Paint Bucket (Pricing Mode)" 
        active={drawing_mode === "paint"} 
        onClick={() => set_drawing_mode("paint")} 
      />

      <div className="mx-1 h-5 w-px bg-border" />

      {/* Snapping / Grid / Lock */}
      <ToolbarButton icon={<Grid3X3 size={18} />} title="Snap to Grid" active={snap_to_grid} onClick={toggle_snap_to_grid} />
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
        <button
          type="button"
          onClick={() => set_zoom(zoom_level - 25)}
          className="text-text-secondary transition-colors hover:text-primary"
        >
          <Minus size={16} />
        </button>
        <span className="w-12 text-center text-xs font-medium text-primary">
          {zoom_level}%
        </span>
        <button
          type="button"
          onClick={() => set_zoom(zoom_level + 25)}
          className="text-text-secondary transition-colors hover:text-primary"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function ToolbarButton({
  icon,
  title,
  active = false,
  disabled = false,
  variant = "default",
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  disabled?: boolean;
  variant?: "default" | "accent";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
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
  );
}

function Divider() {
  return <div className="mx-1 h-6 w-px bg-border-subtle" />;
}
