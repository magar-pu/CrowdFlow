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
  SeatArrangeForm,
} from "@/types/ticket";
import {
  mockVenueSeats,
  mockVenueSections,
  mockPricingTiers,
  mockVenueEditorState,
} from "@/mock/venueEditorData";
import {
  buildSaveLayoutRequest,
  reconcileSavedIds,
  layoutDetailToEditorState,
} from "@/lib/venueLayout/mapping";
import type { SaveLayoutRequest, LayoutDetail } from "@/lib/api/venueLayouts";

/** Settings driving how a multi-seat selection is laid out. */
export interface ArrangeSettings {
  form: SeatArrangeForm;
  rows: number;
  cols: number;
  amount_x: number;
  amount_y: number;
  gap_x: number;
  gap_y: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

/** Options for the auto-numbering pass. */
export interface RenumberOptions {
  /** Treat spatially separated clusters as distinct blocks. Default true. */
  detect_blocks?: boolean;
  /** How far apart two seats can sit vertically and still count as one row. */
  row_tolerance?: number;
  number_direction?: "ltr" | "rtl";
  row_direction?: "top-down" | "bottom-up";
  row_style?: "alpha" | "numeric";
}

function row_label(index: number, style: "alpha" | "numeric"): string {
  if (style === "numeric") return String(index + 1);
  let s = "";
  let n = index;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** Bucket seats into a spatial hash so neighbour lookups stay near-linear. */
function spatial_buckets(seats: VenueSeat[], cell: number) {
  const buckets = new Map<string, number[]>();
  seats.forEach((s, i) => {
    const k = `${Math.floor(s.x / cell)},${Math.floor(s.y / cell)}`;
    const arr = buckets.get(k);
    if (arr) arr.push(i);
    else buckets.set(k, [i]);
  });
  return buckets;
}

/** Median distance to the closest other seat — the natural unit for tolerances. */
function median_neighbour_distance(seats: VenueSeat[]): number {
  if (seats.length < 2) return 30;
  const xs = seats.map((s) => s.x);
  const ys = seats.map((s) => s.y);
  const w = Math.max(1, Math.max(...xs) - Math.min(...xs));
  const h = Math.max(1, Math.max(...ys) - Math.min(...ys));
  const cell = Math.max(10, Math.sqrt((w * h) / seats.length) * 1.5);
  const buckets = spatial_buckets(seats, cell);

  const dists: number[] = [];
  seats.forEach((s, i) => {
    const cx = Math.floor(s.x / cell);
    const cy = Math.floor(s.y / cell);
    let best = Infinity;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const arr = buckets.get(`${cx + dx},${cy + dy}`);
        if (!arr) continue;
        for (const j of arr) {
          if (j === i) continue;
          const d = Math.hypot(seats[j].x - s.x, seats[j].y - s.y);
          if (d < best) best = d;
        }
      }
    }
    if (Number.isFinite(best)) dists.push(best);
  });
  if (dists.length === 0) return 30;
  dists.sort((a, b) => a - b);
  return dists[Math.floor(dists.length / 2)] || 30;
}

/** Union-find over near neighbours: seats separated by an aisle fall apart. */
function cluster_blocks(seats: VenueSeat[], threshold: number): VenueSeat[][] {
  const parent = seats.map((_, i) => i);
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  const cell = Math.max(10, threshold);
  const buckets = spatial_buckets(seats, cell);
  const t2 = threshold * threshold;

  seats.forEach((s, i) => {
    const cx = Math.floor(s.x / cell);
    const cy = Math.floor(s.y / cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const arr = buckets.get(`${cx + dx},${cy + dy}`);
        if (!arr) continue;
        for (const j of arr) {
          if (j <= i) continue;
          const ddx = seats[j].x - s.x;
          const ddy = seats[j].y - s.y;
          if (ddx * ddx + ddy * ddy <= t2) union(i, j);
        }
      }
    }
  });

  const groups = new Map<number, VenueSeat[]>();
  seats.forEach((s, i) => {
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(s);
    else groups.set(r, [s]);
  });
  return [...groups.values()];
}

