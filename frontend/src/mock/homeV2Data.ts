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

export const mockTrendingEvents: TrendingEventCard[] = [
  {
    event_id: "evt_301_noah_gbk",
    title: "Konser Suara Hati: Noah Live at GBK 2026",
    cover_image_url:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=600&auto=format&fit=crop",
    city: "Jakarta",
    rating: 4.9,
    review_count: 1200,
    starting_price: 750_000,
    country: "Indonesia",
  },
  {
    event_id: "evt_302_future_tech",
    title: "Future Tech Summit 2026: AI & Web3",
    cover_image_url:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop",
    city: "BSD City",
    rating: 4.8,
    review_count: 845,
    starting_price: 350_000,
    country: "Indonesia",
  },
  {
    event_id: "evt_303_kecak_dance",
    title: "Kecak Fire & Trance Dance: Sunset Experience",
    cover_image_url:
      "https://images.unsplash.com/photo-1555990538-ce8bcce85a4e?q=80&w=600&auto=format&fit=crop",
    city: "Ubud, Bali",
    rating: 5.0,
    review_count: 3400,
    starting_price: 150_000,
    country: "Indonesia",
  },
  {
    event_id: "evt_304_art_exhibition",
    title: "Pameran Seni Kontemporer: Horizon Baru",
    cover_image_url:
      "https://images.unsplash.com/photo-1531913764164-f85c52e6e654?q=80&w=600&auto=format&fit=crop",
    city: "Menteng",
    rating: 4.7,
    review_count: 210,
    starting_price: 100_000,
    country: "Indonesia",
  },
  {
    event_id: "evt_305_tokyo_anime_expo",
    title: "Tokyo Anime & Game Expo 2026",
    cover_image_url:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=600&auto=format&fit=crop",
    city: "Tokyo",
    rating: 4.6,
    review_count: 980,
    starting_price: 600_000,
    country: "Japan",
  },
  {
    event_id: "evt_306_singapore_gp",
    title: "Singapore Grand Prix Night Race 2026",
    cover_image_url:
      "https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=600&auto=format&fit=crop",
    city: "Singapore",
    rating: 4.9,
    review_count: 2100,
    starting_price: 3_500_000,
    country: "Singapore",
  },
];

export const COUNTRY_FILTERS = [
  "Indonesia",
  "Japan",
  "Singapore",
  "United States",
];