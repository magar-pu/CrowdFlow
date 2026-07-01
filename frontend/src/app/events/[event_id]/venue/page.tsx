/**
 * app/events/[event_id]/venue/page.tsx
 *
 * Venue Layout & Navigation page sesuai Stitch design:
 * - Hero banner venue
 * - Interactive Venue Layout (2D/3D toggle + layer toggles + SVG map)
 * - Area Surroundings
 * - Transportation (Driving, Public Transport, Ride-Hailing)
 * - Venue Facilities
 * - Safety & Emergency
 * - Venue Gallery
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Navigation,
  Download,
  Layers,
  Plus,
  Minus,
  Maximize2,
  Users,
  Car,
  Train,
  Bus,
  Bike,
  Wifi,
  Info,
  ShieldAlert,
  Phone,
  Image,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { HomeFooterV2 } from "@/components/home-v2/HomeFooterV2";
import { mockEvent } from "@/mock/eventData";
import { cn } from "@/lib/utils";

// ── Layer toggles ──────────────────────────────────────────────────────────

const LAYERS = [
  { id: "seating", label: "Seating", checked: true },
  { id: "vip", label: "VIP Areas", checked: true },
  { id: "food", label: "Food Court", checked: false },
  { id: "restrooms", label: "Restrooms", checked: false },
  { id: "medical", label: "Medical Center", checked: false },
];

const LEGEND_ITEMS = [
  { color: "#1D4ED8", label: "Premium Seating (Tier 1)" },
  { color: "#3B82F6", label: "Standard Seating (Tier 2)" },
  { color: "#6B7280", label: "General Admission" },
  { color: "#F59E0B", label: "VIP Lounges" },
];

// ── Transport ──────────────────────────────────────────────────────────────

const TRANSPORT = [
  {
    icon: Car,
    title: "Driving",
    points: [
      "Recommended: Take the Semanggi Expressway and exit at Senayan for direct access.",
      "Parking notes: Advance booking is required for the Arena lot. Rates start at Rp 25.000.",
    ],
  },
  {
    icon: Train,
    title: "Public Transport",
    points: [
      "Train: MRT Senayan Station (5-min walk). Lines A, B, and C.",
      "Bus: TransJakarta route 1A stops directly in front of Main Plaza.",
      "MRT: Station Senayan (Exit 2). Frequent shuttles available.",
    ],
  },
  {
    icon: Bike,
    title: "Ride-Hailing",
    points: [
      "Drop-off: West Lobby entrance (Follow signage for Uber/GoRide VIP).",
      "Pick-up: Dedicated zones at South Plaza after the show ends.",
    ],
  },
];

// ── Facilities ─────────────────────────────────────────────────────────────

const FACILITIES = [
  { icon: "🚻", label: "Restrooms" },
  { icon: "🕌", label: "Prayer Room" },
  { icon: "🏥", label: "Medical Center" },
  { icon: "🍽️", label: "Food Court" },
  { icon: "🔋", label: "Charging" },
  { icon: "ℹ️", label: "Info Center" },
];

// ── Gallery mock ───────────────────────────────────────────────────────────

const GALLERY = [
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=600&auto=format&fit=crop",
];

// ── Interactive SVG Map ────────────────────────────────────────────────────

function VenueLayoutMap({ active_zone }: { active_zone: string | null }) {
  return (
    <svg viewBox="0 0 560 400" className="h-full w-full">
      <rect width="560" height="400" fill="#0B1120" />
      {/* Outer ring */}
      <ellipse cx="280" cy="220" rx="250" ry="185" fill="#111827" stroke="#1E3A5F" strokeWidth="2" />
      <ellipse cx="280" cy="215" rx="220" ry="160" fill="#0F172A" stroke="#1D4ED8" strokeWidth="1.5" opacity="0.7" />
      {/* Tier 1 — Premium */}
      <ellipse cx="280" cy="210" rx="185" ry="130" fill="none" stroke="#1D4ED8" strokeWidth="12" strokeOpacity="0.5" />
      {/* Tier 2 — Standard */}
      <ellipse cx="280" cy="210" rx="155" ry="108" fill="none" stroke="#3B82F6" strokeWidth="10" strokeOpacity="0.4" />
      {/* GA floor */}
      <ellipse cx="280" cy="215" rx="120" ry="82" fill="#172554" stroke="#2563EB" strokeWidth="1" opacity="0.6" />
      {/* Stage */}
      <rect x="218" y="72" width="124" height="48" rx="6" fill="#1D4ED8" />
      <text x="280" y="100" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" letterSpacing="3">
        STAGE
      </text>
      {/* Stage lights */}
      {[240, 262, 280, 298, 320].map((x, i) => (
        <ellipse key={i} cx={x} cy="125" rx="5" ry="3" fill="#93C5FD" opacity="0.8" />
      ))}
      {/* Zone B2 tooltip area */}
      {active_zone === "b2" && (
        <g>
          <rect x="150" y="155" width="130" height="75" rx="8" fill="white" />
          <text x="215" y="178" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0F172A">Zone B2</text>
          <text x="215" y="194" textAnchor="middle" fontSize="9" fill="#64748B">Premium Center View</text>
          <text x="215" y="208" textAnchor="middle" fontSize="9" fill="#64748B">Access via Gates 4 &amp; 5</text>
          <rect x="165" y="218" width="100" height="22" rx="4" fill="#0F172A" />
          <text x="215" y="233" textAnchor="middle" fontSize="9" fill="white">View Tickets</text>
        </g>
      )}
      {/* Seat dots */}
      {Array.from({ length: 120 }, (_, i) => {
        const angle = (i / 120) * 2 * Math.PI;
        const r = 100 + (i % 4) * 26;
        const cx = 280 + r * Math.cos(angle) * 1.42;
        const cy = 210 + r * Math.sin(angle) * 0.83;
        if (cy < 78 || cy > 385 || cx < 20 || cx > 540) return null;
        return (
          <circle key={i} cx={cx} cy={cy} r="3"
            fill={i % 4 === 0 ? "#F59E0B" : i % 4 === 1 ? "#1D4ED8" : "#3B82F6"}
            opacity="0.7" />
        );
      })}
      {/* Entry gates */}
      {[
        { x: 48, y: 220, label: "Gate A" },
        { x: 512, y: 220, label: "Gate B" },
        { x: 280, y: 368, label: "Gate C" },
      ].map((g) => (
        <g key={g.label}>
          <circle cx={g.x} cy={g.y} r="12" fill="#22C55E" opacity="0.9" />
          <text x={g.x} y={g.y + 4} textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">
            {g.label.split(" ")[1]}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function VenueLayoutPage() {
  const event = mockEvent;
  const venue = event.venue;

  const [layers, set_layers] = useState<Record<string, boolean>>(
    Object.fromEntries(LAYERS.map((l) => [l.id, l.checked]))
  );
  const [view_mode, set_view_mode] = useState<"2d" | "3d">("2d");
  const [active_zone, set_active_zone] = useState<string | null>("b2");
  const [zoom, set_zoom] = useState(1);

  function toggle_layer(id: string) {
    set_layers((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar active_href="/events" is_authenticated={false} />

      {/* ── Hero ── */}
      <section className="relative h-56 w-full overflow-hidden md:h-72">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1600&auto=format&fit=crop"
          alt={venue.name}
          className="h-full w-full object-cover brightness-50"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <p className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-white/60">
            Venue Layout &amp; Navigation
          </p>
          <h1 className="mb-3 font-headline-lg text-headline-lg font-bold text-white md:text-[40px] md:leading-[48px]">
            {venue.name}
          </h1>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-label-sm text-label-sm text-white backdrop-blur-sm">
              <MapPin size={12} />
              {event.title}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-label-sm text-label-sm text-white backdrop-blur-sm">
              <Users size={12} />
              {venue.capacity.toLocaleString("id-ID")} Capacity
            </span>
          </div>
          <div className="flex gap-3">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/15 px-4 py-2 font-label-md text-label-md text-white backdrop-blur-sm transition-all hover:bg-white/25"
            >
              <Navigation size={16} />
              Get Directions
            </a>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/15 px-4 py-2 font-label-md text-label-md text-white backdrop-blur-sm transition-all hover:bg-white/25"
            >
              <Download size={16} />
              Download Venue Guide
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-container-max px-margin-mobile py-10 md:px-margin-desktop">

        {/* ── Interactive Venue Layout ── */}
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-headline-md text-headline-md font-bold text-text-primary">
                Interactive Venue Layout
              </h2>
              <p className="font-body-sm text-body-sm text-text-secondary">
                Explore the arena facilities and find your seat
              </p>
            </div>
            {/* 2D / 3D toggle */}
            <div className="flex overflow-hidden rounded-lg border border-border-subtle">
              {(["2d", "3d"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => set_view_mode(mode)}
                  className={cn(
                    "px-4 py-2 font-label-md text-label-md transition-colors",
                    view_mode === mode
                      ? "bg-primary text-white"
                      : "bg-white text-text-secondary hover:bg-surface-container-low"
                  )}
                >
                  {mode.toUpperCase()} {mode === "2d" ? "Floor Plan" : "View"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
            {/* Layer toggles + legend */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
                <p className="mb-3 font-label-md text-label-md font-bold uppercase tracking-wider text-text-secondary">
                  Layer Toggles
                </p>
                <div className="space-y-3">
                  {LAYERS.map((layer) => (
                    <label key={layer.id} className="flex cursor-pointer items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Layers size={16} className="text-text-secondary" />
                        <span className="font-body-sm text-body-sm text-text-primary">{layer.label}</span>
                      </div>
                      <div
                        onClick={() => toggle_layer(layer.id)}
                        className={cn(
                          "relative h-5 w-9 rounded-full transition-colors",
                          layers[layer.id] ? "bg-secondary" : "bg-border-subtle"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                          layers[layer.id] ? "translate-x-4" : "translate-x-0.5"
                        )} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
                <p className="mb-3 font-label-sm text-label-sm font-bold uppercase tracking-wider text-text-secondary">
                  Legend
                </p>
                <div className="space-y-2.5">
                  {LEGEND_ITEMS.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="font-body-sm text-body-sm text-text-primary">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Map canvas */}
            <div className="relative overflow-hidden rounded-xl border border-border-subtle bg-[#0B1120] shadow-sm"
              style={{ minHeight: 400 }}>
              <div
                style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 0.2s" }}
                className="h-full w-full"
              >
                <VenueLayoutMap active_zone={active_zone} />
              </div>

              {/* Map controls */}
              <div className="absolute right-4 top-4 flex flex-col gap-2">
                <button type="button" onClick={() => set_zoom((z) => Math.min(z + 0.2, 2.5))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20">
                  <Plus size={16} />
                </button>
                <button type="button" onClick={() => set_zoom((z) => Math.max(z - 0.2, 0.6))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20">
                  <Minus size={16} />
                </button>
                <button type="button" onClick={() => set_zoom(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20">
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Transportation ── */}
        <section className="mb-12">
          <h2 className="mb-6 font-headline-md text-headline-md font-bold text-text-primary">
            Getting There
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {TRANSPORT.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
                      <Icon size={20} className="text-secondary" />
                    </div>
                    <h3 className="font-label-md text-label-md font-bold text-text-primary">{item.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {item.points.map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                        <span className="font-body-sm text-body-sm text-text-secondary">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Venue Facilities ── */}
        <section className="mb-12">
          <h2 className="mb-6 font-headline-md text-headline-md font-bold text-text-primary">
            Venue Facilities
          </h2>
          <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
            {FACILITIES.map((fac) => (
              <div key={fac.label}
                className="flex flex-col items-center gap-2 rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
                <span className="text-3xl">{fac.icon}</span>
                <span className="text-center font-label-sm text-label-sm text-text-primary">{fac.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Safety & Emergency ── */}
        <section className="mb-12">
          <div className="overflow-hidden rounded-2xl bg-primary text-white">
            <div className="grid grid-cols-1 gap-0 md:grid-cols-3">
              {/* Left */}
              <div className="border-b border-white/10 p-6 md:border-b-0 md:border-r">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldAlert size={20} />
                  <h2 className="font-headline-sm text-headline-sm font-bold">Safety &amp; Emergency</h2>
                </div>
                <p className="mb-4 font-body-sm text-body-sm text-white/70">
                  Your safety is our top priority. Please familiarise yourself with the emergency procedures.
                </p>
                <div className="rounded-lg border border-white/20 bg-white/10 p-3">
                  <p className="font-label-sm text-label-sm text-white/60">Emergency Hotline</p>
                  <div className="mt-1 flex items-center gap-2 font-headline-sm text-headline-sm font-bold">
                    <Phone size={16} />
                    +62 (800) 555-0911
                  </div>
                </div>
              </div>
              {/* Middle */}
              <div className="border-b border-white/10 p-6 md:border-b-0 md:border-r">
                <h3 className="mb-3 flex items-center gap-2 font-label-md text-label-md font-bold">
                  🚪 Emergency Exits
                </h3>
                <ul className="space-y-2">
                  {[
                    "Exit A: Main North Plaza (Level 1)",
                    "Exit B: East Parking Wing (Level 1 & 2)",
                    "Exit C: West Transit Hub Corridor",
                  ].map((exit) => (
                    <li key={exit} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
                      <span className="font-body-sm text-body-sm text-white/80">{exit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Right */}
              <div className="p-6">
                <h3 className="mb-3 flex items-center gap-2 font-label-md text-label-md font-bold">
                  🏥 Medical Stations
                </h3>
                <ul className="space-y-2">
                  {[
                    "Station 1: Behind Section 102 (Main Floor)",
                    "Station 2: Concourse Level 3 (South Side)",
                    "Station 3: VIP Lounge Entrance (East)",
                  ].map((station) => (
                    <li key={station} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
                      <span className="font-body-sm text-body-sm text-white/80">{station}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Venue Gallery ── */}
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-headline-md text-headline-md font-bold text-text-primary">Venue Gallery</h2>
              <p className="font-body-sm text-body-sm text-text-secondary">
                Get a preview of the {venue.name} experience
              </p>
            </div>
            <button type="button" className="flex items-center gap-1 font-label-md text-label-md text-secondary hover:underline">
              View All Photos <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {GALLERY.map((url, i) => (
              <div key={i} className="group relative aspect-video overflow-hidden rounded-xl border border-border-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Venue photo ${i + 1}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
            ))}
          </div>
        </section>

        {/* Back link */}
        <div className="text-center">
          <Link
            href={`/events/${event.event_id}`}
            className="inline-flex items-center gap-2 font-label-md text-label-md text-secondary hover:underline"
          >
            ← Back to Event Details
          </Link>
        </div>
      </main>

      <HomeFooterV2 />
    </div>
  );
}