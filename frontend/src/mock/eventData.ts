/**
 * mock/eventData.ts
 *
 * Mock data for a high-demand music festival, used to drive the frontend
 * before the Go backend exists. Shape matches types/ticket.ts exactly —
 * snake_case throughout so this is a drop-in stand-in for a real
 * GET /api/v1/events/{event_id} response.
 */

import type { Event, Order, Organizer, SeatSection, TicketCategory } from "@/types/ticket";

const VENUE_GBK = {
  venue_id: "venue_001_gbk_senayan",
  name: "Gelora Bung Karno – Main Stadium",
  address: "Jl. Pintu Satu Senayan",
  city: "Jakarta Pusat",
  province: "DKI Jakarta",
  postal_code: "10270",
  latitude: -6.2186,
  longitude: 106.8023,
  total_capacity: 60000,
  timezone: "Asia/Jakarta",
};

const ORGANIZER_LIVE_NATION: Organizer = {
  organizer_id: "org_007_livenation_id",
  name: "Live Nation Entertainment",
  avatar_url:
    "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200&auto=format&fit=crop",
  profile_url: "/organizers/org_007_livenation_id",
};

export const mockTicketCategories: TicketCategory[] = [
  {
    ticket_category_id: "tc_001_vip_experience",
    event_id: "evt_001_soundscape_festival_2026",
    name: "VIP Experience",
    description:
      "Front-stage access, dedicated VIP lounge, and a fast-lane entry gate.",
    sale_channel: "primary",
    face_value: 2_750_000,
    currency: "IDR",
    quota_total: 500,
    quota_remaining: 42,
    max_per_transaction: 4,
    benefits: [
      "Front-stage viewing area",
      "Access to VIP lounge with private bar",
      "Fast-lane entry gate",
      "Exclusive festival merchandise pack",
    ],
    is_active: true,
  },
  {
    ticket_category_id: "tc_002_festival_pass",
    event_id: "evt_001_soundscape_festival_2026",
    name: "Festival Pass (2-Day)",
    description: "Full access to both festival days, general stage areas.",
    sale_channel: "primary",
    face_value: 1_450_000,
    currency: "IDR",
    quota_total: 15000,
    quota_remaining: 3812,
    max_per_transaction: 7,
    benefits: ["Access to all stages, both days", "Re-entry wristband"],
    is_active: true,
  },
  {
    ticket_category_id: "tc_003_single_day",
    event_id: "evt_001_soundscape_festival_2026",
    name: "Single Day Pass",
    description: "Full access to general stage areas for one day only.",
    sale_channel: "primary",
    face_value: 850_000,
    currency: "IDR",
    quota_total: 20000,
    quota_remaining: 11947,
    max_per_transaction: 7,
    benefits: ["Access to all stages, single day of choice"],
    is_active: true,
  },
  {
    ticket_category_id: "tc_004_resale_festival_pass",
    event_id: "evt_001_soundscape_festival_2026",
    name: "Festival Pass (2-Day) — Resale",
    description:
      "Verified resale ticket from a registered seller. Same access as a primary Festival Pass.",
    sale_channel: "resale",
    face_value: 1_600_000,
    currency: "IDR",
    quota_total: 120,
    quota_remaining: 17,
    max_per_transaction: 2,
    benefits: ["Access to all stages, both days", "Re-entry wristband"],
    is_active: true,
  },
  {
    ticket_category_id: "tc_005_balcony_seating",
    event_id: "evt_001_soundscape_festival_2026",
    name: "Balcony Seating",
    description: "Reserved seating in upper tiers.",
    sale_channel: "primary",
    face_value: 650_000,
    currency: "IDR",
    quota_total: 800,
    quota_remaining: 0,
    max_per_transaction: 7,
    benefits: ["Reserved seat in upper tier"],
    is_active: false,
  },
];

