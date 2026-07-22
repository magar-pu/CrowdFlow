/**
 * mock/resaleData.ts
 *
 * Mock data for the Verified Resale Marketplace. The original Stitch
 * design priced these in USD; converted here to IDR (rounded to clean
 * numbers) to stay consistent with the rest of the app's currency, which
 * is IDR throughout (FR-022/023/024 fee math, formatIDR()).
 */

import type { ResaleListing } from "@/types/ticket";

export const mockResaleListings: ResaleListing[] = [
  {
    listing_id: "resale_001",
    event_id: "evt_101_neon_nights_world_tour",
    event_title: "Neon Nights World Tour",
    event_category: "Concert",
    cover_image_url:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=600&auto=format&fit=crop",
    ticket_count: 2,
    is_vip: false,
    event_date_label: "Oct 24, 2026 • 8:00 PM",
    venue_label: "Starlight Arena, NY",
    original_face_value: 2_325_000,
    resale_price_per_ticket: 2_092_000,
    is_verified: true,
  },
  {
    listing_id: "resale_002",
    event_id: "evt_102_global_tech_summit",
    event_title: "Global Tech Summit 2026",
    event_category: "Conference",
    cover_image_url:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop",
    ticket_count: 1,
    is_vip: false,
    event_date_label: "Nov 12, 2026 • 9:00 AM",
    venue_label: "Moscone Center, CA",
    original_face_value: 6_975_000,
    resale_price_per_ticket: 6_200_000,
    is_verified: true,
  },
  {
    listing_id: "resale_003",
    event_id: "evt_103_championship_finals",
    event_title: "Championship Finals: Game 6",
    event_category: "Sports",
    cover_image_url:
      "https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=600&auto=format&fit=crop",
    ticket_count: 4,
    is_vip: false,
    event_date_label: "Jun 18, 2026 • 7:30 PM",
    venue_label: "City Arena, IL",
    original_face_value: 3_875_000,
    resale_price_per_ticket: 4_805_000,
    is_verified: true,
  },
  {
    listing_id: "resale_004",
    event_id: "evt_104_summer_solstice",
    event_title: "Summer Solstice Sound Fest",
    event_category: "Festival",
    cover_image_url:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=600&auto=format&fit=crop",
    ticket_count: 2,
    is_vip: true,
    event_date_label: "Jul 20-22, 2026",
    venue_label: "Desert Valley Grounds, NV",
    original_face_value: 8_525_000,
    resale_price_per_ticket: 7_672_500,
    is_verified: true,
  },
  {
    listing_id: "resale_005",
    event_id: "evt_105_phantom_opera",
    event_title: "Phantom of the Opera: Revival",
    event_category: "Theater",
    cover_image_url:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=600&auto=format&fit=crop",
    ticket_count: 2,
    is_vip: false,
    event_date_label: "Aug 05, 2026 • 7:00 PM",
    venue_label: "Majestic Theatre, NY",
    original_face_value: 1_860_000,
    resale_price_per_ticket: 1_860_000,
    is_verified: true,
  },
  {
    listing_id: "resale_006",
    event_id: "evt_106_ai_implementation",
    event_title: "Advanced AI Implementation",
    event_category: "Workshop",
    cover_image_url:
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=600&auto=format&fit=crop",
    ticket_count: 1,
    is_vip: false,
    event_date_label: "Sep 15, 2026 • 10:00 AM",
    venue_label: "Innovation Hub, TX",
    original_face_value: 12_400_000,
    resale_price_per_ticket: 10_075_000,
    is_verified: true,
  },
];