/**
 * types/ticket.ts
 *
 * Core domain types for CrowdFlow's ticketing/checkout flow.
 *
 * NAMING CONVENTION:
 * All properties are snake_case to mirror Go's idiomatic JSON tags
 * (e.g. `json:"event_id"`). This lets these interfaces map 1:1 onto
 * Go structs once the real API is wired in — no transform layer needed
 * between fetch() and component props.
 */

// ─────────────────────────────────────────────────────────────────────────
// Enums / literal unions
// ─────────────────────────────────────────────────────────────────────────

/** Mirrors a Go `type EventStatus string` enum with iota-style constants. */
export type EventStatus =
  | "draft"
  | "published"
  | "on_sale"
  | "sold_out"
  | "cancelled"
  | "completed";

/** Whether a ticket category is being sold by the organizer (primary) or resold by a user (resale). */
export type TicketSaleChannel = "primary" | "resale";

export type PaymentMethod =
  | "credit_card"
  | "debit_card"
  | "virtual_account"
  | "e_wallet"
  | "qris";

export type Currency = "IDR";

// ─────────────────────────────────────────────────────────────────────────
// Venue
// ─────────────────────────────────────────────────────────────────────────

export interface Venue {
  venue_id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  capacity: number;
  timezone: string; // e.g. "Asia/Jakarta"
}

// ─────────────────────────────────────────────────────────────────────────
// Organizer
// ─────────────────────────────────────────────────────────────────────────

export interface Organizer {
  organizer_id: string;
  name: string;
  avatar_url: string;
  profile_url: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Event
// ─────────────────────────────────────────────────────────────────────────

export interface Event {
  event_id: string;
  organizer_id: string;
  organizer: Organizer; // denormalized for display without a second lookup
  title: string;
  slug: string;
  description: string;
  cover_image_url: string;
  category: string; // e.g. "music_festival", "conference", "sports"
  status: EventStatus;
  venue: Venue;
  starts_at: string; // ISO-8601, e.g. "2026-09-12T13:00:00+07:00"
  ends_at: string; // ISO-8601
  sales_open_at: string; // ISO-8601 — when the virtual waiting room queue opens
  sales_close_at: string; // ISO-8601
  ticket_categories: TicketCategory[];
  important_info: string[]; // bullet list shown in the "About This Event" section
  is_high_demand: boolean; // drives whether the queue/waiting room is enforced (FR anti-bot)
  max_tickets_per_account: number; // FR-010, default 7
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Ticket Category
// ─────────────────────────────────────────────────────────────────────────

export interface TicketCategory {
  ticket_category_id: string;
  event_id: string;
  name: string; // e.g. "VIP", "Festival Pass", "General Admission"
  description: string;
  sale_channel: TicketSaleChannel;
  face_value: number; // base ticket price, in smallest currency unit (IDR has no decimals, store as whole Rupiah)
  currency: Currency;
  quota_total: number;
  quota_remaining: number;
  max_per_transaction: number; // category-level cap; account-level cap is event.max_tickets_per_account
  benefits: string[]; // e.g. ["Access to VIP lounge", "Merchandise bundle"]
  is_active: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// Cart
// ─────────────────────────────────────────────────────────────────────────

export interface CartItem {
  cart_item_id: string; // client-generated UUID, stable key for Zustand store + React lists
  event_id: string;
  ticket_category_id: string;
  ticket_category_name: string; // denormalized for display without a second lookup
  sale_channel: TicketSaleChannel;
  unit_face_value: number; // snapshot of face_value at time of add-to-cart
  quantity: number;
  currency: Currency;
}

// ─────────────────────────────────────────────────────────────────────────
// Price Breakdown (FR-022, FR-023, FR-024)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Line-item breakdown for a single cart item, after fee + tax calculation.
 *
 * Calculation order matters and is fixed by FR-023:
 *   1. subtotal_face_value = unit_face_value * quantity
 *   2. platform_service_fee = subtotal_face_value * (4% primary | 2% resale)
 *   3. payment_gateway_fee  = provided by selected payment method (flat or %, set externally)
 *   4. ppn_tax_amount       = (platform_service_fee + payment_gateway_fee) * 11%
 *                             — NOT applied to subtotal_face_value
 *   5. line_total           = subtotal_face_value + platform_service_fee + payment_gateway_fee + ppn_tax_amount
 */
export interface PriceBreakdownLine {
  cart_item_id: string;
  ticket_category_name: string;
  sale_channel: TicketSaleChannel;
  quantity: number;
  unit_face_value: number;
  subtotal_face_value: number;
  platform_service_fee_rate: number; // 0.04 or 0.02, exposed for transparency/audit
  platform_service_fee: number;
  line_total: number; // excludes shared payment_gateway_fee + ppn, which are computed at order level
}

/**
 * Order-level summary. Payment gateway fee and PPN are computed once for the
 * whole cart (not per-line) since the gateway fee is a function of the chosen
 * payment method, not of individual ticket categories.
 */
export interface PriceBreakdown {
  lines: PriceBreakdownLine[];
  currency: Currency;

