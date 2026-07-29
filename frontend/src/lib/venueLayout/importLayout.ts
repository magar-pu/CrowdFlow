/**
 * lib/venueLayout/importLayout.ts
 *
 * Parses and SANITISES a venue layout JSON file chosen by the user.
 *
 * Threat model — this is an arbitrary file from the user's disk, and whatever
 * survives here is written into the editor, then persisted to the layout's
 * geometry JSONB on save, and finally served to ticket buyers on the public
 * seat map. So it is untrusted input with a path to other people's browsers,
 * not just the importer's.
 *
 * The defence is REBUILD, NOT PATCH: nothing from the parsed object is ever
 * spread into state. Every field is copied across one at a time, type-checked
 * and clamped. Anything unrecognised is dropped rather than passed through.
 * That single decision neutralises whole classes of problem at once —
 * prototype pollution (`__proto__`/`constructor` keys are never read, let alone
 * assigned), unknown-key injection, and hostile values in fields that end up in
 * `style` attributes or React keys.
 *
 * Deliberately NOT used: eval, new Function, or any dynamic code path. JSON.parse
 * only. Note that JSON.parse itself cannot execute code — the danger of a
 * "malicious JSON" is entirely in what the application then does with the values.
 */

import type {
  VenueSeat,
  VenueSection,
  VenueFacility,
  VenueShape,
  PricingTier,
  FacilityIconType,
} from "@/types/ticket";

/** 5MB. A large arena layout is a few hundred KB; beyond this is abuse or error. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

// Caps chosen well above any real venue but low enough that a hostile file
// cannot lock the browser up rendering millions of nodes.
const MAX_SEATS = 20_000;
const MAX_SECTIONS = 500;
const MAX_FACILITIES = 500;
const MAX_TIERS = 100;
const MAX_POLYGON_POINTS = 200;

/** Canvas coordinate bound. Keeps geometry finite and on-canvas. */
const COORD_LIMIT = 100_000;
const MAX_STRING = 200;

const SEAT_STATUSES = [
  "available",
  "reserved",
  "sold",
  "locked",
  "unavailable",
  "accessible",
] as const;

const FACILITY_TYPES: FacilityIconType[] = [
  "restroom",
  "food",
  "medical",
  "exit",
  "info",
  "merch",
];

const SHAPE_TYPES = ["rectangle", "rounded-rectangle", "ellipse", "polygon"] as const;

export interface ImportResult {
  ok: boolean;
  error?: string;
  /** Non-fatal notes, e.g. "dropped 3 malformed seats". Shown to the user. */
  warnings: string[];
  data?: SanitisedLayout;
}

export interface SanitisedLayout {
  event_title: string;
  venue_name: string;
  base_currency: string;
  tax_rate: number;
  stage_shape: VenueShape;
  seats: VenueSeat[];
  sections: VenueSection[];
  facilities: VenueFacility[];
  pricing_tiers: PricingTier[];
}

// ── primitives ────────────────────────────────────────────────────────────

function is_plain_object(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Display strings: capped in length, control characters removed, and angle
 * brackets stripped.
 *
 * React escapes on render, so `<script>` in a label is inert in OUR UI. The
 * brackets go anyway because these strings are persisted and travel — into the
 * geometry JSONB, back out through Export, and on to the public seat map — and
 * a venue or section name has no legitimate need for them. That keeps the value
 * safe even if some future consumer is less careful than React.
 */
function clean_string(v: unknown, fallback = ""): string {
  if (typeof v !== "string") return fallback;
  const stripped = Array.from(v)
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      // Drop C0/C1 control chars, DEL, and angle brackets.
      return code > 31 && code !== 127 && ch !== "<" && ch !== ">";
    })
    .join("")
    .trim();
  return stripped.slice(0, MAX_STRING) || fallback;
}

/**
 * Ids become React keys and are echoed back to the API on save. Restricting the
 * charset keeps them predictable; anything else gets a generated id instead.
 */
function clean_id(v: unknown, fallback: string): string {
  if (typeof v !== "string") return fallback;
  const ok = v.replace(/[^A-Za-z0-9_:.-]/g, "").slice(0, 64);
  return ok || fallback;
}

