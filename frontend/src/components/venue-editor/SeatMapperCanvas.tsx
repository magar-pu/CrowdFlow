/**
 * components/venue-editor/SeatMapperCanvas.tsx
 *
 * Interactive canvas for the Seat Mapper mode. Displays:
 * - Main Stage element
 * - Seat sections (VIP Pit, Gold Circle, GA Left/Right)
 * - Individual seat dots (clickable)
 * - Floating context menu for selected sections
 *
 * Matches the canvas from venue_map_editor code.html.
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Copy, Square, Circle, Triangle, Scan, Coffee, Info, LogOut, PlusSquare, Tent, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VenueSection, VenueSeat, VenueShape, VenueFacility, FacilityIconType, SeatArrangeForm } from "@/types/ticket";
import { useVenueEditorStore } from "@/lib/store/venueEditorStore";

interface SeatMapperCanvasProps {
  sections: VenueSection[];
  selected_seat: VenueSeat | null;
  on_seat_click: (seat: VenueSeat) => void;
  zoom_level: number;
  is_locked_mode?: boolean;
}

export function SeatMapperCanvas({
  sections,
  selected_seat,
  on_seat_click,
  zoom_level,
  is_locked_mode = false,
}: SeatMapperCanvasProps) {
  const { 
    seats,
    add_seat, fill_seats_in_rect, delete_seat, duplicate_row, update_seat,
    stage_shape, update_stage_shape, update_section_shape,
    drawing_mode, set_drawing_mode, add_new_section,
    multi_selected_seat_ids, set_multi_selected_seats, delete_multiple_seats,
    capture_arrange_frame, translate_arrange_frame,
    selected_shape_id, set_selected_shape_id, move_selected_elements,
    update_section, generate_seats_for_section,
    facilities, update_facility, remove_facility,
    blueprint,
    pricing_tiers, selected_paint_tier_id, paint_seats, save_history,
    grid_size_x, grid_size_y, show_grid
  } = useVenueEditorStore();
  const scale = zoom_level / 100;

  // Seats are already flat. Colour comes from the assigned tier, falling back
  // to the section tag's colour when the seat carries one.
  const all_seats = seats.map((seat) => {
    const tier = pricing_tiers.find(t => t.tier_id === seat.tier_id);
    const section = seat.section_id
      ? sections.find(s => s.section_id === seat.section_id)
      : undefined;
    return { ...seat, color: tier ? tier.color : (section?.color || "#e2e8f0") };
  });

  // ── Canvas Panning & Selection State ─────────────────────────────────
  const [pan, set_pan] = useState({ x: 0, y: 0 });
  const [is_panning, set_is_panning] = useState(false);
  const pan_start = useRef({ x: 0, y: 0 });
  const container_ref = useRef<HTMLDivElement>(null);
  const has_centered = useRef(false);

  // Center camera on stage on initial load
  useEffect(() => {
    if (has_centered.current) return;

    // Wait for DOM layout and Zustand hydration
    const timer = setTimeout(() => {
      const current_stage = useVenueEditorStore.getState().stage_shape;
      if (current_stage && container_ref.current) {
        const cw = container_ref.current.clientWidth;
        const ch = container_ref.current.clientHeight;
        
        if (cw === 0 || ch === 0) return; // Not laid out yet

        const stage_cx = current_stage.x + current_stage.width / 2;
        // We position the stage slightly above the center (e.g. 150px) to leave room below it
        const stage_cy = current_stage.y + current_stage.height / 2;
        
        set_pan({
          x: cw / 2 - stage_cx * scale,
          y: ch / 2 - stage_cy * scale + 150,
        });
        has_centered.current = true;
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [scale]); // depend on scale, but has_centered ensures it only applies once

  // Marquee Selection
  const [selection_box, set_selection_box] = useState<{ startX: number, startY: number, endX: number, endY: number } | null>(null);

  // Seat Generator State
  const [gen_rows, set_gen_rows] = useState(5);
  const [gen_cols, set_gen_cols] = useState(10);
  const [gen_curve, set_gen_curve] = useState(0);

  // Snapshot the arrange frame in the store whenever the selection changes;
  // the SeatArrangePanel (right sidebar) drives the layout from there.
  const arrange_key = multi_selected_seat_ids.join(",");
  useEffect(() => {
    capture_arrange_frame(multi_selected_seat_ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrange_key]);

  // Tracks an in-flight group drag so history is saved once, not per pointermove.
  const group_drag_active = useRef(false);

  const handle_pointer_down = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[role="button"]') || target.closest('button')) return;

    set_selected_shape_id(null); // deselect shape if clicking empty background
    set_multi_selected_seats([]); // clear multi-select
    useVenueEditorStore.getState().select_seat(null); // clear single select

    const rect = e.currentTarget.getBoundingClientRect();
    const canvas_x = (e.clientX - rect.left - pan.x) / scale;
    const canvas_y = (e.clientY - rect.top - pan.y) / scale;

    if (drawing_mode === "add_shape" && !is_locked_mode) {
      add_new_section(canvas_x, canvas_y);
      set_drawing_mode("select");
      return;
    } else if (drawing_mode === "add_seat" && !is_locked_mode) {
      // Find which section this point is inside (top-most section)
      const target_section = [...sections].reverse().find(s => {
        if (!s.shape) return false;
        return canvas_x >= s.shape.x && canvas_x <= s.shape.x + s.shape.width &&
               canvas_y >= s.shape.y && canvas_y <= s.shape.y + s.shape.height;
      });

      const target_id = target_section ? target_section.section_id : (selected_seat?.section_id || "");
      
      add_seat(target_id, canvas_x, canvas_y);
      set_drawing_mode("select");
      return;
    } else if (
      drawing_mode === "select" ||
      (drawing_mode === "seat_array" && !is_locked_mode)
    ) {
      // Seat Array reuses the marquee: drag a region, fill it with seats on release.
      set_selection_box({ startX: canvas_x, startY: canvas_y, endX: canvas_x, endY: canvas_y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // pan mode
    set_is_panning(true);
    pan_start.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handle_pointer_move = (e: React.PointerEvent) => {
    if (is_panning) {
      set_pan({
        x: e.clientX - pan_start.current.x,
        y: e.clientY - pan_start.current.y,
      });
    } else if (selection_box) {
      const rect = e.currentTarget.getBoundingClientRect();
      const canvas_x = (e.clientX - rect.left - pan.x) / scale;
      const canvas_y = (e.clientY - rect.top - pan.y) / scale;
      set_selection_box((prev) => prev ? { ...prev, endX: canvas_x, endY: canvas_y } : null);
    }
  };

  const handle_pointer_up = (e: React.PointerEvent) => {
    if (is_panning) {
      set_is_panning(false);
    } else if (selection_box) {
      // Finalize selection
      const minX = Math.min(selection_box.startX, selection_box.endX);
      const maxX = Math.max(selection_box.startX, selection_box.endX);
      const minY = Math.min(selection_box.startY, selection_box.endY);
      const maxY = Math.max(selection_box.startY, selection_box.endY);

      if (drawing_mode === "seat_array") {
        // A drag fills the region; a tap (no real drag) falls back to one seat.
        if (maxX - minX < 8 && maxY - minY < 8) {
          add_seat("", minX, minY);
        } else {
          fill_seats_in_rect(minX, minY, maxX, maxY);
        }
        set_selection_box(null);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        return;
      }

      // Check which seats fall into the bounding box
      const selected_ids = all_seats
        .filter((seat) => seat.x >= minX && seat.x <= maxX && seat.y >= minY && seat.y <= maxY)
        .map((seat) => seat.seat_id);

      if (drawing_mode === "paint") {
        paint_seats(selected_ids, selected_paint_tier_id || undefined);
      } else {
        set_multi_selected_seats(selected_ids);
      }
      set_selection_box(null);
    }
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handle_wheel = (e: React.WheelEvent) => {
    // Zoom in/out using scroll wheel
    const zoom_delta = e.deltaY > 0 ? -10 : 10;
    useVenueEditorStore.getState().set_zoom(zoom_level + zoom_delta);
  };

  // Keyboard shortcut for deleting selected element
  useEffect(() => {
    if (is_locked_mode) return; // Disable deletion in locked mode

    const handle_keydown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const move_amount = e.shiftKey ? 50 : 10;

      switch (e.key) {
        case "Delete":
        case "Backspace":
          if (multi_selected_seat_ids.length > 0) {
            const has_locked = all_seats.some(s => multi_selected_seat_ids.includes(s.seat_id) && s.is_locked);
            if (!has_locked) delete_multiple_seats(multi_selected_seat_ids);
          } else if (selected_seat) {
            const seat_is_locked = seats.find(s => s.seat_id === selected_seat.seat_id)?.is_locked;
            if (!seat_is_locked) delete_seat(selected_seat.seat_id);
          } else if (selected_shape_id && selected_shape_id !== "stage") {
            const section_is_locked = sections.find(s => s.section_id === selected_shape_id)?.is_locked;
            if (!section_is_locked) {
              useVenueEditorStore.getState().remove_section(selected_shape_id);
              set_selected_shape_id(null);
            }
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          move_selected_elements(0, -move_amount);
          break;
        case "ArrowDown":
          e.preventDefault();
          move_selected_elements(0, move_amount);
          break;
        case "ArrowLeft":
          e.preventDefault();
          move_selected_elements(-move_amount, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          move_selected_elements(move_amount, 0);
          break;
      }
    };

    window.addEventListener("keydown", handle_keydown);
    return () => window.removeEventListener("keydown", handle_keydown);
  }, [
    selected_seat, selected_shape_id, delete_seat, 
    multi_selected_seat_ids, delete_multiple_seats, 
    all_seats, sections, move_selected_elements
  ]);

  const handle_add_seat = () => {
    if (!selected_seat || is_locked_mode) return;
    add_seat(selected_seat.section_id, selected_seat.x + 30, selected_seat.y);
  };

  const handle_duplicate_row = () => {
    if (!selected_seat || is_locked_mode) return;
    duplicate_row(selected_seat.row, selected_seat.section_id);
  };

  const handle_delete_seat = () => {
    if (!selected_seat || is_locked_mode) return;
    delete_seat(selected_seat.seat_id);
  };

  return (
    <div
      ref={container_ref}
      style={
        show_grid
          ? {
              // Scale/offset the dots with the viewport so they line up with
              // the coordinates seats actually snap to.
              backgroundSize: `${grid_size_x * scale}px ${grid_size_y * scale}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }
          : undefined
      }
      className={cn(
        "relative h-full w-full overflow-hidden bg-background",
        show_grid && "canvas-grid",
        is_panning 
          ? "cursor-grabbing" 
          : drawing_mode === "pan"
            ? "cursor-grab"
            : drawing_mode !== "select" 
              ? "cursor-crosshair" 
              : "cursor-default"
      )}
      onPointerDown={handle_pointer_down}
      onPointerMove={handle_pointer_move}
      onPointerUp={handle_pointer_up}
      onPointerCancel={handle_pointer_up}
      onWheel={handle_wheel}
    >
      <div
        className="relative h-[3000px] w-[3000px]"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* Render Marquee Selection Box */}
        {selection_box && (
          <div
            className="absolute border border-primary bg-primary/20 pointer-events-none z-50"
            style={{
              left: Math.min(selection_box.startX, selection_box.endX),
              top: Math.min(selection_box.startY, selection_box.endY),
              width: Math.abs(selection_box.endX - selection_box.startX),
              height: Math.abs(selection_box.endY - selection_box.startY),
            }}
          />
        )}

        {/* Render Blueprint Background */}
        {blueprint && (
          <img
            src={blueprint.image_url}
            alt="Venue Blueprint"
            className="absolute pointer-events-none z-0"
            style={{
              left: blueprint.offset_x,
              top: blueprint.offset_y,
              transform: `scale(${blueprint.scale})`,
              transformOrigin: "top left",
              opacity: blueprint.opacity,
            }}
          />
        )}

        {/* Render Stage Shape */}
        {stage_shape && (
          <DraggableShapeNode
            shape_id="stage"
            shape={stage_shape}
            label="MAIN STAGE"
            color="#0f172a"
            is_selected={selected_shape_id === "stage"}
            is_locked={!!stage_shape.is_locked || is_locked_mode}
            disable_pointer_events={drawing_mode === "add_seat" || drawing_mode === "seat_array" || is_locked_mode}
            on_select={() => { if (!is_locked_mode) set_selected_shape_id("stage"); }}
            on_update={(updates) => { if (!is_locked_mode) update_stage_shape(updates); }}
          />
        )}

        {/* Render Section Shapes */}
        {sections.map((section) => (
          section.shape && (
            <DraggableShapeNode
              key={section.section_id}
              shape_id={section.section_id}
              shape={section.shape}
              label={section.label}
              color={section.color}
              is_selected={selected_shape_id === section.section_id}
              is_locked={!!section.is_locked || is_locked_mode}
              disable_pointer_events={drawing_mode === "add_seat" || drawing_mode === "seat_array" || is_locked_mode}
              on_select={() => { if (!is_locked_mode) set_selected_shape_id(section.section_id); }}
              on_update={(updates) => { if (!is_locked_mode) update_section_shape(section.section_id, updates); }}
              on_label_change={(new_label) => { if (!is_locked_mode) update_section(section.section_id, { label: new_label }); }}
            />
          )
        ))}

        {/* Render all seats absolutely */}
        {all_seats.map((seat) => (
          <DraggableSeatDot
            key={seat.seat_id}
            seat={seat}
            is_selected={
              selected_seat?.seat_id === seat.seat_id ||
              multi_selected_seat_ids.includes(seat.seat_id)
            }
            section_color={seat.color}
            on_click={(e) => {
              if (drawing_mode === "paint") {
                paint_seats([seat.seat_id], selected_paint_tier_id || undefined);
                return;
              }
              if (e && (e.shiftKey || e.ctrlKey || e.metaKey)) {
                let new_ids = [...multi_selected_seat_ids];
                // If there was a single selected seat, convert it to multi-select first
                if (selected_seat && !new_ids.includes(selected_seat.seat_id)) {
                  new_ids.push(selected_seat.seat_id);
                }
                
                if (new_ids.includes(seat.seat_id)) {
                  new_ids = new_ids.filter(id => id !== seat.seat_id);
                } else {
                  new_ids.push(seat.seat_id);
                }
                useVenueEditorStore.getState().set_multi_selected_seats(new_ids);
                useVenueEditorStore.setState({ selected_seat: null }); // Clear single seat without wiping array
              } else if (
                multi_selected_seat_ids.length > 1 &&
                multi_selected_seat_ids.includes(seat.seat_id)
              ) {
                // Pressing a seat that's already part of a group keeps the group
                // intact so it can be dragged as a unit (and so the arrange
                // toolbar doesn't vanish). Clicking a seat outside the group
                // still collapses the selection to that seat, below.
              } else {
                useVenueEditorStore.getState().select_seat(seat);
              }
            }}
            on_drag_end={(x, y) => { if (!is_locked_mode) update_seat(seat.seat_id, { x, y }); }}
            is_group_drag={
              multi_selected_seat_ids.length > 1 &&
              multi_selected_seat_ids.includes(seat.seat_id)
            }
            on_group_drag={(dx, dy) => {
              if (is_locked_mode) return;
              // One history entry for the whole drag, captured on first move.
              if (!group_drag_active.current) {
                group_drag_active.current = true;
                save_history();
              }
              move_selected_elements(dx, dy, false);
              // Keep the arrange frame with the seats being dragged.
              translate_arrange_frame(dx, dy);
            }}
            on_group_drag_end={() => { group_drag_active.current = false; }}
            is_locked_mode={is_locked_mode}
          />
        ))}

        {/* Render Facility Icons */}
        {facilities.map((facility) => (
          <DraggableFacilityNode
            key={facility.id}
            facility={facility}
            is_selected={selected_shape_id === facility.id}
            on_select={() => set_selected_shape_id(facility.id)}
            on_drag_end={(x, y) => update_facility(facility.id, x, y)}
            on_delete={() => remove_facility(facility.id)}
          />
        ))}

        {/* Context Menu for multi-selected seats */}

        {/* Context Menu (floating near single selected seat) */}
        {selected_seat && multi_selected_seat_ids.length <= 1 && !is_locked_mode && (
          <div
            className="absolute z-30 mb-2 flex items-center gap-1 rounded-lg bg-primary p-1.5 text-on-primary shadow-xl"
            style={{
              left: selected_seat.x,
              top: selected_seat.y - 45,
              transform: "translateX(-50%)",
            }}
          >
            <button
              type="button"
              onClick={handle_add_seat}
              className="flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium transition-colors hover:bg-white/10"
            >
              <Plus size={14} /> Add Seat
            </button>
            <button
              type="button"
              onClick={handle_duplicate_row}
              className="flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium transition-colors hover:bg-white/10"
            >
              <Copy size={14} /> Duplicate Row
            </button>
            {(!selected_seat.is_locked) && (
              <>
                <div className="mx-1 h-4 w-px bg-white/20" />
                <button
                  type="button"
                  onClick={handle_delete_seat}
                  className="flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/20"
                >
                  <Trash2 size={14} /> Delete Seat
                </button>
              </>
            )}
          </div>
        )}

        {/* Context Menu for selected shape */}
        {selected_shape_id && selected_shape_id !== "stage" && !is_locked_mode && (
          (() => {
            const selected_section = sections.find(s => s.section_id === selected_shape_id);
            if (!selected_section?.shape || selected_section.is_locked) return null;
            return (
              <div
                className="absolute z-30 flex items-center gap-1 rounded-lg bg-primary p-1.5 text-on-primary shadow-xl"
                style={{
                  left: selected_section.shape.x + selected_section.shape.width / 2,
                  top: selected_section.shape.y - 45,
                  transform: "translateX(-50%)",
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* Shape Type Toggles */}
                <button
                  type="button"
                  onClick={() => useVenueEditorStore.getState().update_section_shape(selected_shape_id, { type: "rectangle" })}
                  className={cn("p-1.5 rounded-md transition-colors hover:bg-white/20", selected_section.shape.type === "rectangle" && "bg-white/20")}
                  title="Rectangle"
                >
                  <Square size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => useVenueEditorStore.getState().update_section_shape(selected_shape_id, { type: "rounded-rectangle" })}
                  className={cn("p-1.5 rounded-md transition-colors hover:bg-white/20", selected_section.shape.type === "rounded-rectangle" && "bg-white/20")}
                  title="Rounded Rectangle"
                >
                  <Scan size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => useVenueEditorStore.getState().update_section_shape(selected_shape_id, { type: "ellipse" })}
                  className={cn("p-1.5 rounded-md transition-colors hover:bg-white/20", selected_section.shape.type === "ellipse" && "bg-white/20")}
                  title="Ellipse"
                >
                  <Circle size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => useVenueEditorStore.getState().update_section_shape(selected_shape_id, { type: "polygon" })}
                  className={cn("p-1.5 rounded-md transition-colors hover:bg-white/20", selected_section.shape.type === "polygon" && "bg-white/20")}
                  title="Triangle"
                >
                  <Triangle size={14} />
                </button>

                <div className="mx-1 h-4 w-px bg-white/20" />
                
                {/* Seat Generator Input Fields */}
                <div className="flex items-center gap-1 bg-white/10 rounded-md px-2 py-1">
                  <input 
                    type="number" 
                    min={1} max={50}
                    value={gen_rows}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 1;
                      set_gen_rows(val);
                      useVenueEditorStore.getState().generate_seats_for_section(selected_shape_id, val, gen_cols, gen_curve, false);
                    }}
                    onBlur={() => useVenueEditorStore.getState().save_history()}
                    className="w-10 bg-transparent text-white text-[10px] text-center outline-none border-b border-transparent focus:border-white/50"
                    title="Rows"
                  />
                  <span className="text-[10px] text-white/50">×</span>
                  <input 
                    type="number" 
                    min={1} max={100}
                    value={gen_cols}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 1;
                      set_gen_cols(val);
                      useVenueEditorStore.getState().generate_seats_for_section(selected_shape_id, gen_rows, val, gen_curve, false);
                    }}
                    onBlur={() => useVenueEditorStore.getState().save_history()}
                    className="w-10 bg-transparent text-white text-[10px] text-center outline-none border-b border-transparent focus:border-white/50"
                    title="Columns"
                  />
                  
                  <div className="mx-1 h-4 w-px bg-white/20" />
                  
                  {/* Curve Slider */}
                  <div className="flex items-center gap-1 px-1" title="Double click slider to reset to straight">
                    <span className="text-[10px] text-white/50">Arc</span>
                    <div className="relative flex items-center">
                      {/* Center tick indicator */}
                      <div className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-white/60" />
                      
                      <input 
                        type="range" 
                        min={-100} max={100} step={5}
                        value={gen_curve}
                        onDoubleClick={() => {
                          set_gen_curve(0);
                          useVenueEditorStore.getState().generate_seats_for_section(selected_shape_id, gen_rows, gen_cols, 0, true);
                        }}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          set_gen_curve(val);
                          useVenueEditorStore.getState().generate_seats_for_section(selected_shape_id, gen_rows, gen_cols, val, false);
                        }}
                        onPointerUp={() => useVenueEditorStore.getState().save_history()}
                        className="relative z-10 w-16 cursor-pointer opacity-90 accent-white transition-opacity hover:opacity-100"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => generate_seats_for_section(selected_shape_id, gen_rows, gen_cols, gen_curve)}
                    className="ml-1 px-2 py-0.5 rounded bg-white text-primary text-[10px] font-bold hover:bg-white/90 transition-colors"
                  >
                    FILL
                  </button>
                </div>

                <div className="mx-1 h-4 w-px bg-white/20" />

                <button
                  type="button"
                  onClick={() => {
                    useVenueEditorStore.getState().remove_section(selected_shape_id);
                    set_selected_shape_id(null);
                  }}
                  className="flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/20"
                >
                  <Trash2 size={14} /> Delete Section
                </button>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}

