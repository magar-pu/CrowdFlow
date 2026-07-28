/**
 * components/event-detail/EventHero.tsx
 *
 * Full-bleed hero banner for the event detail page: background image with
 * a bottom-to-top dark gradient, "Selling Fast" + category badges, title,
 * and a 3-column metadata grid (date/time, venue, starting price).
 * Matches event_detail_eras_tour_manila Stitch markup exactly.
 */

import { CalendarDays, MapPin, Tag, Flame } from "lucide-react";
import type { Event } from "@/types/ticket";

interface EventHeroProps {
  event: Event;
  /** Cheapest active ticket category face value, pre-computed by the page. */
  starting_price_label: string;
}

function categoryLabel(category: string): string {
  return category
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateRange(starts_at: string, ends_at: string): string {
  const start = new Date(starts_at);
  const end = new Date(ends_at);
  const date_label = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const start_time = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const end_time = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date_label} • ${start_time} - ${end_time}`;
}

export function EventHero({ event, starting_price_label }: EventHeroProps) {
  const [date_label, time_label] = formatDateRange(
    event.starts_at,
    event.ends_at
  ).split(" • ");

  return (
    <section className="group relative h-[500px] max-h-[700px] min-h-[500px] w-full overflow-hidden bg-primary md:h-[614px]">
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.cover_image_url}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-container-max flex-col justify-end px-margin-mobile pb-stack-lg text-on-primary md:px-margin-desktop md:pb-12">
        <div className="max-w-3xl">
          {/* Badges */}
          <div className="mb-4 flex flex-wrap gap-2">
            {/* Driven by real sales in the last 7 days, the same figure that
                ranks "Trending Now" on the homepage. It previously read
                is_high_demand, which the API never sends, so it never showed. */}
            {(event.recent_sales ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-on-primary/10 bg-on-primary/20 px-3 py-1 font-label-sm text-label-sm backdrop-blur-md">
                <Flame size={12} className="text-tertiary" />
                Selling Fast
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-surface-white/10 bg-surface-white/10 px-3 py-1 font-label-sm text-label-sm backdrop-blur-md">
              {categoryLabel(event.category)}
            </span>
          </div>

          {/* Title */}
          <h1 className="mb-4 font-headline-lg-mobile text-headline-lg-mobile font-bold leading-tight text-surface-white drop-shadow-lg md:font-headline-xl md:text-headline-xl">
            {event.title}
          </h1>

          {/* Metadata grid */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-8">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-lg bg-surface-white/10 p-2 backdrop-blur-sm">
                <CalendarDays size={20} className="text-surface-white" />
              </div>
              <div>
                <p className="mb-0.5 font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed-dim">
                  Date &amp; Time
                </p>
                <p className="font-body-md text-body-md font-medium text-surface-white">
                  {date_label}
                  <br />
                  {time_label}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-lg bg-surface-white/10 p-2 backdrop-blur-sm">
                <MapPin size={20} className="text-surface-white" />
              </div>
              <div>
                <p className="mb-0.5 font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed-dim">
                  Venue
                </p>
                <p className="font-body-md text-body-md font-medium text-surface-white">
                  {event.venue.name}
                  <br />
                  {event.venue.city}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-lg bg-surface-white/10 p-2 backdrop-blur-sm">
                <Tag size={20} className="text-surface-white" />
              </div>
              <div>
                <p className="mb-0.5 font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed-dim">
                  Starting From
                </p>
                <p className="font-headline-sm text-headline-sm font-bold text-surface-white">
                  {starting_price_label}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}