/**
 * Derive row/number labels purely from where seats ended up on the canvas.
 *
 * Row lettering runs *continuously* across blocks (block 1 = A..E, block 2
 * continues F..J) so no two seats in the venue can share a label — which is
 * what produced duplicate "A-3"s when each seat array restarted at A.
 */
function compute_seat_labels(
  seats: VenueSeat[],
  opts: RenumberOptions
): Map<string, { row: string; number: number }> {
  const result = new Map<string, { row: string; number: number }>();
  if (seats.length === 0) return result;

  const nn = median_neighbour_distance(seats);
  const blocks =
    opts.detect_blocks === false ? [seats] : cluster_blocks(seats, nn * 1.8);

  // Read blocks top-to-bottom, then left-to-right.
  blocks.sort((a, b) => {
    const ay = Math.min(...a.map((s) => s.y));
    const by = Math.min(...b.map((s) => s.y));
    if (Math.abs(ay - by) > nn) return ay - by;
    return Math.min(...a.map((s) => s.x)) - Math.min(...b.map((s) => s.x));
  });

  const row_tol = opts.row_tolerance ?? nn * 0.75;
  const style = opts.row_style ?? "alpha";
  let row_counter = 0;

  for (const block of blocks) {
    // Group into rows by vertical proximity — tolerant of arced/staggered rows.
    const sorted = [...block].sort((a, b) => a.y - b.y);
    const rows: VenueSeat[][] = [];
    let current: VenueSeat[] = [];
    let anchor = sorted[0].y;

    for (const s of sorted) {
      if (current.length > 0 && Math.abs(s.y - anchor) > row_tol) {
        rows.push(current);
        current = [];
        anchor = s.y;
      }
      current.push(s);
    }
    if (current.length > 0) rows.push(current);

    if (opts.row_direction === "bottom-up") rows.reverse();

    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);
      if (opts.number_direction === "rtl") row.reverse();
      const label = row_label(row_counter, style);
      row.forEach((s, i) => result.set(s.seat_id, { row: label, number: i + 1 }));
      row_counter++;
    }
  }

  return result;
}

interface VenueEditorStore {
  // ── Editor state ──────────────────────────────────────────────────────
  active_tool: VenueEditorTool;
  drawing_mode: CanvasDrawingMode;
  /** Flat list of every seat in the venue. Seats are physical and exist
   *  independently of sections, which are event-level grouping tags. */
  seats: VenueSeat[];
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
  /** Snap step per axis. Seat pitch and row pitch differ, so a square grid
   *  isn't always what you want. */
  grid_size_x: number;
  grid_size_y: number;
  /** When true, editing one axis mirrors the other (square grid). */
  grid_link_axes: boolean;
  /** Draw the dot grid. Independent of whether snapping is active. */
  show_grid: boolean;
  /** 0 = always snap. >0 = only snap within this many px of a gridline. */
  snap_threshold: number;
  last_saved_at: number | null;

  // ── History state ─────────────────────────────────────────────────────
  past: Pick<VenueEditorStore, "seats" | "sections" | "facilities" | "stage_shape" | "pricing_tiers">[];
  future: Pick<VenueEditorStore, "seats" | "sections" | "facilities" | "stage_shape" | "pricing_tiers">[];

  // ── Event & venue metadata ────────────────────────────────────────────
  event_title: string;
  venue_name: string;
  venues: { venue_id: string; name: string }[];
  selected_venue_id: string;
  base_currency: string;
  tax_rate: number;
  blueprint?: VenueBlueprint;

  // ── Persisted-layout identity (backend venuelayout) ───────────────────
  /** DB id of the saved layout this editor is bound to; null until first save. */
  layout_id: number | null;
  /** updated_at the layout was last loaded/saved at — the optimistic-lock token. */
  layout_updated_at: string | null;
  /** Who can read this layout. Defaults to owner-only ("event_exclusive"); a
   *  layout only becomes world-readable if the owner explicitly makes it public. */
  layout_visibility: "public" | "event_exclusive";
  /** Human name of the layout itself (distinct from the venue's physical name).
   *  Chosen at create time in the selector; sent as the layout `name` on save. */
  layout_name: string;

