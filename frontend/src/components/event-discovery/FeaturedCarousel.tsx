/**
 * components/event-discovery/FeaturedCarousel.tsx
 *
 * "Editor's Choice" horizontal-scroll carousel with snap points and
 * prev/next nav buttons that scroll the container programmatically.
 * Matches Stitch markup exactly (21:9 aspect cards, bottom gradient
 * overlay, tag pill + title + date/venue + price + Buy Ticket CTA).
 */

"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { formatIDR } from "@/lib/pricing";
import type { FeaturedCarouselEvent } from "@/types/ticket";

interface FeaturedCarouselProps {
  events: FeaturedCarouselEvent[];
}

const TAG_COLOR_CLASS: Record<FeaturedCarouselEvent["tag_color"], string> = {
  secondary: "bg-secondary",
  success: "bg-success",
};

export function FeaturedCarousel({ events }: FeaturedCarouselProps) {
  const scroll_ref = useRef<HTMLDivElement>(null);

  function scroll_by(direction: 1 | -1) {
    scroll_ref.current?.scrollBy({
      left: direction * scroll_ref.current.clientWidth * 0.9,
      behavior: "smooth",
    });
  }

  return (
    <section className="overflow-hidden py-section-gap">
      <div className="mx-auto max-w-7xl w-full px-margin-mobile md:px-margin-desktop">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="mb-2 block font-label-md text-label-md uppercase tracking-widest text-secondary">
              Editor&apos;s Choice
            </span>
            <h2 className="font-headline-lg text-headline-lg text-text-primary">
              Most Popular Events This Week
            </h2>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scroll_by(-1)}
              aria-label="Previous"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle shadow-sm transition-all hover:bg-surface-white active:scale-90"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => scroll_by(1)}
              aria-label="Next"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle shadow-sm transition-all hover:bg-surface-white active:scale-90"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div
          ref={scroll_ref}
          className="flex snap-x snap-mandatory gap-gutter overflow-x-auto pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {events.map((event) => (
            <div
              key={event.event_id}
              className="min-w-[80%] snap-start md:min-w-[60%] lg:min-w-[800px]"
            >
              <div className="group relative aspect-[21/9] overflow-hidden rounded-xl shadow-xl">
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-6 md:p-10">
                  <div className="max-w-xl">
                    <span
                      className={`mb-4 inline-block rounded-full px-3 py-1 font-label-sm text-label-sm text-white ${TAG_COLOR_CLASS[event.tag_color]}`}
                    >
                      {event.tag_label}
                    </span>
                    <h3 className="mb-2 font-headline-xl text-headline-xl text-white">
                      {event.title}
                    </h3>
                    <p className="flex items-center gap-2 font-body-lg text-body-lg text-white/80">
                      <CalendarDays size={20} />
                      {event.date_venue_label}
                    </p>
                  </div>
                  <div className="hidden flex-col items-end gap-4 sm:flex">
                    <div className="text-right">
                      <p className="text-label-sm uppercase tracking-wider text-white/60">
                        Starting From
                      </p>
                      <p className="font-headline-md text-headline-md text-white">
                        {event.starting_price === null
                          ? "—"
                          : formatIDR(event.starting_price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-full bg-white px-8 py-3 font-label-md text-label-md text-primary shadow-lg transition-all hover:bg-secondary hover:text-white active:scale-95"
                    >
                      Buy Ticket
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}