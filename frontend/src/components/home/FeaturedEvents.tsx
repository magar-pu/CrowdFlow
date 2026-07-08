/**
 * components/home/FeaturedEvents.tsx
 *
 * Bento-style featured events grid: one large 2-col-span hero card +
 * two stacked side cards. Matches crowdflow_home Stitch markup.
 * Accepts snake_case Event[] data — designed to take mockEventList today
 * and a real GET /api/v1/events?featured=true response later.
 */

import Link from "next/link";
import { Flame, CalendarDays, MapPin, ArrowRight } from "lucide-react";
import type { Event } from "@/types/ticket";

interface FeaturedEventsProps {
  events: Event[];
}

function formatShortDate(iso_datetime: string): string {
  return new Date(iso_datetime).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function categoryLabel(category: string): string {
  return category
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function FeaturedEvents({ events }: FeaturedEventsProps) {
  const [main_event, side_event_1, side_event_2] = events;

  if (!main_event) return null;

  return (
    <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h2 className="mb-2 font-headline-lg text-headline-lg font-bold text-primary">
            Featured Events
          </h2>
          <p className="font-body-md text-body-md text-text-secondary">
            Curated premium experiences happening near you.
          </p>
        </div>
        <Link
          href="/events"
          className="hidden items-center gap-1 font-label-md text-label-md text-secondary hover:underline md:flex"
        >
          View All <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid h-auto grid-cols-1 gap-gutter md:h-[600px] md:grid-cols-3">
        {/* Main featured */}
        <Link
          href={`/events/${main_event.event_id}`}
          className="group relative h-[400px] overflow-hidden rounded-2xl border border-border-subtle bg-surface-white shadow-sm md:col-span-2 md:h-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={main_event.cover_image_url}
            alt={main_event.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {main_event.is_high_demand && (
            <div className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 font-label-sm text-label-sm text-primary backdrop-blur">
              <Flame size={14} className="text-danger" /> Selling Fast
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 p-8">
            <div className="flex items-end justify-between">
              <div className="space-y-2 text-white">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-white/80">
                  {categoryLabel(main_event.category)}
                </span>
                <h3 className="font-headline-lg text-headline-lg font-bold">
                  {main_event.title}
                </h3>
                <p className="flex items-center gap-2 font-body-md text-body-md text-white/90">
                  <CalendarDays size={18} /> {formatShortDate(main_event.starts_at)}
                  <MapPin size={18} className="ml-4" /> {main_event.venue.name}
                </p>
              </div>
              <div className="text-right">
                <p className="mb-1 font-label-sm text-label-sm text-white/80">
                  From
                </p>
                <p className="font-headline-md text-headline-md font-bold text-white">
                  Rp 850K
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* Side featured cards */}
        {[side_event_1, side_event_2].map(
          (event, index) =>
            event && (
              <Link
                key={event.event_id}
                href={`/events/${event.event_id}`}
                className={`group relative h-[300px] overflow-hidden rounded-2xl border border-border-subtle bg-surface-white shadow-sm md:h-auto ${
                  index === 1 ? "hidden md:block" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="space-y-1 text-white">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-white/80">
                      {categoryLabel(event.category)}
                    </span>
                    <h3 className="font-headline-sm text-headline-sm font-bold">
                      {event.title}
                    </h3>
                    <p className="flex items-center gap-1 font-body-sm text-body-sm text-white/90">
                      <MapPin size={16} /> {event.venue.city}
                    </p>
                  </div>
                </div>
              </Link>
            )
        )}
      </div>
    </section>
  );
}