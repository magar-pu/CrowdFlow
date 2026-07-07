"use client";

/**
 * app/events/page.tsx
 *
 * Event Discovery page — search hero, featured carousel, category icons,
 * quick-filter bar, advanced filter sidebar, AI recommendations panel,
 * event grid, resale marketplace promo, footer. Matches the Stitch
 * events-discovery screen end-to-end.
 *
 * Filtering (city, price, availability, quick filter) runs client-side
 * against mockEventListingCards — swap for a real
 * GET /api/v1/events?city=...&max_price=...&... call once the Go
 * endpoint exists; the filter state shape here maps directly onto query
 * params.
 */

import { useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { EventSearchHero } from "@/components/event-discovery/EventSearchHero";
import { FeaturedCarousel } from "@/components/event-discovery/FeaturedCarousel";
import { CategoryIconsGrid } from "@/components/event-discovery/CategoryIconsGrid";
import { QuickFilterBar } from "@/components/event-discovery/QuickFilterBar";
import { FilterSidebar } from "@/components/event-discovery/FilterSidebar";
import { AIRecommendationsPanel } from "@/components/event-discovery/AIRecommendationsPanel";
import { EventListingCard } from "@/components/event-discovery/EventListingCard";
import { ResaleMarketplacePromo } from "@/components/event-discovery/ResaleMarketplacePromo";
import { HomeFooterV2 } from "@/components/home-v2/HomeFooterV2";
import {
  mockFeaturedCarousel,
  mockAIRecommendedEvents,
  mockEventListingCards,
} from "@/mock/eventDiscoveryData";

const DEFAULT_MAX_PRICE = 5_000_000;

export default function EventsDiscoveryPage() {
  const [active_quick_filter, set_active_quick_filter] = useState("All");
  const [sort_by, set_sort_by] = useState("Most Popular");
  const [selected_cities, set_selected_cities] = useState<string[]>(["Jakarta"]);
  const [max_price, set_max_price] = useState(DEFAULT_MAX_PRICE);
  const [availability, set_availability] = useState<"available" | "limited">(
    "available"
  );

  function handle_toggle_city(city: string) {
    set_selected_cities((cities) =>
      cities.includes(city)
        ? cities.filter((c) => c !== city)
        : [...cities, city]
    );
  }

  function handle_clear_filters() {
    set_selected_cities([]);
    set_max_price(DEFAULT_MAX_PRICE);
    set_availability("available");
    set_active_quick_filter("All");
  }

  const filtered_events = useMemo(() => {
    let events = mockEventListingCards.filter(
      (event) => event.starting_price <= max_price
    );

    if (selected_cities.length > 0) {
      events = events.filter((event) => selected_cities.includes(event.city));
    }

    if (availability === "available") {
      events = events.filter((event) => event.badge !== "sold_out");
    } else {
      events = events.filter(
        (event) => event.badge === "selling_fast" || event.badge === "sold_out"
      );
    }

    if (sort_by === "Lowest Price") {
      events = [...events].sort((a, b) => a.starting_price - b.starting_price);
    } else if (sort_by === "Highest Price") {
      events = [...events].sort((a, b) => b.starting_price - a.starting_price);
    }

    return events;
  }, [selected_cities, max_price, availability, sort_by]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar active_href="/events" />

      <main>
        <EventSearchHero />
        <FeaturedCarousel events={mockFeaturedCarousel} />
        <CategoryIconsGrid />

        <section className="bg-background px-margin-mobile py-section-gap md:px-margin-desktop">
          <div className="mx-auto max-w-container-max">
            <div className="mb-10 flex flex-col gap-6">
              <QuickFilterBar
                active_filter={active_quick_filter}
                on_filter_change={set_active_quick_filter}
                sort_by={sort_by}
                on_sort_change={set_sort_by}
              />
            </div>

            <div className="flex flex-col gap-gutter lg:flex-row">
              <FilterSidebar
                selected_cities={selected_cities}
                on_toggle_city={handle_toggle_city}
                max_price={max_price}
                on_max_price_change={set_max_price}
                availability={availability}
                on_availability_change={set_availability}
                on_clear_filters={handle_clear_filters}
              />

              <div className="flex-1">
                <AIRecommendationsPanel
                  recommendations={mockAIRecommendedEvents}
                />

                {filtered_events.length > 0 ? (
                  <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
                    {filtered_events.map((event) => (
                      <EventListingCard key={event.event_id} event={event} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border-subtle py-16 text-center">
                    <p className="font-body-md text-body-md text-text-secondary">
                      No events match your filter.
                    </p>
                  </div>
                )}

                {filtered_events.length > 0 && (
                  <div className="mt-12 text-center">
                    <button
                      type="button"
                      className="rounded-full border-2 border-border-subtle px-12 py-4 font-bold text-text-primary transition-all hover:border-secondary hover:text-secondary"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <ResaleMarketplacePromo />
      </main>

      <HomeFooterV2 />
    </div>
  );
}