// ── Draggable Shape Component ────────────────────────────────────────────

interface DraggableShapeNodeProps {
  shape_id: string;
  shape: VenueShape;
  label: string;
  color: string;
  is_selected: boolean;
  is_locked?: boolean;
  disable_pointer_events?: boolean;
  on_select: () => void;
  on_update: (updates: Partial<VenueShape>) => void;
  on_label_change?: (new_label: string) => void;
}

function DraggableShapeNode({
  shape_id,
  shape,
  label,
  color,
  is_selected,
  is_locked,
  disable_pointer_events,
  on_select,
  on_update,
  on_label_change,
}: DraggableShapeNodeProps) {
  const [is_dragging, set_is_dragging] = useState(false);
  const [resize_dir, set_resize_dir] = useState<string | null>(null);
  
  const [is_editing_label, set_is_editing_label] = useState(false);
  const [edit_label, set_edit_label] = useState(label);
  
  const [local_shape, set_local_shape] = useState(shape);
  const start_pos = useRef({ x: 0, y: 0 });
  const start_shape = useRef(shape);

  useEffect(() => {
    set_local_shape(shape);
  }, [shape.x, shape.y, shape.width, shape.height, shape.type]);

  const handlePointerDown = (e: React.PointerEvent, dir?: string) => {
    e.stopPropagation();
    on_select();
    if (is_locked || is_editing_label) return; // Prevent drag if locked or editing text

    start_pos.current = { x: e.clientX, y: e.clientY };
    start_shape.current = local_shape;
    if (dir) set_resize_dir(dir);
    else set_is_dragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!is_dragging && !resize_dir) return;
    e.stopPropagation();
    const dx = Math.round((e.clientX - start_pos.current.x) / 10) * 10;
    const dy = Math.round((e.clientY - start_pos.current.y) / 10) * 10;

    if (is_dragging) {
      set_local_shape({ ...start_shape.current, x: start_shape.current.x + dx, y: start_shape.current.y + dy });
    } else if (resize_dir) {
      if (resize_dir === 'se') {
        set_local_shape({
          ...start_shape.current,
          width: Math.max(50, start_shape.current.width + dx),
          height: Math.max(50, start_shape.current.height + dy),
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!is_dragging && !resize_dir) return;
    e.stopPropagation();
    set_is_dragging(false);
    set_resize_dir(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    on_update(local_shape);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "absolute group transition-colors",
        shape.type !== "polygon" && "border-2",
        shape.type !== "polygon" && (is_selected ? "border-primary shadow-lg" : "border-transparent"),
        shape.type === "rounded-rectangle" ? "rounded-t-[40px]" : 
        shape.type === "ellipse" ? "rounded-full" : 
        shape.type === "rectangle" ? "rounded-md" : "",
        disable_pointer_events ? "pointer-events-none" : ""
      )}
      style={{
        left: local_shape.x,
        top: local_shape.y,
        width: local_shape.width,
        height: local_shape.height,
        backgroundColor: shape.type === "polygon" ? "transparent" : `${color}1A`,
        borderColor: shape.type === "polygon" ? "transparent" : (is_selected ? "hsl(var(--primary))" : `${color}4D`),
        cursor: is_dragging ? "grabbing" : "grab",
        zIndex: is_selected ? 5 : 0,
      }}
      onPointerDown={(e) => handlePointerDown(e)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {shape.type === "polygon" && (
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 pointer-events-none">
          <polygon 
            points="50,0 0,100 100,100" 
            fill={`${color}1A`} 
            stroke={is_selected ? "hsl(var(--primary))" : `${color}4D`} 
            strokeWidth="4" 
            strokeLinejoin="round"
          />
        </svg>
      )}
      {shape_id === "stage" ? (
        <div className="flex h-full w-full items-center justify-center pointer-events-none">
           <span className="text-2xl font-black tracking-[0.2em] text-white" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
             {label}
           </span>
        </div>
      ) : (
        <div 
          className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-surface-white/90 backdrop-blur-sm shadow-sm border text-[10px] font-bold uppercase tracking-widest whitespace-nowrap z-10" 
          style={{ color, borderColor: `${color}4D` }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (on_label_change && !is_locked) {
              set_is_editing_label(true);
              set_edit_label(label);
            }
          }}
        >
          {is_editing_label ? (
            <input
              autoFocus
              className="bg-transparent outline-none text-center min-w-[80px]"
              value={edit_label}
              onChange={(e) => set_edit_label(e.target.value)}
              onBlur={() => {
                set_is_editing_label(false);
                if (on_label_change) on_label_change(edit_label);
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  set_is_editing_label(false);
                  if (on_label_change) on_label_change(edit_label);
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={on_label_change && !is_locked ? "cursor-text" : "pointer-events-none"}>{label}</span>
          )}
        </div>
      )}

      {is_selected && !is_locked && (
        <div 
          className="absolute -right-2 -bottom-2 w-4 h-4 bg-primary rounded-full cursor-se-resize border-2 border-white shadow-sm"
          onPointerDown={(e) => handlePointerDown(e, 'se')}
        />
      )}
    </div>
  );
}

// ── Draggable Seat Component ─────────────────────────────────────────────

interface DraggableSeatDotProps {
  seat: VenueSeat;
  is_selected: boolean;
  section_color: string;
  on_click: (e?: React.PointerEvent) => void;
  on_drag_end: (x: number, y: number) => void;
  is_locked_mode?: boolean;
  /** True when this seat is part of a multi-selection being dragged as a unit. */
  is_group_drag?: boolean;
  on_group_drag?: (dx: number, dy: number) => void;
  on_group_drag_end?: () => void;
}

function DraggableSeatDot({
  seat,
  is_selected,
  section_color,
  on_click,
  on_drag_end,
  is_locked_mode,
  is_group_drag = false,
  on_group_drag,
  on_group_drag_end,
}: DraggableSeatDotProps) {
  const [is_dragging, set_is_dragging] = useState(false);
  const [position, set_position] = useState({ x: seat.x, y: seat.y });
  const start_pos = useRef({ x: 0, y: 0 });
  // Last position we emitted a group delta from — kept in a ref so the delta
  // maths never races the store update that moves this seat.
  const last_group_pos = useRef({ x: seat.x, y: seat.y });
  const snap_position = useVenueEditorStore((s) => s.snap_position);

  // Sync state if it changed from the properties panel
  useEffect(() => {
    set_position({ x: seat.x, y: seat.y });
  }, [seat.x, seat.y]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    on_click(e);
    if (seat.is_locked || is_locked_mode) return; // Prevent drag if locked

    set_is_dragging(true);
    start_pos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    last_group_pos.current = { x: position.x, y: position.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!is_dragging) return;
    e.stopPropagation();
    const next_x = snap_position(e.clientX - start_pos.current.x, "x");
    const next_y = snap_position(e.clientY - start_pos.current.y, "y");

    if (is_group_drag && on_group_drag) {
      // Move the whole selection by the delta; the store moves this seat too,
      // and the sync effect above pulls `position` back into line.
      const dx = next_x - last_group_pos.current.x;
      const dy = next_y - last_group_pos.current.y;
      if (dx !== 0 || dy !== 0) {
        last_group_pos.current = { x: next_x, y: next_y };
        on_group_drag(dx, dy);
      }
      return;
    }

    set_position({ x: next_x, y: next_y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!is_dragging) return;
    e.stopPropagation();
    set_is_dragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (is_group_drag) {
      on_group_drag_end?.();
      return;
    }
    on_drag_end(position.x, position.y);
  };

  // Seat status visual modifiers
  const is_unavailable = seat.status === "unavailable";
  const is_accessible = seat.status === "accessible";
  const is_locked_status = seat.status === "locked";

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") on_click();
      }}
      className={cn("seat-dot group absolute", is_selected && "selected")}
      style={{
        backgroundColor: is_unavailable ? "#94a3b8" : section_color,
        left: position.x - 7,
        top: position.y - 7,
        cursor: is_dragging ? "grabbing" : "grab",
        zIndex: is_selected ? 10 : 1,
        opacity: is_unavailable ? 0.35 : 1,
      }}
      title={`${seat.row}-${seat.number}${is_unavailable ? " (Unavailable)" : ""}${is_accessible ? " (Accessible)" : ""}${is_locked_status ? " (Locked)" : ""}`}
    >
      {/* Tooltip */}
      <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
        {seat.row}-{seat.number}
      </div>

      {/* Unavailable strikethrough */}
      {is_unavailable && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ transform: "rotate(45deg)" }}
        >
          <div className="h-[2px] w-[120%] bg-slate-500 rounded-full" />
        </div>
      )}

      {/* Accessible badge */}
      {is_accessible && (
        <div className="pointer-events-none absolute -right-1.5 -bottom-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[7px] text-white font-bold shadow-sm">
          ♿
        </div>
      )}

      {/* Locked status badge */}
      {is_locked_status && (
        <div className="pointer-events-none absolute -right-1.5 -bottom-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[7px] text-white font-bold shadow-sm">
          🔒
        </div>
      )}
    </div>
  );
}