export const mockEvent: Event = {
  event_id: "evt_001_soundscape_festival_2026",
  organizer_id: ORGANIZER_LIVE_NATION.organizer_id,
  organizer: ORGANIZER_LIVE_NATION,
  title: "Soundscape Festival 2026",
  slug: "soundscape-festival-2026",
  description:
    "A two-day, multi-stage music festival featuring international headliners and the best of the regional electronic and indie scene. Expect immersive stage production, curated food vendors, and Jakarta's biggest dance floor under the stars.",
  cover_image_url:
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1600&auto=format&fit=crop",
  category: "music_festival",
  status: "on_sale",
  venue: VENUE_GBK,
  starts_at: "2026-09-12T13:00:00+07:00",
  ends_at: "2026-09-13T23:30:00+07:00",
  sales_open_at: "2026-07-01T10:00:00+07:00",
  sales_close_at: "2026-09-12T12:00:00+07:00",
  ticket_categories: mockTicketCategories,
  important_info: [
    "Gates open 2 hours before the show starts.",
    "Strictly no professional cameras allowed.",
    "Children under 12 must be accompanied by an adult.",
    "Digital tickets only via the CrowdFlow App.",
  ],
  is_high_demand: true,
  max_tickets_per_account: 7,
  created_at: "2026-05-20T09:15:00+07:00",
  updated_at: "2026-06-18T16:40:00+07:00",
};

/** Convenience lookup map, mirrors how you'd index a Go map[string]TicketCategory in-memory cache. */
export const mockTicketCategoryById: Record<string, TicketCategory> =
  mockTicketCategories.reduce(
    (acc, category) => {
      acc[category.ticket_category_id] = category;
      return acc;
    },
    {} as Record<string, TicketCategory>
  );

/** A small catalog array, useful for the public /events listing page mock. */
export const mockEventList: Event[] = [
  mockEvent,
  {
    event_id: "evt_002_tech_summit_asia",
    organizer_id: "org_012_techsummit_id",
    organizer: {
      organizer_id: "org_012_techsummit_id",
      name: "Tech Summit Asia Org",
      avatar_url:
        "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=200&auto=format&fit=crop",
      profile_url: "/organizers/org_012_techsummit_id",
    },
    title: "Tech Summit Asia 2026",
    slug: "tech-summit-asia-2026",
    description:
      "A premier gathering of engineering leaders, founders, and investors across Southeast Asia's fastest-growing tech ecosystem.",
    cover_image_url:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop",
    category: "conference",
    status: "on_sale",
    venue: {
      venue_id: "venue_002_ice_bsd",
      name: "ICE BSD City",
      address: "BSD City",
      city: "Tangerang",
      province: "Banten",
      postal_code: "15345",
      latitude: -6.3018,
      longitude: 106.6527,
      total_capacity: 8000,
      timezone: "Asia/Jakarta",
    },
    starts_at: "2026-11-02T09:00:00+07:00",
    ends_at: "2026-11-03T18:00:00+07:00",
    sales_open_at: "2026-06-01T10:00:00+07:00",
    sales_close_at: "2026-11-02T08:00:00+07:00",
    ticket_categories: [],
    important_info: [],
    is_high_demand: false,
    max_tickets_per_account: 7,
    created_at: "2026-05-01T09:00:00+07:00",
    updated_at: "2026-06-01T09:00:00+07:00",
  },
  {
    event_id: "evt_003_jakarta_java_jazz",
    organizer_id: "org_018_javajazz_id",
    organizer: {
      organizer_id: "org_018_javajazz_id",
      name: "Java Festival Production",
      avatar_url:
        "https://images.unsplash.com/photo-1580489944151-da6ba907d2a4?q=80&w=200&auto=format&fit=crop",
      profile_url: "/organizers/org_018_javajazz_id",
    },
    title: "Jakarta Java Jazz Festival 2026",
    slug: "jakarta-java-jazz-2026",
    description:
      "An intimate, premium outdoor jazz festival featuring both legendary and emerging artists across three stages.",
    cover_image_url:
      "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?q=80&w=1200&auto=format&fit=crop",
    category: "festival",
    status: "on_sale",
    venue: {
      venue_id: "venue_003_jiexpo",
      name: "JIExpo Kemayoran",
      address: "Jl. Benyamin Sueb",
      city: "Jakarta Utara",
      province: "DKI Jakarta",
      postal_code: "14410",
      latitude: -6.1488,
      longitude: 106.8508,
      total_capacity: 25000,
      timezone: "Asia/Jakarta",
    },
    starts_at: "2026-08-07T16:00:00+07:00",
    ends_at: "2026-08-09T23:00:00+07:00",
    sales_open_at: "2026-05-01T10:00:00+07:00",
    sales_close_at: "2026-08-07T15:00:00+07:00",
    ticket_categories: [],
    important_info: [],
    is_high_demand: false,
    max_tickets_per_account: 7,
    created_at: "2026-04-01T09:00:00+07:00",
    updated_at: "2026-06-01T09:00:00+07:00",
  },
];

