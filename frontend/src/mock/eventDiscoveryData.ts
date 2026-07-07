/**
 * mock/eventDiscoveryData.ts
 *
 * Mock data for the Event Discovery page — kept separate from
 * mock/eventData.ts since this models a lighter list/browse API surface,
 * not the full Event detail shape.
 */

import type {
    AIRecommendedEvent,
    EventListingCard,
    FeaturedCarouselEvent,
  } from "@/types/ticket";
  
  export const mockFeaturedCarousel: FeaturedCarouselEvent[] = [
    {
      event_id: "evt_201_coldplay",
      cover_image_url:
        "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1600&auto=format&fit=crop",
      tag_label: "World Tour 2026",
      tag_color: "secondary",
      title: "Coldplay: Music of the Spheres",
      date_venue_label: "15 November 2026 • Gelora Bung Karno, Jakarta",
      starting_price: 800_000,
    },
    {
      event_id: "evt_202_jakarta_summer_sound",
      cover_image_url:
        "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1600&auto=format&fit=crop",
      tag_label: "Summer Series",
      tag_color: "success",
      title: "Jakarta Summer Sound 2026",
      date_venue_label: "22 Agustus 2026 • PIK 2, Jakarta",
      starting_price: 450_000,
    },
  ];
  
  export const mockAIRecommendedEvents: AIRecommendedEvent[] = [
    {
      event_id: "evt_203_jazz_night",
      cover_image_url:
        "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?q=80&w=400&auto=format&fit=crop",
      tag_label: "Top Match",
      match_pct: 98,
      title: "Jazz Night: Blue Horizon",
      date_venue_label: "20 Sep • Salihara Arts Center",
      price: 350_000,
    },
    {
      event_id: "evt_204_future_tech_summit",
      cover_image_url:
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400&auto=format&fit=crop",
      tag_label: "Trending",
      match_pct: 94,
      title: "Future Tech Summit 2026",
      date_venue_label: "12 Okt • JCC Senayan",
      price: 1_200_000,
    },
  ];
  
  export const mockEventListingCards: EventListingCard[] = [
    {
      event_id: "evt_205_sheila_on_7",
      title: "Sheila on 7: Tunggu Aku di Jakarta",
      category_label: "Music • Concert",
      cover_image_url:
        "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=800&auto=format&fit=crop",
      badge: "on_sale",
      trust_signal: "sell_out_warning",
      date_label: "30 September 2026 • 19:00 WIB",
      venue_label: "JIExpo Kemayoran, Jakarta",
      starting_price: 425_000,
      city: "Jakarta",
    },
    {
      event_id: "evt_206_ibl_finals",
      title: "IBL Finals 2026: Game 3",
      category_label: "Sports • Basketball",
      cover_image_url:
        "https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=800&auto=format&fit=crop",
      badge: "selling_fast",
      trust_signal: "protection_enabled",
      date_label: "15 Agustus 2026 • 18:30 WIB",
      venue_label: "Indonesia Arena, Jakarta",
      starting_price: 150_000,
      city: "Jakarta",
    },
    {
      event_id: "evt_207_charity_gala",
      title: "Indonesian Charity Gala 2026",
      category_label: "Community • Gala",
      cover_image_url:
        "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=800&auto=format&fit=crop",
      badge: "newly_added",
      trust_signal: "none",
      date_label: "21 Oktober 2026 • 19:00 WIB",
      venue_label: "The Ritz-Carlton, Jakarta",
      starting_price: 2_500_000,
      city: "Jakarta",
    },
    {
      event_id: "evt_208_bandung_food_fest",
      title: "Bandung Culinary Festival 2026",
      category_label: "Festival • Culinary",
      cover_image_url:
        "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&auto=format&fit=crop",
      badge: "on_sale",
      trust_signal: "verified",
      date_label: "5 Oktober 2026 • 10:00 WIB",
      venue_label: "Gedung Sate, Bandung",
      starting_price: 75_000,
      city: "Bandung",
    },
    {
      event_id: "evt_209_surabaya_marathon",
      title: "Surabaya Night Marathon 2026",
      category_label: "Sports • Running",
      cover_image_url:
        "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?q=80&w=800&auto=format&fit=crop",
      badge: "sold_out",
      trust_signal: "identity_required",
      date_label: "8 November 2026 • 04:00 WIB",
      venue_label: "Tugu Pahlawan, Surabaya",
      starting_price: 350_000,
      city: "Surabaya",
    },
    {
      event_id: "evt_210_art_exhibition",
      title: "Pameran Seni Rupa Nusantara",
      category_label: "Exhibition • Art",
      cover_image_url:
        "https://images.unsplash.com/photo-1531913764164-f85c52e6e654?q=80&w=800&auto=format&fit=crop",
      badge: "newly_added",
      trust_signal: "none",
      date_label: "12 September 2026 • 09:00 WIB",
      venue_label: "Galeri Nasional, Jakarta",
      starting_price: 50_000,
      city: "Jakarta",
    },
  ];