function clean_number(v: unknown, fallback: number, limit = COORD_LIMIT): number {
  const n = typeof v === "number" ? v : Number(v);
  // Rejects NaN and ±Infinity, both of which serialise to null and corrupt the
  // saved geometry.
  if (!Number.isFinite(n)) return fallback;
  return Math.max(-limit, Math.min(limit, n));
}

/**
 * Colours are interpolated into inline `style` values, so only literal hex is
 * accepted — never an arbitrary string that could carry `url(...)` or similar.
 */
function clean_color(v: unknown, fallback = "#94a3b8"): string {
  return typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v.trim())
    ? v.trim()
    : fallback;
}

function clean_enum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;
}

/** db_id must be a positive integer or absent — it drives insert-vs-update on save. */
function clean_db_id(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null;
}

// ── composites ────────────────────────────────────────────────────────────

function clean_shape(v: unknown, fallback: VenueShape): VenueShape {
  if (!is_plain_object(v)) return fallback;
  const shape: VenueShape = {
    type: clean_enum(v.type, SHAPE_TYPES, "rectangle"),
    x: clean_number(v.x, 0),
    y: clean_number(v.y, 0),
    width: Math.max(1, clean_number(v.width, 100)),
    height: Math.max(1, clean_number(v.height, 100)),
    is_locked: v.is_locked === true,
  };
  if (Array.isArray(v.points)) {
    shape.points = v.points
      .slice(0, MAX_POLYGON_POINTS)
      .filter(is_plain_object)
      .map((p) => ({ x: clean_number(p.x, 0), y: clean_number(p.y, 0) }));
  }
  return shape;
}

function clean_seat(v: unknown, index: number): VenueSeat | null {
  if (!is_plain_object(v)) return null;
  return {
    seat_id: clean_id(v.seat_id, `imported-seat-${index}`),
    db_id: clean_db_id(v.db_id),
    // Imported seats are detached from any section that did not survive; the
    // caller re-links them below.
    section_id: typeof v.section_id === "string" ? clean_id(v.section_id, "") || null : null,
    row: clean_string(v.row, "A").slice(0, 8),
    number: Math.round(clean_number(v.number, index + 1, 100_000)),
    x: clean_number(v.x, 0),
    y: clean_number(v.y, 0),
    status: clean_enum(v.status, SEAT_STATUSES, "available"),
    is_locked: v.is_locked === true,
    tier_id: typeof v.tier_id === "string" ? clean_id(v.tier_id, "") || undefined : undefined,
  };
}

function clean_section(v: unknown, index: number): VenueSection | null {
  if (!is_plain_object(v)) return null;
  return {
    section_id: clean_id(v.section_id, `imported-section-${index}`),
    db_id: clean_db_id(v.db_id),
    label: clean_string(v.label, `Section ${index + 1}`),
    color: clean_color(v.color),
    section_code: clean_string(v.section_code, "").slice(0, 32),
    shape: is_plain_object(v.shape)
      ? clean_shape(v.shape, { type: "rectangle", x: 0, y: 0, width: 100, height: 100 })
      : undefined,
    is_locked: v.is_locked === true,
  };
}

function clean_facility(v: unknown, index: number): VenueFacility | null {
  if (!is_plain_object(v)) return null;
  // An unknown facility type has no icon to render, so drop the row rather than
  // silently relabelling it as something it is not.
  if (typeof v.type !== "string" || !FACILITY_TYPES.includes(v.type as FacilityIconType)) {
    return null;
  }
  return {
    id: clean_id(v.id, `imported-facility-${index}`),
    type: v.type as FacilityIconType,
    x: clean_number(v.x, 0),
    y: clean_number(v.y, 0),
    label: typeof v.label === "string" ? clean_string(v.label) : undefined,
  };
}

function clean_tier(v: unknown, index: number): PricingTier | null {
  if (!is_plain_object(v)) return null;
  return {
    tier_id: clean_id(v.tier_id, `imported-tier-${index}`),
    name: clean_string(v.name, `Tier ${index + 1}`),
    price: Math.max(0, clean_number(v.price, 0, 1_000_000_000)),
    color: clean_color(v.color),
    quota: Math.max(0, Math.round(clean_number(v.quota, 0, 10_000_000))),
    description: typeof v.description === "string" ? clean_string(v.description) : undefined,
  };
}

// ── entry point ───────────────────────────────────────────────────────────