  // ── Actions ───────────────────────────────────────────────────────────
  set_active_tool: (tool: VenueEditorTool) => void;
  set_drawing_mode: (mode: CanvasDrawingMode) => void;
  select_seat: (seat: VenueSeat | null) => void;
  set_multi_selected_seats: (ids: string[]) => void;
  set_selected_shape_id: (id: string | null) => void;
  update_seat: (seat_id: string, updates: Partial<VenueSeat>) => void;
  add_seat: (section_id: string | null | undefined, x: number, y: number) => void;
  fill_seats_in_rect: (x0: number, y0: number, x1: number, y1: number) => void;
  add_new_section: (x: number, y: number) => void;
  add_facility: (type: FacilityIconType, x: number, y: number) => void;
  update_facility: (id: string, x: number, y: number) => void;
  remove_facility: (id: string) => void;
  delete_seat: (seat_id: string) => void;
  delete_multiple_seats: (ids: string[]) => void;
  /** Layout settings for the current multi-seat selection. */
  arrange: ArrangeSettings;
  /** Frozen frame the selection is laid out inside; null when <2 seats. */
  arrange_bounds: { x: number; y: number; width: number; height: number } | null;
  set_arrange: (patch: Partial<ArrangeSettings>) => void;
  /** Snapshot the frame + seed settings from the seats now selected. */
  capture_arrange_frame: (seat_ids: string[]) => void;
  translate_arrange_frame: (dx: number, dy: number) => void;
  /** Re-flow the current selection using `arrange` (+ any overrides). */
  apply_arrange: (overrides?: Partial<ArrangeSettings>, save_to_history?: boolean) => void;
  /**
   * Re-derive every seat's row/number from its final position on the canvas.
   * Seat ids are left untouched — only the human-facing labels change.
   */
  renumber_seats: (opts?: RenumberOptions) => void;
  /** Grow or shrink a selection to `count` seats. Returns the resulting ids. */
  resize_seat_selection: (seat_ids: string[], count: number) => string[];
  arrange_seats: (
    seat_ids: string[],
    opts: {
      form: SeatArrangeForm;
      rows: number;
      cols: number;
      /** Horizontal arc/skew: curves rows vertically, or shears rows sideways. */
      amount_x: number;
      /** Vertical arc/skew: curves columns horizontally, or shears them down. */
      amount_y: number;
      /** Explicit spacing. 0/undefined falls back to fitting the bounds. */
      gap_x?: number;
      gap_y?: number;
      bounds: { x: number; y: number; width: number; height: number };
    },
    save_to_history?: boolean
  ) => void;
  remove_section: (section_id: string) => void;
  duplicate_row: (row: string, section_id: string | null | undefined) => void;
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
  /** Replace the selectable venues (e.g. with the real ones fetched from the API). */
  set_venues: (venues: { venue_id: string; name: string }[]) => void;
  set_currency: (currency: string) => void;
  set_tax_rate: (rate: number) => void;
  set_blueprint: (blueprint: VenueBlueprint | undefined) => void;
  update_blueprint: (updates: Partial<VenueBlueprint>) => void;

  // ── Grid, Export, Import & Validation ──────────────────────────────────
  toggle_snap_to_grid: () => void;
  set_grid_size: (axis: "x" | "y", value: number) => void;
  toggle_grid_link_axes: () => void;
  toggle_show_grid: () => void;
  set_snap_threshold: (value: number) => void;
  snap_position: (value: number, axis?: "x" | "y") => number;
  export_layout_json: () => void;
  import_layout_json: (json_string: string) => void;
  reset_layout: () => void;
  validate_for_publish: () => ValidationError[];

  // ── Backend persistence (venuelayout) ─────────────────────────────────
  /** Serialise the current editor state into a SaveLayoutRequest DTO. */
  build_save_request: () => SaveLayoutRequest;
  /** Stamp real DB ids onto newly-inserted seats after a save. */
  apply_saved_ids: (seat_id_map: Record<string, number>) => void;
  /** Record the layout id + optimistic-lock token (after create or save). */
  set_layout_meta: (layout_id: number, updated_at: string) => void;
  /** Set who can read the layout (owner-only vs public). */
  set_layout_visibility: (visibility: "public" | "event_exclusive") => void;
  /** Set the layout's display name. */
  set_layout_name: (name: string) => void;
  /** Replace editor state with a layout loaded from the server. */
  load_layout_detail: (detail: LayoutDetail) => void;

