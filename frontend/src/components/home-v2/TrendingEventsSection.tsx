/**
 * components/home-v2/TrendingEventsSection.tsx
 *
 * "Event Paling Dinanti" section: country filter pills (functional —
 * filters the grid below) + a 4-column card grid with location pill,
 * star rating, and starting price. Matches the redesigned home Stitch
 * markup exactly.
 */

"use client";

import { useState } from "react";
import { MapPin, Star, ChevronRight } from "lucide-react";
import { formatIDR } from "@/lib/pricing";
import type { TrendingEventCard } from "@/types/ticket";
import { cn } from "@/lib/utils";

interface TrendingEventsSectionProps {
  events: TrendingEventCard[];
  countries: string[];
}

export function TrendingEventsSection({
  events,
  countries,
}: TrendingEventsSectionProps) {
  const [active_country, set_active_country] = useState(countries[0]);

  const filtered_events = events.filter(
    (event) => event.country === active_country
  );

  return (
    <section className="bg-surface-container-low py-section-gap">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="mb-stack-lg flex items-end justify-between">
          <div>
            <h2 className="mb-2 font-headline-lg text-headline-lg text-text-primary">
              Most Anticipated Events
            </h2>
            <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {countries.map((country) => (
                <button
                  key={country}
                  type="button"
                  onClick={() => set_active_country(country)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-4 py-1.5 font-label-sm text-label-sm transition-colors",
                    active_country === country
                      ? "bg-secondary text-on-secondary"
                      : "border border-border-subtle bg-white text-text-secondary hover:bg-surface-container-high"
                  )}
                >
                  {country}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            aria-label="More"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-white shadow-sm transition-all hover:bg-surface-container-high sm:flex"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {filtered_events.length > 0 ? (
          <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {filtered_events.map((event) => (
              <div
                key={event.event_id}
                className="group cursor-pointer overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm transition-all hover:shadow-md"
              >
                <div className="relative h-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.cover_image_url}
                    alt={event.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-3 top-3 flex items-center gap-1 rounded-lg bg-white/90 px-3 py-1 backdrop-blur-sm">
                    <MapPin size={14} className="text-secondary" />
                    <span className="font-label-sm text-label-sm text-text-primary">
                      {event.city}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="mb-2 line-clamp-2 font-headline-sm text-headline-sm text-text-primary transition-colors group-hover:text-secondary">
                    {event.title}
                  </h4>
                  <div className="mb-3 flex items-center gap-1">
                    <Star size={14} fill="#F59E0B" className="text-warning" />
                    <span className="font-label-sm text-label-sm text-text-primary">
                      {event.rating.toFixed(1)}/5
                    </span>
                    <span className="text-label-sm text-text-secondary">
                      (
                      {event.review_count >= 1000
                        ? `${(event.review_count / 1000).toFixed(1)}k`
                        : event.review_count}{" "}
                      reviews)
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border-subtle pt-3">
                    <span className="text-label-sm text-text-secondary">
                      Starting from
                    </span>
                    <span className="font-headline-sm text-headline-sm font-bold text-secondary">
                      {formatIDR(event.starting_price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border-subtle bg-white py-16 text-center">
            <p className="font-body-md text-body-md text-text-secondary">
              No events yet for {active_country}.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}