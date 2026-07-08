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