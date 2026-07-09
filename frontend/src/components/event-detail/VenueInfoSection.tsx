/**
 * components/event-detail/VenueInfoSection.tsx
 *
 * Expanded Venue Information sesuai Stitch event_detail_expanded_venue_info:
 * - Venue overview (name, type, capacity)
 * - Stats grid (seating, entrances, exits, parking)
 * - Accessibility info
 * - Venue Layout Preview dengan "View Full Venue Layout" CTA
 * - Venue Maps & Navigation (transport guide + nearby facilities)
 */

import Link from "next/link";
import {
  Map,
  ArrowRight,
  Users,
  DoorOpen,
  LogOut,
  Car,
  Accessibility,
  ArrowUpDown,
  Armchair,
  Train,
  Bus,
  Navigation,
} from "lucide-react";
import type { Venue } from "@/types/ticket";

interface VenueInfoSectionProps {
  venue: Venue;
  event_id: string;
}

const TRANSPORT_GUIDE = [
  {
    icon: Car,
    label: "By Car",
    desc: "Take the inner ring road exit toward Senayan. Follow signs for Main Gate (Pintu Utama) entrance.",
  },
  {
    icon: Train,
    label: "By Train (MRT/KRL)",
    desc: "Senayan Station (MRT South-North Line) — 5 min walk from Exit 4 toward GBK.",
  },
  {
    icon: Bus,
    label: "By Bus (TransJakarta)",
    desc: "Routes 1A, 1B, and 9H stop directly in front of the Main Gate plaza.",
  },
  {
    icon: Navigation,
    label: "By Ride-Hailing",
    desc: "Designated drop-off/pick-up point at Pintu 1 Senayan, Zone C (opposite the main gate).",
  },
];

const NEARBY_FACILITIES = [
  { label: "Hotels", distance: "0.3 – 2km", icon: "🏨" },
  { label: "Dining", distance: "0.1 – 1km", icon: "🍽️" },
  { label: "ATM", distance: "Within Plaza", icon: "🏧" },
  { label: "Hospital", distance: "1.2km", icon: "🏥" },
  { label: "Gas Station", distance: "0.8km", icon: "⛽" },
];

