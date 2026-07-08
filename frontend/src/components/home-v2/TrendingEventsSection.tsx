/**
 * components/home-v2/TrendingEventsSection.tsx
 *
 * "Event Paling Dinanti" section: category filter pills (functional —
 * filters the grid below) + a responsive card grid. All data comes from
 * the real GET /api/events response — no mock values.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Calendar, ChevronRight } from "lucide-react";
import type { TrendingEventCard } from "@/types/ticket";
import { cn } from "@/lib/utils";

// Human-readable labels for the backend category strings from mapCategory().
const CATEGORY_LABELS: Record<string, string> = {
  All: "Semua",
  concert: "Konser",
  festival: "Festival",
  sport: "Olahraga",
  conference: "Konferensi",
  exhibition: "Pameran",
  community: "Komunitas",
  workshop_seminar: "Workshop",
  other: "Lainnya",
};

interface TrendingEventsSectionProps {
  events: TrendingEventCard[];
  categories: string[]; // e.g. ["All", "concert", "festival", ...]
}

export function TrendingEventsSection({
  events,
  categories,
}: TrendingEventsSectionProps) {
  const [active_category, set_active_category] = useState(categories[0]);

  const filtered_events =
    active_category === "All"
      ? events
      : events.filter((e) => e.category === active_category);

  return (
    <section className="bg-surface-container-low py-section-gap">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        {/* Header row */}
        <div className="mb-stack-lg flex items-end justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="mb-2 font-headline-lg text-headline-lg text-text-primary">
              Event Paling Dinanti
            </h2>

            {/* Category filter pills */}
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => set_active_category(cat)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-4 py-1.5 font-label-sm text-label-sm transition-colors",
                    active_category === cat
                      ? "bg-secondary text-on-secondary"
                      : "border border-border-subtle bg-white text-text-secondary hover:bg-surface-container-high"
                  )}
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/events"
            aria-label="Lihat semua event"
            className="ml-4 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-white shadow-sm transition-all hover:bg-surface-container-high sm:flex"
          >
            <ChevronRight size={20} />
          </Link>
        </div>

        {/* Event grid */}
        {filtered_events.length > 0 ? (
          <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {filtered_events.map((event) => (
              <Link
                key={event.event_id}
                href={`/events/${event.event_id}`}
                className="group cursor-pointer overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                {/* Cover image */}
                <div className="relative h-48 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.cover_image_url}
                    alt={event.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* City pill */}
                  <div className="absolute left-3 top-3 flex items-center gap-1 rounded-lg bg-white/90 px-3 py-1 backdrop-blur-sm">
                    <MapPin size={14} className="text-secondary" />
                    <span className="font-label-sm text-label-sm text-text-primary">
                      {event.city}
                    </span>
                  </div>
                  {/* Category badge */}
                  <div className="absolute right-3 top-3 rounded-full bg-secondary/90 px-2.5 py-0.5 backdrop-blur-sm">
                    <span className="font-label-sm text-label-sm text-white">
                      {CATEGORY_LABELS[event.category] ?? event.category}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4">
                  <h4 className="mb-3 line-clamp-2 font-headline-sm text-headline-sm text-text-primary transition-colors group-hover:text-secondary">
                    {event.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <Calendar size={14} className="shrink-0" />
                    <span className="font-body-sm text-body-sm">
                      {new Date(event.starts_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border-subtle bg-white py-16 text-center">
            <p className="font-body-md text-body-md text-text-secondary">
              Belum ada event untuk kategori ini.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}