// ── Draggable Facility Component ─────────────────────────────────────────────

interface DraggableFacilityNodeProps {
  facility: VenueFacility;
  is_selected: boolean;
  on_select: () => void;
  on_drag_end: (x: number, y: number) => void;
  on_delete: () => void;
}

const FACILITY_ICONS: Record<FacilityIconType, { icon: any; color: string; bg: string; label: string }> = {
  restroom: { icon: Tent, color: "text-blue-500", bg: "bg-blue-500/10", label: "Restroom" },
  food: { icon: Utensils, color: "text-orange-500", bg: "bg-orange-500/10", label: "Food & Drink" },
  medical: { icon: PlusSquare, color: "text-red-500", bg: "bg-red-500/10", label: "First Aid" },
  exit: { icon: LogOut, color: "text-green-500", bg: "bg-green-500/10", label: "Gate / Exit" },
  info: { icon: Info, color: "text-purple-500", bg: "bg-purple-500/10", label: "Information" },
  merch: { icon: Coffee, color: "text-pink-500", bg: "bg-pink-500/10", label: "Merchandise" },
};

function DraggableFacilityNode({
  facility,
  is_selected,
  on_select,
  on_drag_end,
  on_delete,
}: DraggableFacilityNodeProps) {
  const [is_dragging, set_is_dragging] = useState(false);
  const [position, set_position] = useState({ x: facility.x, y: facility.y });
  const start_pos = useRef({ x: 0, y: 0 });

  const conf = FACILITY_ICONS[facility.type];
  const Icon = conf.icon;

  useEffect(() => {
    set_position({ x: facility.x, y: facility.y });
  }, [facility.x, facility.y]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    on_select();

    set_is_dragging(true);
    start_pos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!is_dragging) return;
    e.stopPropagation();
    set_position({
      x: Math.round((e.clientX - start_pos.current.x) / 10) * 10,
      y: Math.round((e.clientY - start_pos.current.y) / 10) * 10,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!is_dragging) return;
    e.stopPropagation();
    set_is_dragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    on_drag_end(position.x, position.y);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        "absolute group flex flex-col items-center gap-1",
        is_selected ? "z-20" : "z-10"
      )}
      style={{
        left: position.x,
        top: position.y,
        cursor: is_dragging ? "grabbing" : "grab",
        transform: "translate(-50%, -50%)",
      }}
    >
      <div 
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-all bg-surface-white",
          conf.color,
          is_selected ? "ring-2 ring-primary scale-110" : "ring-1 ring-border-subtle"
        )}
      >
        <div className={cn("absolute inset-0 rounded-xl opacity-20", conf.bg)} />
        <Icon size={24} className="relative z-10" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary bg-surface-white/80 px-2 py-0.5 rounded shadow-sm">
        {conf.label}
      </span>

      {is_selected && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            on_delete();
          }}
          className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}