export function VenueInfoSection({ venue, event_id }: VenueInfoSectionProps) {
  const maps_query = encodeURIComponent(`${venue.name}, ${venue.address}`);

  return (
    <section className="space-y-6">
      {/* ── Venue Information Card ── */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-sm md:p-8">
        <h2 className="mb-6 flex items-center gap-3 font-headline-md text-headline-md font-bold text-primary">
          <Map size={24} className="text-secondary" />
          Venue Information
        </h2>

        {/* Overview grid */}
        <div className="mb-6 rounded-xl border border-border-subtle bg-surface-container-low p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
                Venue Overview
              </p>
              <p className="mt-1 font-label-md text-label-md font-bold text-text-primary">
                {venue.name}
              </p>
              <p className="font-body-sm text-body-sm text-text-secondary">{venue.address}</p>
            </div>
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">Type</p>
              <p className="mt-1 font-label-md text-label-md font-bold text-text-primary">
                Indoor Stadium
              </p>
            </div>
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
                Max Capacity
              </p>
              <p className="mt-1 font-label-md text-label-md font-bold text-text-primary">
                {venue.total_capacity.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: Armchair, label: "Seating Capacity", value: venue.total_capacity.toLocaleString("id-ID") },
            { icon: DoorOpen, label: "Entrances", value: "12" },
            { icon: LogOut, label: "Exits", value: "12" },
            { icon: Car, label: "Parking Capacity", value: "5,000" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex flex-col items-center rounded-xl border border-border-subtle bg-white p-4 text-center shadow-sm">
                <Icon size={20} className="mb-2 text-secondary" />
                <p className="font-label-sm text-label-sm text-text-secondary">{stat.label}</p>
                <p className="font-headline-sm text-headline-sm font-bold text-text-primary">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Accessibility */}
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 font-label-md text-label-md font-bold text-text-primary">
            <Accessibility size={18} className="text-secondary" />
            Accessibility Information
          </h3>
          <div className="flex flex-wrap gap-2">
            {["Wheelchair Access", "Elevator", "Priority Seating"].map((item) => (
              <span
                key={item}
                className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-container-low px-3 py-1.5 font-label-sm text-label-sm text-text-primary"
              >
                {item === "Elevator" ? <ArrowUpDown size={14} /> : <Accessibility size={14} />}
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Venue Layout Preview */}
        <div>
          <h3 className="mb-3 font-label-md text-label-md font-bold text-text-primary">
            Venue Layout Preview
          </h3>
          <div className="group relative overflow-hidden rounded-xl border border-border-subtle bg-[#0F172A]" style={{ height: 220 }}>
            {/* Dark arena preview SVG */}
            <svg viewBox="0 0 600 220" className="h-full w-full opacity-80">
              <rect width="600" height="220" fill="#0F172A" />
              <ellipse cx="300" cy="130" rx="260" ry="100" fill="none" stroke="#1E40AF" strokeWidth="2" opacity="0.5" />
              <ellipse cx="300" cy="125" rx="220" ry="82" fill="#1E293B" stroke="#2563EB" strokeWidth="1.5" opacity="0.6" />
              <ellipse cx="300" cy="118" rx="170" ry="62" fill="#172554" stroke="#3B82F6" strokeWidth="1" opacity="0.5" />
              <rect x="240" y="45" width="120" height="38" rx="4" fill="#1D4ED8" opacity="0.8" />
              <text x="300" y="68" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" letterSpacing="3">STAGE</text>
              {/* Dots representing seats */}
              {Array.from({ length: 80 }, (_, i) => {
                const angle = (i / 80) * Math.PI;
                const r = 155 + (i % 3) * 22;
                const cx = 300 + r * Math.cos(angle - Math.PI / 2) * 1.6;
                const cy = 118 + r * Math.sin(angle - Math.PI / 2) * 0.65;
                return <circle key={i} cx={cx} cy={cy} r="2.5" fill="#60A5FA" opacity="0.6" />;
              })}
              {/* Legend */}
              {[
                { color: "#3B82F6", label: "Stage" },
                { color: "#6D28D9", label: "VIP" },
                { color: "#1D4ED8", label: "Premium" },
                { color: "#065F46", label: "GA" },
                { color: "#92400E", label: "Restroom" },
                { color: "#DC2626", label: "Emergency Exit" },
              ].map((item, i) => (
                <g key={item.label} transform={`translate(${390}, ${30 + i * 22})`}>
                  <rect width="10" height="10" rx="2" fill={item.color} />
                  <text x="15" y="9" fill="#94A3B8" fontSize="9">{item.label}</text>
                </g>
              ))}
            </svg>

            {/* CTA overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <Link
                href={`/events/${event_id}/venue`}
                className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/20 px-5 py-2.5 font-label-md text-label-md text-white backdrop-blur-sm transition-all hover:bg-white/30"
              >
                <Map size={16} />
                View Full Venue Layout
              </Link>
            </div>

            {/* Always visible button */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <Link
                href={`/events/${event_id}/venue`}
                className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/40 px-5 py-2.5 font-label-md text-label-md text-white backdrop-blur-sm transition-all hover:bg-black/60"
              >
                <Map size={16} />
                View Full Venue Layout
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Venue Maps & Navigation Card ── */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-sm md:p-8">
        <h2 className="mb-6 flex items-center gap-3 font-headline-md text-headline-md font-bold text-primary">
          <Navigation size={24} className="text-secondary" />
          Venue Maps &amp; Navigation
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Mini map */}
          <div className="relative overflow-hidden rounded-xl border border-border-subtle bg-surface-container-low" style={{ minHeight: 180 }}>
            <div className="flex h-full min-h-[180px] items-center justify-center bg-[#E8EDF2]">
              <div className="flex flex-col items-center gap-2 text-text-secondary">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20">
                  <Map size={24} className="text-secondary" />
                </div>
                <p className="font-body-sm text-body-sm">{venue.name}</p>
                <p className="font-label-sm text-label-sm text-text-secondary">{venue.city}</p>
              </div>
            </div>
            {/* Map action buttons */}
            <div className="absolute bottom-3 left-3 flex gap-2">
              {["Google Maps", "Waze", "Copy Address", "Share"].map((action) => (
                <button
                  key={action}
                  type="button"
                  className="flex flex-col items-center gap-0.5 rounded-lg border border-border-subtle bg-white px-2 py-1.5 shadow-sm transition-colors hover:bg-surface-container-low"
                >
                  <span className="font-label-sm text-label-sm text-text-primary" style={{ fontSize: 9 }}>{action}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Transportation guide */}
          <div className="space-y-3">
            <h3 className="font-label-md text-label-md font-bold text-text-primary">Transportation Guide</h3>
            {TRANSPORT_GUIDE.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                    <Icon size={16} className="text-secondary" />
                  </div>
                  <div>
                    <p className="font-label-sm text-label-sm font-bold text-text-primary">{item.label}</p>
                    <p className="font-body-sm text-body-sm text-text-secondary">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nearby facilities */}
        <div className="mt-6">
          <h3 className="mb-3 font-label-md text-label-md font-bold text-text-primary">Nearby Facilities</h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {NEARBY_FACILITIES.map((fac) => (
              <div key={fac.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-border-subtle bg-surface-container-low p-3 text-center">
                <span className="text-2xl">{fac.icon}</span>
                <p className="font-label-sm text-label-sm font-bold text-text-primary">{fac.label}</p>
                <p className="font-label-sm text-label-sm text-text-secondary" style={{ fontSize: 10 }}>{fac.distance}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}