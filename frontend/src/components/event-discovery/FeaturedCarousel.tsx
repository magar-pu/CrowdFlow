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
            <span className="mb-2 block font-label-md text-label-md uppercase tracking-widest text-secondary font-bold">
              Featured Events
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
          {events.map((event) => {
            const cleanDate = (event.date_venue_label || "")
              .replace(/\s*•\s*\d{1,2}:\d{2}(\s*WIB)?/gi, "")
              .trim();

            return (
              <div
                key={event.event_id}
                className="min-w-[85%] snap-start sm:min-w-[70%] md:min-w-[60%] lg:min-w-[800px]"
              >
                <div className="group relative min-h-[220px] aspect-[16/10] sm:aspect-[21/9] overflow-hidden rounded-2xl shadow-xl">
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-primary/95 via-primary/40 to-transparent" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.cover_image_url}
                    alt={event.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-4 sm:p-6 md:p-10">
                    <div className="max-w-xl pr-2">
                      <h3 className="mb-1.5 font-display text-lg sm:text-2xl md:text-3xl font-bold text-white leading-tight line-clamp-2">
                        {event.title}
                      </h3>
                      <p className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white/90 truncate">
                        <CalendarDays size={16} className="shrink-0 text-white/80" />
                        <span>{cleanDate}</span>
                      </p>
                    </div>
                    <div className="hidden flex-col items-end gap-3 sm:flex shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] sm:text-xs uppercase tracking-wider text-white/70">
                          Starting From
                        </p>
                        <p className="font-bold text-base sm:text-xl text-white">
                          {event.starting_price === null
                            ? "—"
                            : formatIDR(event.starting_price)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-full bg-white px-6 py-2.5 text-xs sm:text-sm font-bold text-primary shadow-lg transition-all hover:bg-secondary hover:text-white active:scale-95 cursor-pointer"
                      >
                        Buy Ticket
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}