  subtotal_face_value: number; // sum of all lines' subtotal_face_value
  total_platform_service_fee: number; // sum of all lines' platform_service_fee

  payment_method: PaymentMethod | null;
  payment_gateway_fee: number; // depends on payment_method; 0 until a method is selected

  ppn_tax_rate: number; // 0.11, fixed by FR-023
  ppn_taxable_base: number; // total_platform_service_fee + payment_gateway_fee (never includes face value)
  ppn_tax_amount: number;

  grand_total: number; // subtotal_face_value + total_platform_service_fee + payment_gateway_fee + ppn_tax_amount
}

// ─────────────────────────────────────────────────────────────────────────
// Seat Selection
// ─────────────────────────────────────────────────────────────────────────

export type SeatStatus = "available" | "selected" | "sold" | "held";

/**
 * A section/block within a venue's seat map (e.g. "VIP L", "Sec 3").
 * Sections without a `rows`/`seats_per_row` pair are rendered as a single
 * clickable block (general admission-style) rather than an individual
 * seat grid — mirrors how the Stitch seat_selection screen treats
 * "VIP L/C/R" vs the numbered "Sec 1..8" blocks.
 */
export interface SeatSection {
  section_id: string;
  event_id: string;
  label: string; // e.g. "VIP L", "Sec 3"
  ticket_category_id: string; // links back to TicketCategory for pricing
  is_sold_out: boolean;
  rows: string[]; // e.g. ["A", "B", "C", "D", "E", "F"]
  seats_per_row: number;
  sold_seat_codes: string[]; // e.g. ["A3", "A4", "B1"] — row+seat_number concatenated
}

export interface SelectedSeat {
  seat_id: string; // `${section_id}-${row}-${seat_number}`
  section_id: string;
  section_label: string;
  row: string;
  seat_number: number;
  unit_face_value: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Purchased Ticket (post-payment)
// ─────────────────────────────────────────────────────────────────────────

/**
 * A single issued digital ticket, returned after a successful order.
 * `ticket_code` is the human-readable code printed under the QR (e.g.
 * "CF-9824-XTQ"); `qr_payload` is the string actually encoded into the QR
 * image — kept separate since the QR payload will likely be a signed
 * token from the Go backend, not just the display code.
 */
export interface PurchasedTicket {
  ticket_id: string;
  order_id: string;
  event_id: string;
  event_title: string;
  event_category_label: string; // e.g. "Music of the Spheres" (tour/sub-label shown over the cover image)
  cover_image_url: string;
  starts_at: string; // ISO-8601
  venue_name: string;
  venue_city: string;
  section: string; // e.g. "102"
  row: string; // e.g. "G"
  seat_number: string; // e.g. "14"
  ticket_code: string; // e.g. "CF-9824-XTQ"
  qr_payload: string;
}

export interface Order {
  order_id: string;
  user_email: string;
  amount_paid: number;
  currency: Currency;
  paid_at: string; // ISO-8601
  tickets: PurchasedTicket[];
}

// ─────────────────────────────────────────────────────────────────────────
// Organizer Dashboard
// ─────────────────────────────────────────────────────────────────────────

export type OrganizerEventStatus = "on_sale" | "almost_full" | "draft" | "sold_out" | "ended";

/**
 * Row-level event summary for the organizer dashboard's "Active Events"
 * table — intentionally lighter than the full Event type, mirroring a
 * dedicated Go list endpoint (e.g. GET /api/v1/organizer/events) that
 * wouldn't return full ticket_categories/venue payloads for a table view.
 */
export interface OrganizerEvent {
  event_id: string;
  display_id: string; // e.g. "#EVT-8923"
  title: string;
  cover_image_url: string;
  date_range_label: string; // e.g. "Oct 15 - 17, 2024"
  venue_name: string;
  status: OrganizerEventStatus;
  tickets_sold: number;
  tickets_total: number;
}

export interface DashboardStats {
  total_revenue: number;
  total_revenue_change_pct: number; // e.g. 14.5 for "+14.5%"
  revenue_sparkline: number[];
  tickets_sold: number;
  tickets_sold_change_pct: number;
  tickets_sparkline: number[];
  avg_capacity_usage_pct: number;
  avg_capacity_target_pct: number;
  upcoming_events_count: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Virtual Waiting Room (Queue)
// ─────────────────────────────────────────────────────────────────────────

export type QueuePhase = "waiting" | "almost_ready" | "ready" | "expired";

/**
 * Shape of a single SSE/WebSocket message the Go backend will push while
 * a user waits in the virtual queue (FR: anti-bot / high-traffic queueing).
 * The frontend queue page polls/mocks this shape today and will swap the
 * polling interval for a real EventSource/WebSocket listener later
 * without changing any consuming component, since they all just read
 * QueueStatus regardless of where it came from.
 */
export interface QueueStatus {
  queue_id: string;
  event_id: string;
  position: number; // 1-indexed; user's current place in line
  total_ahead: number; // how many people are ahead right now
  total_in_queue: number; // total people queued for this event at this moment
  estimated_wait_seconds: number;
  phase: QueuePhase;
  session_token: string; // opaque token to redeem for seat-selection access once phase === "ready"
}

// ─────────────────────────────────────────────────────────────────────────
// Resale Marketplace
// ─────────────────────────────────────────────────────────────────────────

/**
 * A single resale listing card on the Verified Resale Marketplace. This is
 * a browsing-surface summary, distinct from TicketCategory (which models
 * an event's own sale categories) — a ResaleListing aggregates one or
 * more individual resold tickets for the same event under one card.
 */
export interface ResaleListing {
  listing_id: string;
  event_id: string;
  event_title: string;
  event_category: string; // e.g. "Concert", "Conference", "Sports" — shown as the small uppercase label
  cover_image_url: string;
  ticket_count: number;
  is_vip: boolean; // shown as "(VIP)" suffix next to the ticket count
  event_date_label: string; // e.g. "Oct 24, 2026 • 8:00 PM"
  venue_label: string; // e.g. "Starlight Arena, NY"
  original_face_value: number; // the "Orig:" struck-through price
  resale_price_per_ticket: number; // current asking price
  is_verified: boolean; // drives the "Verified Resale" badge
}

// ─────────────────────────────────────────────────────────────────────────
// Event Discovery
// ─────────────────────────────────────────────────────────────────────────

export type EventListingBadge =
  | "on_sale"
  | "selling_fast"
  | "newly_added"
  | "sold_out";

export type EventListingTrustSignal =
  | "verified"
  | "identity_required"
  | "protection_enabled"
  | "sell_out_warning"
  | "none";

/**
 * A single card on the Event Discovery grid. Distinct from the full Event
 * type (used on the Event Detail page) since this is a lighter browsing-
 * surface summary — mirrors a dedicated Go list endpoint that wouldn't
 * return full ticket_categories/venue payloads for a grid view.
 */
export interface EventListingCard {
  event_id: string;
  title: string;
  category_label: string; // e.g. "Music • Konser"
  cover_image_url: string;
  badge: EventListingBadge;
  trust_signal: EventListingTrustSignal;
  date_label: string; // e.g. "30 September 2024 • 19:00 WIB"
  venue_label: string;
  starting_price: number;
  city: string; // used by the sidebar city filter
}

/** A card inside the "Direkomendasikan Untukmu (AI)" glassmorphism panel. */
export interface AIRecommendedEvent {
  event_id: string;
  cover_image_url: string;
  tag_label: string; // e.g. "Top Match", "Trending"
  match_pct: number;
  title: string;
  date_venue_label: string; // e.g. "20 Sep • Salihara Arts Center"
  price: number;
}

/** One slide in the "Editor's Choice" hero carousel. */
export interface FeaturedCarouselEvent {
  event_id: string;
  cover_image_url: string;
  tag_label: string; // e.g. "World Tour 2024"
  tag_color: "secondary" | "success";
  title: string;
  date_venue_label: string;
  starting_price: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Home Page (v2 — Indonesian redesign)
// ─────────────────────────────────────────────────────────────────────────

/** One tile in the "Koleksi Event Pilihan" bento grid. */
export interface BentoCollectionTile {
  tile_id: string;
  title: string;
  subtitle?: string; // omitted on the two smaller tiles in the original design
  cover_image_url: string;
  /** CSS grid span — matches the bento-grid's col-span-{n} row-span-{n} classes. */
  col_span: 1 | 2;
  row_span: 1 | 2;
  href: string;
}

/** One card in the "Event Paling Dinanti" trending grid, driven by real API data. */
export interface TrendingEventCard {
  event_id: string;
  title: string;
  cover_image_url: string;
  city: string;
  category: string;  // e.g. "concert", "festival", "conference" — drives the category filter pills
  starts_at: string; // ISO-8601 — displayed as a formatted date on the card
}