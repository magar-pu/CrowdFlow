/**
 * mock/venueEditorData.ts
 *
 * Mock data for the VenueMaster Pro venue editor. Mirrors the Stitch
 * design's "Rock Festival 2026" demo with 3 sections (VIP Pit, Gold
 * Circle, General Admission) and matching ticket configurations.
 *
 * Shape matches types/ticket.ts VenueEditorState exactly — swap for
 * real API data once the Go endpoints exist.
 */

import type { VenueSection, VenueSeat, VenueEditorState, PricingTier } from "@/types/ticket";

// ── Helper: generate a grid of seats for a section ─────────────────────
function generate_seats(
  section_id: string,
  rows: string[],
  seats_per_row: number,
  base_x: number,
  base_y: number,
  gap: number = 28,
): VenueSeat[] {
  const seats: VenueSeat[] = [];
  rows.forEach((row, row_idx) => {
    for (let i = 1; i <= seats_per_row; i++) {
      seats.push({
        seat_id: `${section_id}-${row}-${i}`,
        section_id,
        row,
        number: i,
        x: base_x + (i - 1) * gap,
        y: base_y + row_idx * gap,
        status: "available",
      });
    }
  });
  return seats;
}

// ── Sections ─────────────────────────────────────────────────────────────
export const mockVenueSections: VenueSection[] = [];

// ── Pricing Tiers ────────────────────────────────────────────────────────
export const mockPricingTiers: PricingTier[] = [
  { tier_id: "tier_vip", name: "VIP Emas", price: 2000000, color: "#F59E0B", quota: 50, description: "Front row access, meet & greet pass, exclusive merchandise" },
  { tier_id: "tier_cat1", name: "CAT 1 Biru", price: 1000000, color: "#3B82F6", quota: 200, description: "Premium seating with clear stage view" },
  { tier_id: "tier_festival", name: "Festival", price: 500000, color: "#10B981", quota: 500, description: "General standing area" },
];

// ── Full Editor State ────────────────────────────────────────────────────
export const mockVenueEditorState: VenueEditorState = {
  event_id: "evt_8923",
  event_title: "Rock Festival 2026",
  venue_name: "Main Arena",
  venues: [
    { venue_id: "ven_1", name: "Main Arena" },
    { venue_id: "ven_2", name: "Outdoor Stage" },
    { venue_id: "ven_3", name: "Grand Hall" },
  ],
  selected_venue_id: "ven_1",
  base_currency: "IDR",
  tax_rate: 0.11,
  sections: mockVenueSections,
  facilities: [],
  pricing_tiers: mockPricingTiers,
  stage_shape: { x: 200, y: 20, width: 400, height: 96, type: "rectangle" },
};