/**
 * Validates and sanitises raw file text. Never throws — every failure path
 * returns a message suitable for display.
 */
export function parse_layout_import(raw: string): ImportResult {
  const warnings: string[] = [];

  if (raw.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: "That file is larger than 5MB.", warnings };
  }
  if (!raw.trim()) {
    return { ok: false, error: "That file is empty.", warnings };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Deliberately not echoing the parser's message, which can quote file
    // contents back into the UI.
    return { ok: false, error: "That file isn't valid JSON.", warnings };
  }

  if (!is_plain_object(parsed)) {
    return { ok: false, error: "That file doesn't contain a layout object.", warnings };
  }

  // The one structural requirement: a layout is defined by its geometry.
  if (!Array.isArray(parsed.seats) && !Array.isArray(parsed.sections)) {
    return {
      ok: false,
      error: "That file has no seats or sections — it doesn't look like a venue layout.",
      warnings,
    };
  }

  const raw_seats = Array.isArray(parsed.seats) ? parsed.seats : [];
  const raw_sections = Array.isArray(parsed.sections) ? parsed.sections : [];
  const raw_facilities = Array.isArray(parsed.facilities) ? parsed.facilities : [];
  const raw_tiers = Array.isArray(parsed.pricing_tiers) ? parsed.pricing_tiers : [];

  if (raw_seats.length > MAX_SEATS) {
    return {
      ok: false,
      error: `That layout has ${raw_seats.length.toLocaleString()} seats; the limit is ${MAX_SEATS.toLocaleString()}.`,
      warnings,
    };
  }

  const seats = raw_seats.map(clean_seat).filter((s): s is VenueSeat => s !== null);
  const sections = raw_sections
    .slice(0, MAX_SECTIONS)
    .map(clean_section)
    .filter((s): s is VenueSection => s !== null);
  const facilities = raw_facilities
    .slice(0, MAX_FACILITIES)
    .map(clean_facility)
    .filter((f): f is VenueFacility => f !== null);
  const pricing_tiers = raw_tiers
    .slice(0, MAX_TIERS)
    .map(clean_tier)
    .filter((t): t is PricingTier => t !== null);

  const dropped_seats = raw_seats.length - seats.length;
  if (dropped_seats > 0) warnings.push(`${dropped_seats} malformed seat(s) skipped.`);
  if (raw_sections.length > sections.length) {
    warnings.push(`${raw_sections.length - sections.length} malformed section(s) skipped.`);
  }
  if (raw_facilities.length > facilities.length) {
    warnings.push(`${raw_facilities.length - facilities.length} facility icon(s) skipped.`);
  }

  // Drop references to ids that did not survive, so nothing points at a section
  // or tier that no longer exists.
  const section_ids = new Set(sections.map((s) => s.section_id));
  const tier_ids = new Set(pricing_tiers.map((t) => t.tier_id));
  let orphaned = 0;
  for (const seat of seats) {
    if (seat.section_id && !section_ids.has(seat.section_id)) {
      seat.section_id = null;
      orphaned++;
    }
    if (seat.tier_id && !tier_ids.has(seat.tier_id)) {
      seat.tier_id = undefined;
    }
  }
  if (orphaned > 0) warnings.push(`${orphaned} seat(s) referenced a missing section and were detached.`);

  // Duplicate seat_ids would collide as React keys and on save.
  const seen = new Set<string>();
  seats.forEach((seat, i) => {
    if (seen.has(seat.seat_id)) seat.seat_id = `imported-seat-${i}-${Date.now()}`;
    seen.add(seat.seat_id);
  });

  return {
    ok: true,
    warnings,
    data: {
      event_title: clean_string(parsed.event_title, "Imported Event"),
      venue_name: clean_string(parsed.venue_name, "Imported Venue"),
      base_currency: clean_enum(parsed.base_currency, ["IDR", "USD"] as const, "IDR"),
      tax_rate: Math.max(0, Math.min(1, clean_number(parsed.tax_rate, 0, 1))),
      stage_shape: clean_shape(parsed.stage_shape, {
        type: "rectangle",
        x: 0,
        y: 0,
        width: 400,
        height: 80,
      }),
      seats,
      sections,
      facilities,
      pricing_tiers,
    },
  };
}
