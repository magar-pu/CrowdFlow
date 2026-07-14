/**
 * lib/store/venueEditorStore.ts
 *
 * Zustand store for the VenueMaster Pro venue editor. Manages active
 * tool, sections, seats, ticket configurations, and selected seat state.
 *
 * Pattern mirrors the existing authStore.ts in this project.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  VenueEditorTool,
  VenueSection,
  VenueSeat,
  VenueFacility,
  FacilityIconType,
  VenueShape,
  CanvasDrawingMode,
  VenueBlueprint,
  PricingTier,
} from "@/types/ticket";
import {
  mockVenueSections,
  mockPricingTiers,
  mockVenueEditorState,
} from "@/mock/venueEditorData";

export interface ValidationError {
  field: string;
  message: string;
}

interface VenueEditorStore {
  // ── Editor state ──────────────────────────────────────────────────────
  active_tool: VenueEditorTool;
  drawing_mode: CanvasDrawingMode;
  sections: VenueSection[];
  facilities: VenueFacility[];
  pricing_tiers: PricingTier[];
  selected_paint_tier_id: string | null;
  selected_seat: VenueSeat | null;
  multi_selected_seat_ids: string[];
  selected_shape_id: string | null;
  zoom_level: number;
  stage_shape: VenueShape;
  snap_to_grid: boolean;
  last_saved_at: number | null;

  // ── History state ─────────────────────────────────────────────────────
  past: Pick<VenueEditorStore, "sections" | "facilities" | "stage_shape" | "pricing_tiers">[];
  future: Pick<VenueEditorStore, "sections" | "facilities" | "stage_shape" | "pricing_tiers">[];

  // ── Event & venue metadata ────────────────────────────────────────────
  event_title: string;
  venue_name: string;
  venues: { venue_id: string; name: string }[];
  selected_venue_id: string;
  base_currency: string;
  tax_rate: number;
  blueprint?: VenueBlueprint;

  // ── Actions ───────────────────────────────────────────────────────────
  set_active_tool: (tool: VenueEditorTool) => void;
  set_drawing_mode: (mode: CanvasDrawingMode) => void;
  select_seat: (seat: VenueSeat | null) => void;
  set_multi_selected_seats: (ids: string[]) => void;
  set_selected_shape_id: (id: string | null) => void;
  update_seat: (seat_id: string, updates: Partial<VenueSeat>) => void;
  add_seat: (section_id: string, x: number, y: number) => void;
  add_new_section: (x: number, y: number) => void;
  add_facility: (type: FacilityIconType, x: number, y: number) => void;
  update_facility: (id: string, x: number, y: number) => void;
  remove_facility: (id: string) => void;
  delete_seat: (seat_id: string) => void;
  delete_multiple_seats: (ids: string[]) => void;
  remove_section: (section_id: string) => void;
  duplicate_row: (row: string, section_id: string) => void;
  update_section: (section_id: string, updates: Partial<VenueSection>) => void;
  generate_seats_for_section: (section_id: string, rows: number, cols: number, curve_amount?: number, save_to_history?: boolean) => void;
  update_section_shape: (section_id: string, updates: Partial<VenueShape>) => void;
  update_stage_shape: (updates: Partial<VenueShape>) => void;
  set_zoom: (level: number) => void;
  
  // ── Paint Bucket Actions ────────────────────────────────────────────────
  set_selected_paint_tier_id: (tier_id: string | null) => void;
  paint_seats: (seat_ids: string[], tier_id: string | undefined) => void;
  add_pricing_tier: (tier: PricingTier) => void;
  update_pricing_tier: (tier_id: string, updates: Partial<PricingTier>) => void;
  remove_pricing_tier: (tier_id: string) => void;
  set_venue: (venue_id: string) => void;
  set_currency: (currency: string) => void;
  set_tax_rate: (rate: number) => void;
  set_blueprint: (blueprint: VenueBlueprint | undefined) => void;
  update_blueprint: (updates: Partial<VenueBlueprint>) => void;

  // ── Grid, Export, Import & Validation ──────────────────────────────────
  toggle_snap_to_grid: () => void;
  snap_position: (value: number) => number;
  export_layout_json: () => void;
  import_layout_json: (json_string: string) => void;
  reset_layout: () => void;
  validate_for_publish: () => ValidationError[];

  // ── Keyboard Actions ────────────────────────────────────────────────────
  move_selected_elements: (dx: number, dy: number) => void;

  // ── History & Lock Actions ────────────────────────────────────────────
  undo: () => void;
  redo: () => void;
  save_history: () => void;
  toggle_lock: (id: string, type: "seat" | "section" | "stage") => void;
}

export const useVenueEditorStore = create<VenueEditorStore>()(
  persist(
    (set, get) => ({
  // ── Initial state (from mock data) ────────────────────────────────────
  active_tool: "seat_mapper",
  drawing_mode: "pan",
  sections: mockVenueSections,
  facilities: [],
  pricing_tiers: mockPricingTiers,
  selected_paint_tier_id: null,
  selected_seat: null,
  multi_selected_seat_ids: [],
  selected_shape_id: null,
  zoom_level: 100,
  stage_shape: mockVenueEditorState.stage_shape,
  snap_to_grid: false,
  last_saved_at: null,
  past: [],
  future: [],

  event_title: mockVenueEditorState.event_title,
  venue_name: mockVenueEditorState.venue_name,
  venues: mockVenueEditorState.venues,
  selected_venue_id: mockVenueEditorState.selected_venue_id,
  base_currency: mockVenueEditorState.base_currency,
  tax_rate: mockVenueEditorState.tax_rate,
  blueprint: undefined,

  // ── Actions ───────────────────────────────────────────────────────────
  set_active_tool: (tool) => set({ active_tool: tool }),
  set_drawing_mode: (mode) => set({ drawing_mode: mode }),

  set_blueprint: (blueprint) => set({ blueprint }),
  update_blueprint: (updates) => set((state) => ({ 
    blueprint: state.blueprint ? { ...state.blueprint, ...updates } : undefined 
  })),

  set_multi_selected_seats: (ids) => set({ multi_selected_seat_ids: ids }),

  select_seat: (seat) => set({ selected_seat: seat, multi_selected_seat_ids: seat ? [seat.seat_id] : [], selected_shape_id: null }),

  set_selected_shape_id: (id) => set({ selected_shape_id: id, selected_seat: null, multi_selected_seat_ids: [] }),

  update_seat: (seat_id, updates) => {
    get().save_history();
    set((state) => ({
      sections: state.sections.map((section) => ({
        ...section,
        seats: section.seats.map((seat) =>
          seat.seat_id === seat_id ? { ...seat, ...updates } : seat
        ),
      })),
      selected_seat:
        state.selected_seat?.seat_id === seat_id
          ? { ...state.selected_seat, ...updates }
          : state.selected_seat,
    }));
  },

  add_seat: (section_id, x, y) => {
    get().save_history();
    set((state) => {
      // Find the target section. If not provided, fallback to the first section (e.g. VIP Pit)
      const actual_section_id = section_id || state.sections[0]?.section_id;
      if (!actual_section_id) return state;

      const new_seat: VenueSeat = {
        seat_id: `seat-${Date.now()}`,
        section_id: actual_section_id,
        row: "NEW",
        number: 1,
        x,
        y,
        status: "available",
      };

      return {
        sections: state.sections.map((s) =>
          s.section_id === actual_section_id
            ? { ...s, seats: [...s.seats, new_seat] }
            : s
        ),
      };
    });
  },

  add_new_section: (x, y) => {
    get().save_history();
    set((state) => {
      const new_section_id = `sec_custom_${Date.now()}`;
      const default_color = "#94a3b8"; // Neutral gray (Slate 400)
      const new_section: VenueSection = {
        section_id: new_section_id,
        label: "New Section",
        color: default_color,
        section_code: "NEW",
        seats: [],
        shape: { x, y, width: 200, height: 100, type: "rectangle" },
      };

      return {
        sections: [...state.sections, new_section],
      };
    });
  },

  add_facility: (type, x, y) => {
    get().save_history();
    set((state) => {
      const new_facility: VenueFacility = {
        id: `fac_${Date.now()}`,
        type,
        x,
        y,
      };
      return { facilities: [...state.facilities, new_facility] };
    });
  },

  update_facility: (id, x, y) => {
    // Only save history if movement is significant/final, but we will save it on pointerup in canvas instead
    set((state) => ({
      facilities: state.facilities.map((f) =>
        f.id === id ? { ...f, x, y } : f
      ),
    }));
  },

  remove_facility: (id) => {
    get().save_history();
    set((state) => ({
      facilities: state.facilities.filter((f) => f.id !== id),
    }));
  },

  delete_seat: (seat_id) => {
    get().save_history();
    set((state) => ({
      sections: state.sections.map((s) => ({
        ...s,
        seats: s.seats.filter((seat) => seat.seat_id !== seat_id),
      })),
      selected_seat: state.selected_seat?.seat_id === seat_id ? null : state.selected_seat,
      multi_selected_seat_ids: state.multi_selected_seat_ids.filter((id) => id !== seat_id),
    }));
  },

  delete_multiple_seats: (ids) => {
    get().save_history();
    set((state) => ({
      sections: state.sections.map((s) => ({
        ...s,
        seats: s.seats.filter((seat) => !ids.includes(seat.seat_id)),
      })),
      selected_seat: state.selected_seat && ids.includes(state.selected_seat.seat_id) ? null : state.selected_seat,
      multi_selected_seat_ids: state.multi_selected_seat_ids.filter((id) => !ids.includes(id)),
    }));
  },

  duplicate_row: (row, section_id) => {
    get().save_history();
    set((state) => {
      const section = state.sections.find((s) => s.section_id === section_id);
      if (!section) return state;
      const seats_in_row = section.seats.filter((s) => s.row === row);
      if (seats_in_row.length === 0) return state;

      const new_row_name = `${row}-copy`;
      const duplicated_seats = seats_in_row.map((s) => ({
        ...s,
        seat_id: `${section_id}-${new_row_name}-${s.number}-${Date.now()}`,
        row: new_row_name,
        y: s.y + 30,
      }));

      return {
        sections: state.sections.map((s) =>
          s.section_id === section_id
            ? { ...s, seats: [...s.seats, ...duplicated_seats] }
            : s
        ),
      };
    });
  },

  update_section: (section_id, updates) => {
    get().save_history();
    set((state) => ({
      sections: state.sections.map((s) =>
        s.section_id === section_id ? { ...s, ...updates } : s
      ),
    }));
  },

  generate_seats_for_section: (section_id, rows, cols, curve_amount = 0, save_to_history = true) => {
    if (save_to_history) get().save_history();
    set((state) => ({
      sections: state.sections.map((section) => {
        if (section.section_id !== section_id || !section.shape) return section;

        const new_seats: VenueSeat[] = [];
        const { width, height } = section.shape;
        
        // Add padding
        const padding_x = 24;
        const padding_y = 24 + Math.abs(curve_amount); // Ensure curve doesn't push seats outside box
        const available_width = Math.max(0, width - padding_x * 2);
        const available_height = Math.max(0, height - padding_y * 2);

        const spacing_x = cols > 1 ? available_width / (cols - 1) : 0;
        const spacing_y = rows > 1 ? available_height / (rows - 1) : 0;

        const start_x = cols > 1 ? padding_x : width / 2;
        const start_y = rows > 1 ? padding_y : height / 2;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            // Quadratic Bezier Offset for curving seats
            const normalized_c = cols > 1 ? (c - (cols - 1) / 2) / ((cols - 1) / 2) : 0;
            const y_offset = curve_amount * (normalized_c * normalized_c);

            const cx = section.shape.x + start_x + c * spacing_x;
            const cy = section.shape.y + start_y + r * spacing_y + y_offset;
            new_seats.push({
              seat_id: `${section_id}-gen-${Date.now()}-${r}-${c}`,
              section_id: section_id,
              row: String.fromCharCode(65 + r), // A, B, C...
              number: c + 1,
              status: "available",
              x: cx,
              y: cy,
            });
          }
        }

        return { ...section, seats: new_seats };
      }),
    }));
  },

  update_section_shape: (section_id, updates) => {
    get().save_history();
    set((state) => {
      const section = state.sections.find((s) => s.section_id === section_id);
      if (!section) return state;

      return {
        sections: state.sections.map((s) => {
          if (s.section_id !== section_id || !s.shape) return s;
          return {
            ...s,
            shape: { ...s.shape, ...updates } as typeof s.shape,
          };
        }),
      };
    });
  },

  remove_section: (section_id) => {
    get().save_history();
    set((state) => ({
      sections: state.sections.filter((s) => s.section_id !== section_id),
    }));
  },

  update_stage_shape: (updates) => {
    get().save_history();
    set((state) => ({
      stage_shape: { ...state.stage_shape, ...updates },
    }));
  },

  move_selected_elements: (dx, dy) => {
    const state = get();
    // Only move if there is something selected and it's not locked.
    // Let's do this efficiently.
    const { multi_selected_seat_ids, selected_seat, selected_shape_id, stage_shape, sections } = state;
    
    if (multi_selected_seat_ids.length > 0) {
      // Check if any selected seat is locked
      let has_locked = false;
      sections.forEach(s => {
        s.seats.forEach(seat => {
          if (multi_selected_seat_ids.includes(seat.seat_id) && seat.is_locked) has_locked = true;
        });
      });
      if (has_locked) return;

      get().save_history();
      set({
        sections: sections.map(s => ({
          ...s,
          seats: s.seats.map(seat => 
            multi_selected_seat_ids.includes(seat.seat_id)
              ? { ...seat, x: seat.x + dx, y: seat.y + dy }
              : seat
          )
        }))
      });
    } else if (selected_seat) {
      // Check if locked
      let is_locked = false;
      sections.forEach(s => {
        if (s.section_id === selected_seat.section_id) {
          const seat = s.seats.find(st => st.seat_id === selected_seat.seat_id);
          if (seat?.is_locked) is_locked = true;
        }
      });
      if (is_locked) return;

      get().save_history();
      set({
        sections: sections.map(s => ({
          ...s,
          seats: s.seats.map(seat => 
            seat.seat_id === selected_seat.seat_id
              ? { ...seat, x: seat.x + dx, y: seat.y + dy }
              : seat
          )
        })),
        selected_seat: { ...selected_seat, x: selected_seat.x + dx, y: selected_seat.y + dy }
      });
    } else if (selected_shape_id === "stage") {
      if (stage_shape.is_locked) return;
      get().save_history();
      set({
        stage_shape: { ...stage_shape, x: stage_shape.x + dx, y: stage_shape.y + dy }
      });
    } else if (selected_shape_id) {
      const section = sections.find(s => s.section_id === selected_shape_id);
      if (section?.is_locked || !section?.shape) return;
      
      get().save_history();
      set({
        sections: sections.map(s => 
          s.section_id === selected_shape_id
            ? { ...s, shape: { ...s.shape, x: s.shape!.x + dx, y: s.shape!.y + dy } as VenueShape }
            : s
        )
      });
    }
  },

  set_zoom: (level) => set({ zoom_level: Math.max(25, Math.min(200, level)) }),

  set_selected_paint_tier_id: (tier_id) => set({ selected_paint_tier_id: tier_id }),
  
  paint_seats: (seat_ids, tier_id) => {
    get().save_history();
    set((state) => ({
      sections: state.sections.map((section) => ({
        ...section,
        seats: section.seats.map((seat) =>
          seat_ids.includes(seat.seat_id)
            ? { ...seat, tier_id: tier_id }
            : seat
        ),
      })),
    }));
  },

  add_pricing_tier: (tier) =>
    set((state) => ({
      pricing_tiers: [...state.pricing_tiers, { ...tier, quota: tier.quota ?? 0 }],
    })),

  update_pricing_tier: (tier_id, updates) =>
    set((state) => ({
      pricing_tiers: state.pricing_tiers.map((tier) =>
        tier.tier_id === tier_id ? { ...tier, ...updates } : tier
      ),
    })),

  remove_pricing_tier: (tier_id) =>
    set((state) => ({
      pricing_tiers: state.pricing_tiers.filter(
        (tier) => tier.tier_id !== tier_id
      ),
    })),

  set_venue: (venue_id) =>
    set((state) => {
      const venue = state.venues.find((v) => v.venue_id === venue_id);
      return {
        selected_venue_id: venue_id,
        venue_name: venue?.name ?? state.venue_name,
      };
    }),

  set_currency: (currency) => set({ base_currency: currency }),

  set_tax_rate: (rate) => set({ tax_rate: rate }),

  // ── Grid, Export & Validation ──────────────────────────────────────────
  toggle_snap_to_grid: () => set((state) => ({ snap_to_grid: !state.snap_to_grid })),

  snap_position: (value) => {
    const { snap_to_grid } = get();
    if (!snap_to_grid) return value;
    const grid_size = 20;
    return Math.round(value / grid_size) * grid_size;
  },

  export_layout_json: () => {
    const { sections, facilities, pricing_tiers, stage_shape, event_title, venue_name, base_currency, tax_rate } = get();
    const data = {
      exported_at: new Date().toISOString(),
      event_title,
      venue_name,
      base_currency,
      tax_rate,
      stage_shape,
      sections,
      facilities,
      pricing_tiers,
    };
    const json_string = JSON.stringify(data, null, 2);
    const data_uri = "data:application/json;charset=utf-8," + encodeURIComponent(json_string);
    
    const a = document.createElement("a");
    a.href = data_uri;
    
    let safe_name = "layout";
    if (typeof venue_name === "string") {
      safe_name = venue_name.toLowerCase().replace(/\s+/g, "-");
    }
    a.download = `venue-${safe_name}-${Date.now()}.json`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  import_layout_json: (json_string: string) => {
    try {
      const data = JSON.parse(json_string);
      if (!data.sections || !data.stage_shape) {
        throw new Error("Invalid layout file format");
      }
      set({
        sections: data.sections,
        facilities: data.facilities || [],
        stage_shape: data.stage_shape,
        pricing_tiers: data.pricing_tiers || [],
        event_title: data.event_title || "Imported Event",
        venue_name: data.venue_name || "Imported Venue",
        base_currency: data.base_currency || "IDR",
        tax_rate: data.tax_rate || 0,
        past: [],
        future: [],
      });
      get().save_history();
    } catch (e) {
      console.error("Failed to import layout:", e);
      throw e;
    }
  },

  reset_layout: () => {
    set({
      sections: [],
      facilities: [],
      pricing_tiers: [],
      past: [],
      future: [],
    });
  },

  validate_for_publish: () => {
    const { sections, pricing_tiers } = get();
    const errors: ValidationError[] = [];

    // Check if there are any pricing tiers
    if (pricing_tiers.length === 0) {
      errors.push({ field: "pricing_tiers", message: "At least one pricing tier is required" });
    }

    // Check if any tier has price <= 0
    pricing_tiers.forEach((tier) => {
      if (tier.price <= 0) {
        errors.push({ field: `tier_${tier.tier_id}`, message: `"${tier.name}" has invalid price (must be > 0)` });
      }
      if (tier.quota <= 0) {
        errors.push({ field: `tier_${tier.tier_id}_quota`, message: `"${tier.name}" has no quota set (must be > 0)` });
      }
    });

    // Check if there are any sections with seats
    const all_seats = sections.flatMap((s) => s.seats);
    if (all_seats.length === 0) {
      errors.push({ field: "sections", message: "No seats have been created yet" });
    }

    // Check unassigned seats
    const unassigned = all_seats.filter((s) => !s.tier_id);
    if (unassigned.length > 0) {
      errors.push({ field: "unassigned_seats", message: `${unassigned.length} seat(s) have no pricing tier assigned` });
    }

    // Check sections without shapes
    const shapeless = sections.filter((s) => !s.shape);
    if (shapeless.length > 0) {
      errors.push({ field: "shapeless_sections", message: `${shapeless.length} section(s) have no shape defined` });
    }

    return errors;
  },

  save_history: () => {
    const { sections, facilities, stage_shape, pricing_tiers, past } = get();
    // Save current state to past, clear future
    set({
      past: [...past.slice(-49), { 
        sections: JSON.parse(JSON.stringify(sections)), 
        facilities: JSON.parse(JSON.stringify(facilities)), 
        stage_shape: JSON.parse(JSON.stringify(stage_shape)), 
        pricing_tiers: JSON.parse(JSON.stringify(pricing_tiers)) 
      }],
      future: [],
      last_saved_at: Date.now(),
    });
  },

  undo: () => {
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const new_past = state.past.slice(0, -1);
      return {
        past: new_past,
        sections: previous.sections,
        facilities: previous.facilities,
        stage_shape: previous.stage_shape,
        pricing_tiers: previous.pricing_tiers,
        future: [
          {
            sections: state.sections,
            facilities: state.facilities,
            stage_shape: state.stage_shape,
            pricing_tiers: state.pricing_tiers,
          },
          ...state.future,
        ],
        selected_seat: null,
        multi_selected_seat_ids: [],
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const new_future = state.future.slice(1);
      return {
        past: [
          ...state.past,
          {
            sections: state.sections,
            facilities: state.facilities,
            stage_shape: state.stage_shape,
            pricing_tiers: state.pricing_tiers,
          },
        ],
        future: new_future,
        sections: next.sections,
        facilities: next.facilities,
        stage_shape: next.stage_shape,
        pricing_tiers: next.pricing_tiers,
        selected_seat: null,
        multi_selected_seat_ids: [],
      };
    });
  },

  toggle_lock: (id, type) => {
    get().save_history();
    set((state) => {
      if (type === "stage") {
        return {
          stage_shape: { ...state.stage_shape, is_locked: !state.stage_shape.is_locked },
        };
      }
      if (type === "section") {
        return {
          sections: state.sections.map((s) =>
            s.section_id === id ? { ...s, is_locked: !s.is_locked } : s
          ),
        };
      }
      if (type === "seat") {
        return {
          sections: state.sections.map((s) => ({
            ...s,
            seats: s.seats.map((seat) =>
              seat.seat_id === id ? { ...seat, is_locked: !seat.is_locked } : seat
            ),
          })),
        };
      }
      return state;
    });
  },
}),
{
  name: "venue-editor-storage-v4",
  // Optionally, you can whitelist which parts of the state to save so we don't save ephemeral UI state like 'selected_seat'
  partialize: (state) => ({
    sections: state.sections,
    facilities: state.facilities,
    pricing_tiers: state.pricing_tiers,
    stage_shape: state.stage_shape,
    event_title: state.event_title,
    venue_name: state.venue_name,
    base_currency: state.base_currency,
    tax_rate: state.tax_rate,
  }),
}
));