  // ── Keyboard Actions ────────────────────────────────────────────────────
  move_selected_elements: (dx: number, dy: number, save_to_history?: boolean) => void;

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
  seats: mockVenueSeats,
  sections: mockVenueSections,
  facilities: [],
  pricing_tiers: mockPricingTiers,
  selected_paint_tier_id: null,
  selected_seat: null,
  multi_selected_seat_ids: [],
  selected_shape_id: null,
  zoom_level: 100,
  stage_shape: mockVenueEditorState.stage_shape,
  arrange: { form: "grid", rows: 1, cols: 1, amount_x: 0, amount_y: 0, gap_x: 0, gap_y: 0 },
  arrange_bounds: null,
  snap_to_grid: false,
  grid_size_x: 20,
  grid_size_y: 20,
  grid_link_axes: true,
  show_grid: true,
  snap_threshold: 0,
  last_saved_at: null,
  layout_id: null,
  layout_updated_at: null,
  layout_visibility: "event_exclusive",
  layout_name: "",
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
      seats: state.seats.map((seat) =>
        seat.seat_id === seat_id ? { ...seat, ...updates } : seat
      ),
      selected_seat:
        state.selected_seat?.seat_id === seat_id
          ? { ...state.selected_seat, ...updates }
          : state.selected_seat,
    }));
  },

  add_seat: (section_id, x, y) => {
    get().save_history();
    set((state) => {
      // Seats no longer require a section — an untagged seat is valid.
      const new_seat: VenueSeat = {
        seat_id: `seat-${Date.now()}`,
        section_id: section_id || null,
        row: "NEW",
        number: 1,
        x,
        y,
        status: "available",
      };

      return { seats: [...state.seats, new_seat] };
    });
  },

  fill_seats_in_rect: (x0, y0, x1, y1) => {
    const SEAT_PITCH = 28; // horizontal spacing between seats
    const ROW_PITCH = 34; // vertical spacing between rows
    const MAX_SEATS = 2000; // guard against a runaway drag freezing the canvas

    get().save_history();
    set((state) => {
      const min_x = Math.min(x0, x1);
      const max_x = Math.max(x0, x1);
      const min_y = Math.min(y0, y1);
      const max_y = Math.max(y0, y1);

      const cols = Math.max(1, Math.floor((max_x - min_x) / SEAT_PITCH) + 1);
      const rows = Math.max(1, Math.floor((max_y - min_y) / ROW_PITCH) + 1);

      // Seats are placed straight into the flat list — no section required.
      // Tagging them into a section is a separate, event-level step.
      const snap = get().snap_position;
      const stamp = Date.now();
      const new_seats: VenueSeat[] = [];

      for (let r = 0; r < rows && new_seats.length < MAX_SEATS; r++) {
        for (let c = 0; c < cols && new_seats.length < MAX_SEATS; c++) {
          new_seats.push({
            seat_id: `seat-${stamp}-${r}-${c}`,
            section_id: null,
            row: String.fromCharCode(65 + (r % 26)),
            number: c + 1,
            x: snap(min_x + c * SEAT_PITCH, "x"),
            y: snap(min_y + r * ROW_PITCH, "y"),
            status: "available",
          });
        }
      }

      return { seats: [...state.seats, ...new_seats] };
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
      seats: state.seats.filter((seat) => seat.seat_id !== seat_id),
      selected_seat: state.selected_seat?.seat_id === seat_id ? null : state.selected_seat,
      multi_selected_seat_ids: state.multi_selected_seat_ids.filter((id) => id !== seat_id),
    }));
  },

  delete_multiple_seats: (ids) => {
    get().save_history();
    set((state) => ({
      seats: state.seats.filter((seat) => !ids.includes(seat.seat_id)),
      selected_seat: state.selected_seat && ids.includes(state.selected_seat.seat_id) ? null : state.selected_seat,
      multi_selected_seat_ids: state.multi_selected_seat_ids.filter((id) => !ids.includes(id)),
    }));
  },

  renumber_seats: (opts = {}) => {
    const { seats } = get();
    if (seats.length === 0) return;
    get().save_history();
    const labels = compute_seat_labels(seats, opts);
    set((state) => ({
      seats: state.seats.map((s) => {
        const next = labels.get(s.seat_id);
        return next ? { ...s, row: next.row, number: next.number } : s;
      }),
    }));
  },

  set_arrange: (patch) =>
    set((state) => ({ arrange: { ...state.arrange, ...patch } })),

  capture_arrange_frame: (seat_ids) => {
    const picked = get().seats.filter((s) => seat_ids.includes(s.seat_id));
    if (picked.length < 2) {
      set({ arrange_bounds: null });
      return;
    }
    const xs = picked.map((s) => s.x);
    const ys = picked.map((s) => s.y);
    const min_x = Math.min(...xs);
    const min_y = Math.min(...ys);
    const width = Math.max(...xs) - min_x;
    const height = Math.max(...ys) - min_y;

    // Start from a square-ish grid, with gaps seeded from the spacing the
    // selection already has so the fields match what's on screen.
    const cols = Math.max(1, Math.ceil(Math.sqrt(picked.length)));
    const rows = Math.max(1, Math.ceil(picked.length / cols));

    set({
      arrange_bounds: { x: min_x, y: min_y, width, height },
      arrange: {
        form: "grid",
        rows,
        cols,
        amount_x: 0,
        amount_y: 0,
        gap_x: cols > 1 ? Math.round(width / (cols - 1)) : 0,
        gap_y: rows > 1 ? Math.round(height / (rows - 1)) : 0,
      },
    });
  },

  translate_arrange_frame: (dx, dy) =>
    set((state) =>
      state.arrange_bounds
        ? {
            arrange_bounds: {
              ...state.arrange_bounds,
              x: state.arrange_bounds.x + dx,
              y: state.arrange_bounds.y + dy,
            },
          }
        : {}
    ),

  apply_arrange: (overrides = {}, save_to_history = true) => {
    const { multi_selected_seat_ids, arrange, arrange_bounds } = get();
    if (!arrange_bounds || multi_selected_seat_ids.length < 2) return;
    get().arrange_seats(
      multi_selected_seat_ids,
      { ...arrange, ...overrides, bounds: arrange_bounds },
      save_to_history
    );
  },

  resize_seat_selection: (seat_ids, count) => {
    const state = get();
    const chosen = state.seats.filter(
      (s) => seat_ids.includes(s.seat_id) && !s.is_locked
    );
    // Same ordering the arrangement uses, so trimming removes the seats at the
    // end of the flow (bottom-right) rather than an arbitrary set.
    const ordered = [...chosen].sort((a, b) => a.y - b.y || a.x - b.x);
    const target = Math.max(1, Math.floor(count));

    if (target === ordered.length) return ordered.map((s) => s.seat_id);

    get().save_history();

    if (target < ordered.length) {
      const removed = new Set(ordered.slice(target).map((s) => s.seat_id));
      set((prev) => ({
        seats: prev.seats.filter((s) => !removed.has(s.seat_id)),
        selected_seat:
          prev.selected_seat && removed.has(prev.selected_seat.seat_id)
            ? null
            : prev.selected_seat,
      }));
      return ordered.slice(0, target).map((s) => s.seat_id);
    }

    // Growing: clone the trailing seat so new seats inherit its tag and tier.
    const template = ordered[ordered.length - 1];
    const stamp = Date.now();
    const added: VenueSeat[] = [];
    for (let i = ordered.length; i < target; i++) {
      added.push({
        seat_id: `seat-${stamp}-${i}`,
        section_id: template?.section_id ?? null,
        tier_id: template?.tier_id,
        row: template?.row ?? "A",
        number: i + 1,
        x: template?.x ?? 0,
        y: template?.y ?? 0,
        status: "available",
      });
    }
    set((prev) => ({ seats: [...prev.seats, ...added] }));
    return [
      ...ordered.map((s) => s.seat_id),
      ...added.map((s) => s.seat_id),
    ];
  },

  arrange_seats: (seat_ids, opts, save_to_history = true) => {
    const { form, rows, cols, amount_x, amount_y, gap_x, gap_y, bounds } = opts;
    if (save_to_history) get().save_history();
    set((state) => {
      const chosen = state.seats.filter(
        (s) => seat_ids.includes(s.seat_id) && !s.is_locked
      );
      if (chosen.length === 0) return state;

      // Lay out from the caller-supplied frame, not a freshly measured one:
      // arc/diagonal move seats, so re-measuring each tick would make the
      // layout creep while a slider is being dragged.
      const { x: min_x, y: min_y, width, height } = bounds;

      // Stable order so the same seat lands in the same cell every time.
      const ordered = [...chosen].sort((a, b) => a.y - b.y || a.x - b.x);

      const col_count = Math.max(1, Math.min(cols, ordered.length));
      // Rows are a consequence of how many seats there are, not an independent
      // value: seats flow at `Math.floor(i / col_count)`, so deriving the count
      // here keeps vertical spacing aligned with the rows actually produced.
      const row_count = Math.max(1, Math.ceil(ordered.length / col_count));
      // An explicit gap wins; otherwise spacing is stretched to fit the frame.
      const spacing_x =
        gap_x && gap_x > 0 ? gap_x : col_count > 1 ? width / (col_count - 1) : 0;
      const spacing_y =
        gap_y && gap_y > 0 ? gap_y : row_count > 1 ? height / (row_count - 1) : 0;

      const snap = get().snap_position;
      const moved = new Map<string, { x: number; y: number }>();

      if (form === "ellipse") {
        const cx = min_x + width / 2;
        const cy = min_y + height / 2;
        const rx = width / 2 || 1;
        const ry = height / 2 || 1;
        ordered.forEach((seat, i) => {
          const t = (i / ordered.length) * Math.PI * 2 - Math.PI / 2;
          moved.set(seat.seat_id, {
            x: snap(cx + rx * Math.cos(t), "x"),
            y: snap(cy + ry * Math.sin(t), "y"),
          });
        });
      } else {
        ordered.forEach((seat, i) => {
          const r = Math.floor(i / col_count);
          const c = i % col_count;
          let x = min_x + c * spacing_x;
          let y = min_y + r * spacing_y;

          if (form === "arc") {
            // Quadratic Bezier offset, same idiom as generate_seats_for_section.
            // Horizontal arc bows rows vertically; vertical arc bows columns
            // sideways. Both can be combined for a dish/bowl shape.
            const normalized_c =
              col_count > 1 ? (c - (col_count - 1) / 2) / ((col_count - 1) / 2) : 0;
            const normalized_r =
              row_count > 1 ? (r - (row_count - 1) / 2) / ((row_count - 1) / 2) : 0;
            y += amount_x * (normalized_c * normalized_c);
            x += amount_y * (normalized_r * normalized_r);
          } else if (form === "diagonal") {
            // Shear rows sideways and/or columns downward into a parallelogram
            x += r * amount_x;
            y += c * amount_y;
          }

          moved.set(seat.seat_id, { x: snap(x, "x"), y: snap(y, "y") });
        });
      }

      return {
        seats: state.seats.map((s) => {
          const p = moved.get(s.seat_id);
          return p ? { ...s, x: p.x, y: p.y } : s;
        }),
      };
    });
  },

  duplicate_row: (row, section_id) => {
    get().save_history();
    set((state) => {
      // section_id may be null now — duplicate the row within whatever
      // grouping it currently carries (including "no section").
      const seats_in_row = state.seats.filter(
        (s) => s.row === row && (s.section_id ?? null) === (section_id ?? null)
      );
      if (seats_in_row.length === 0) return state;

      const new_row_name = `${row}-copy`;
      const duplicated_seats = seats_in_row.map((s) => ({
        ...s,
        seat_id: `seat-${new_row_name}-${s.number}-${Date.now()}`,
        row: new_row_name,
        y: s.y + 30,
      }));

      return { seats: [...state.seats, ...duplicated_seats] };
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
    set((state) => {
      const section = state.sections.find((s) => s.section_id === section_id);
      if (!section || !section.shape) return state;

      {
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

        // Filling a section replaces just that section's seats in the flat list.
        return {
          seats: [
            ...state.seats.filter((s) => s.section_id !== section_id),
            ...new_seats,
          ],
        };
      }
    });
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

  move_selected_elements: (dx, dy, save_to_history = true) => {
    const state = get();
    // Only move if there is something selected and it's not locked.
    // Let's do this efficiently.
    const { multi_selected_seat_ids, selected_seat, selected_shape_id, stage_shape, sections, seats } = state;

    if (multi_selected_seat_ids.length > 0) {
      const has_locked = seats.some(
        (seat) => multi_selected_seat_ids.includes(seat.seat_id) && seat.is_locked
      );
      if (has_locked) return;

      if (save_to_history) get().save_history();
      set({
        seats: seats.map(seat =>
          multi_selected_seat_ids.includes(seat.seat_id)
            ? { ...seat, x: seat.x + dx, y: seat.y + dy }
            : seat
        )
      });
    } else if (selected_seat) {
      const is_locked = !!seats.find(s => s.seat_id === selected_seat.seat_id)?.is_locked;
      if (is_locked) return;

      if (save_to_history) get().save_history();
      set({
        seats: seats.map(seat =>
          seat.seat_id === selected_seat.seat_id
            ? { ...seat, x: seat.x + dx, y: seat.y + dy }
            : seat
        ),
        selected_seat: { ...selected_seat, x: selected_seat.x + dx, y: selected_seat.y + dy }
      });
    } else if (selected_shape_id === "stage") {
      if (stage_shape.is_locked) return;
      if (save_to_history) get().save_history();
      set({
        stage_shape: { ...stage_shape, x: stage_shape.x + dx, y: stage_shape.y + dy }
      });
    } else if (selected_shape_id) {
      const section = sections.find(s => s.section_id === selected_shape_id);
      if (section?.is_locked || !section?.shape) return;
      
      if (save_to_history) get().save_history();
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
      seats: state.seats.map((seat) =>
        seat_ids.includes(seat.seat_id) ? { ...seat, tier_id: tier_id } : seat
      ),
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

  set_venues: (venues) => set({ venues }),

  set_currency: (currency) => set({ base_currency: currency }),

  set_tax_rate: (rate) => set({ tax_rate: rate }),

  // ── Grid, Export & Validation ──────────────────────────────────────────
  toggle_snap_to_grid: () => set((state) => ({ snap_to_grid: !state.snap_to_grid })),

  set_grid_size: (axis, value) => {
    const size = Math.max(1, Math.min(200, Math.round(value) || 1));
    set((state) =>
      state.grid_link_axes
        ? { grid_size_x: size, grid_size_y: size }
        : axis === "x"
          ? { grid_size_x: size }
          : { grid_size_y: size }
    );
  },

  toggle_grid_link_axes: () =>
    set((state) => ({
      grid_link_axes: !state.grid_link_axes,
      // Re-linking squares the grid off the horizontal step.
      ...(!state.grid_link_axes ? { grid_size_y: state.grid_size_x } : {}),
    })),

  toggle_show_grid: () => set((state) => ({ show_grid: !state.show_grid })),

  set_snap_threshold: (value) =>
    set({ snap_threshold: Math.max(0, Math.min(50, Math.round(value) || 0)) }),

  snap_position: (value, axis = "x") => {
    const { snap_to_grid, grid_size_x, grid_size_y, snap_threshold } = get();
    if (!snap_to_grid) return value;

    const step = Math.max(1, axis === "y" ? grid_size_y : grid_size_x);
    const snapped = Math.round(value / step) * step;

    // Magnetic mode: leave the value alone unless it's already near a line.
    if (snap_threshold > 0 && Math.abs(snapped - value) > snap_threshold) {
      return value;
    }
    return snapped;
  },

  export_layout_json: () => {
    const { seats, sections, facilities, pricing_tiers, stage_shape, event_title, venue_name, base_currency, tax_rate } = get();
    const data = {
      exported_at: new Date().toISOString(),
      event_title,
      venue_name,
      base_currency,
      tax_rate,
      stage_shape,
      seats,
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
        seats: data.seats || [],
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
      seats: [],
      sections: [],
      facilities: [],
      pricing_tiers: [],
      past: [],
      future: [],
    });
  },

  validate_for_publish: () => {
    const { seats, sections, pricing_tiers } = get();
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

    // Check that seats exist at all
    if (seats.length === 0) {
      errors.push({ field: "seats", message: "No seats have been created yet" });
    }

    // Every seat must carry a ticket tier before the event can be published
    const unassigned = seats.filter((s) => !s.tier_id);
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
    const { seats, sections, facilities, stage_shape, pricing_tiers, past } = get();
    // Save current state to past, clear future
    set({
      past: [...past.slice(-49), { 
        seats: JSON.parse(JSON.stringify(seats)), 
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
        seats: previous.seats,
        sections: previous.sections,
        facilities: previous.facilities,
        stage_shape: previous.stage_shape,
        pricing_tiers: previous.pricing_tiers,
        future: [
          {
            seats: state.seats,
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
            seats: state.seats,
            sections: state.sections,
            facilities: state.facilities,
            stage_shape: state.stage_shape,
            pricing_tiers: state.pricing_tiers,
          },
        ],
        future: new_future,
        seats: next.seats,
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
          seats: state.seats.map((seat) =>
            seat.seat_id === id ? { ...seat, is_locked: !seat.is_locked } : seat
          ),
        };
      }
      return state;
    });
  },

  build_save_request: () => {
    const s = get();
    return buildSaveLayoutRequest({
      name: s.layout_name.trim() || s.venue_name.trim() || "Untitled Layout",
      visibility: s.layout_visibility,
      expectedUpdatedAt: s.layout_updated_at ?? "",
      stage_shape: s.stage_shape,
      facilities: s.facilities,
      blueprint: s.blueprint,
      zones: s.sections,
      seats: s.seats,
    });
  },

  apply_saved_ids: (seat_id_map) => {
    set((state) => ({
      seats: reconcileSavedIds(state.seats, seat_id_map),
      last_saved_at: Date.now(),
    }));
  },

  set_layout_meta: (layout_id, updated_at) => {
    set({ layout_id, layout_updated_at: updated_at });
  },

  set_layout_visibility: (visibility) => {
    set({ layout_visibility: visibility });
  },

  set_layout_name: (name) => {
    set({ layout_name: name });
  },

  load_layout_detail: (detail) => {
    const h = layoutDetailToEditorState(detail);
    set((state) => ({
      layout_id: h.layoutId,
      layout_updated_at: h.layoutUpdatedAt,
      layout_visibility: detail.visibility,
      layout_name: h.name,
      seats: h.seats,
      sections: h.zones,
      stage_shape: h.stage_shape ?? state.stage_shape,
      facilities: h.facilities ?? state.facilities,
      blueprint: h.blueprint ?? state.blueprint,
      past: [],
      future: [],
      selected_seat: null,
      multi_selected_seat_ids: [],
    }));
  },
}),
{
  // v5: seats moved out of sections into a flat top-level list. The old key is
  // abandoned rather than migrated so stale nested layouts don't rehydrate.
  name: "venue-editor-storage-v5",
  // Optionally, you can whitelist which parts of the state to save so we don't save ephemeral UI state like 'selected_seat'
  partialize: (state) => ({
    seats: state.seats,
    sections: state.sections,
    facilities: state.facilities,
    pricing_tiers: state.pricing_tiers,
    stage_shape: state.stage_shape,
    event_title: state.event_title,
    venue_name: state.venue_name,
    base_currency: state.base_currency,
    tax_rate: state.tax_rate,
    layout_id: state.layout_id,
    layout_updated_at: state.layout_updated_at,
    layout_visibility: state.layout_visibility,
    layout_name: state.layout_name,
  }),
}
));