/**
 * Mock seat map sections for evt_001_soundscape_festival_2026.
 * Mirrors the Stitch seat_selection screen: 3 VIP blocks ("VIP L/C/R")
 * each with a 6-row x 10-seat grid, plus 8 general admission sections
 * ("Sec 1".."Sec 8") of which Sec 3 and Sec 6 are fully sold out.
 */
export const mockSeatSections: SeatSection[] = [
  {
    section_id: "sec_vip_l",
    event_id: "evt_001_soundscape_festival_2026",
    label: "VIP L",
    ticket_category_id: "tc_001_vip_experience",
    is_sold_out: false,
    rows: ["A", "B", "C", "D", "E", "F"],
    seats_per_row: 10,
    sold_seat_codes: ["A3", "A4", "B1", "B2"],
  },
  {
    section_id: "sec_vip_c",
    event_id: "evt_001_soundscape_festival_2026",
    label: "VIP C",
    ticket_category_id: "tc_001_vip_experience",
    is_sold_out: false,
    rows: ["A", "B", "C", "D", "E", "F"],
    seats_per_row: 10,
    sold_seat_codes: ["C8", "D5", "D6"],
  },
  {
    section_id: "sec_vip_r",
    event_id: "evt_001_soundscape_festival_2026",
    label: "VIP R",
    ticket_category_id: "tc_001_vip_experience",
    is_sold_out: false,
    rows: ["A", "B", "C", "D", "E", "F"],
    seats_per_row: 10,
    sold_seat_codes: ["E10", "F1"],
  },
  ...Array.from({ length: 8 }, (_, index) => {
    const section_number = index + 1;
    const is_sold_out = section_number === 3 || section_number === 6;
    return {
      section_id: `sec_ga_${section_number}`,
      event_id: "evt_001_soundscape_festival_2026",
      label: `Sec ${section_number}`,
      ticket_category_id: "tc_003_single_day",
      is_sold_out,
      rows: is_sold_out ? [] : ["A", "B", "C", "D", "E", "F"],
      seats_per_row: 10,
      sold_seat_codes: is_sold_out ? [] : ["A1", "B5"],
    } satisfies SeatSection;
  }),
];

/** Mock successful order, used to drive the "Your Ticket" purchase-success page. */
export const mockOrder: Order = {
  order_id: "ord_4821_xtq",
  user_email: "alex.chen@example.com",
  amount_paid: 5_750_000,
  currency: "IDR",
  paid_at: "2026-06-21T14:32:00+07:00",
  tickets: [
    {
      ticket_id: "tkt_001",
      order_id: "ord_4821_xtq",
      event_id: "evt_001_soundscape_festival_2026",
      event_title: "Soundscape Festival 2026",
      event_category_label: "Music of the Spheres",
      cover_image_url:
        "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=900&auto=format&fit=crop",
      starts_at: "2026-09-12T19:30:00+07:00",
      venue_name: "Gelora Bung Karno Stadium",
      venue_city: "Jakarta, Indonesia",
      section: "102",
      row: "G",
      seat_number: "14",
      ticket_code: "CF-9824-XTQ",
      qr_payload: "cf:order=ord_4821_xtq;ticket=tkt_001;sig=mock",
    },
  ],
};