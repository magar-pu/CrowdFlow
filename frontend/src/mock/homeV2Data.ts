/**
 * mock/homeV2Data.ts
 *
 * Mock data for the redesigned (Indonesian-language) home page —
 * bento collection tiles and the "Event Paling Dinanti" trending grid
 * with country filter pills.
 */

import type { BentoCollectionTile, TrendingEventCard } from "@/types/ticket";

export const mockBentoTiles: BentoCollectionTile[] = [
  {
    tile_id: "bento_music_festival",
    title: "Festival Musik 2026",
    subtitle: "Konser outdoor & rave party terbesar",
    cover_image_url:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1200&auto=format&fit=crop",
    col_span: 2,
    row_span: 2,
    href: "/events?category=konser",
  },
  {
    tile_id: "bento_sports",
    title: "Turnamen Olahraga",
    subtitle: "Dukung tim favorit Anda secara langsung",
    cover_image_url:
      "https://images.unsplash.com/photo-1546519638-68e109498ffd?q=80&w=1200&auto=format&fit=crop",
    col_span: 2,
    row_span: 1,
    href: "/events?category=olahraga",
  },
  {
    tile_id: "bento_art",
    title: "Pameran Seni",
    cover_image_url:
      "https://images.unsplash.com/photo-1531913764164-f85c52e6e654?q=80&w=600&auto=format&fit=crop",
    col_span: 1,
    row_span: 1,
    href: "/events?category=pameran",
  },
  {
    tile_id: "bento_theater",
    title: "Teater & Drama",
    cover_image_url:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=600&auto=format&fit=crop",
    col_span: 1,
    row_span: 1,
    href: "/events?category=teater",
  },
];

// Placeholder rating / review-count / starting-price values for the trending
// cards. There is no backend source for these yet (no reviews system, and the
// event list response carries no tier prices), so they are derived
// deterministically from the event id — stable across renders and reloads.
// TODO: replace with real API data once the backend provides it.
export function mockTrendingCardStats(
  event_id: string
): Pick<TrendingEventCard, "rating" | "review_count" | "starting_price"> {
  let hash = 0;
  for (let i = 0; i < event_id.length; i++) {
    hash = (hash * 31 + event_id.charCodeAt(i)) >>> 0;
  }
  return {
    rating: 4 + (hash % 10) / 10, // 4.0–4.9
    review_count: 120 + (hash % 4880), // 120–4,999
    starting_price: (150 + (hash % 14) * 25) * 1000, // Rp 150.000–475.000
  };
}

// Category filter pills for the "Event Paling Dinanti" trending section.
// Values match the category strings returned by GET /api/events (backend mapCategory).
export const CATEGORY_FILTERS = [
  "All",
  "concert",
  "festival",
  "sport",
  "conference",
  "exhibition",
  "community",
  "workshop_seminar",
];