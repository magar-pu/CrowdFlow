/**
 * mock/organizerData.ts
 *
 * Mock data for the CrowdFlow Organizer Dashboard, separate from the
 * customer-facing mock/eventData.ts since this represents a different API
 * surface (organizer-scoped endpoints, not public event browsing).
 */

import type { DashboardStats, OrganizerEvent } from "@/types/ticket";

export const mockDashboardStats: DashboardStats = {
  total_revenue: 124_500_00, // stored in IDR-equivalent cents-free integer for consistency with formatIDR
  total_revenue_change_pct: 14.5,
  revenue_sparkline: [65, 59, 80, 81, 56, 95, 120],
  tickets_sold: 8234,
  tickets_sold_change_pct: 5.2,
  tickets_sparkline: [20, 40, 30, 70, 50, 60, 80],
  avg_capacity_usage_pct: 87,
  avg_capacity_target_pct: 90,
  upcoming_events_count: 12,
};

export const mockOrganizerEvents: OrganizerEvent[] = [
  {
    event_id: "evt_8923",
    display_id: "#EVT-8923",
    title: "Neon Nights Festival 2024",
    cover_image_url:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=200&auto=format&fit=crop",
    date_range_label: "Oct 15 - 17, 2026",
    venue_name: "GBK Main Stadium",
    status: "on_sale",
    tickets_sold: 45200,
    tickets_total: 50000,
  },
  {
    event_id: "evt_8924",
    display_id: "#EVT-8924",
    title: "Tech Summit Asia",
    cover_image_url:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=200&auto=format&fit=crop",
    date_range_label: "Nov 02, 2026",
    venue_name: "ICE BSD, Hall 1-3",
    status: "almost_full",
    tickets_sold: 4850,
    tickets_total: 5000,
  },
  {
    event_id: "evt_8925",
    display_id: "#EVT-8925",
    title: "Indie Rock Showcase",
    cover_image_url:
      "https://images.unsplash.com/photo-1501386761578-8d997ce67049?q=80&w=200&auto=format&fit=crop",
    date_range_label: "Dec 12, 2026",
    venue_name: "Tennis Indoor Senayan",
    status: "draft",
    tickets_sold: 0,
    tickets_total: 2500,
  },
];