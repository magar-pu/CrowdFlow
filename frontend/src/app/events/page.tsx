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

import { useMemo, useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { EventSearchHero } from "@/components/event-discovery/EventSearchHero";
import { FeaturedCarousel } from "@/components/event-discovery/FeaturedCarousel";
import { CategoryIconsGrid } from "@/components/event-discovery/CategoryIconsGrid";
import { QuickFilterBar } from "@/components/event-discovery/QuickFilterBar";
import { FilterSidebar } from "@/components/event-discovery/FilterSidebar";
import { AIRecommendationsPanel } from "@/components/event-discovery/AIRecommendationsPanel";
import { EventListingCard } from "@/components/event-discovery/EventListingCard";
import { ResaleMarketplacePromo } from "@/components/event-discovery/ResaleMarketplacePromo";
import { EventDiscoveryFooter } from "@/components/event-discovery/EventDiscoveryFooter";
import { listEvents } from "@/lib/api/events";
import { EventListingCard as EventCardType, FeaturedCarouselEvent, AIRecommendedEvent } from "@/types/ticket";

const DEFAULT_MAX_PRICE = 5_000_000;

export default function EventsDiscoveryPage() {
  const [active_quick_filter, set_active_quick_filter] = useState("Semua");
  const [sort_by, set_sort_by] = useState("Paling Populer");
  const [selected_cities, set_selected_cities] = useState<string[]>(["Jakarta"]);
  const [max_price, set_max_price] = useState(DEFAULT_MAX_PRICE);
  const [availability, set_availability] = useState<"tersedia" | "terbatas">(
    "tersedia"
  );
  const [dbEvents, setDbEvents] = useState<EventCardType[]>([]);

  useEffect(() => {
    listEvents()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          const mapped: EventCardType[] = res.data.map((evt) => {
            const startsAtDate = new Date(evt.starts_at);
            const formattedDate = startsAtDate.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            return {
              event_id: String(evt.event_id),
              title: evt.title,
              category_label: "Music • Konser",
              cover_image_url: evt.cover_image_url || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop",
              badge: "on_sale",
              trust_signal: "verified",
              date_label: `${formattedDate} • ${startsAtDate.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })} WIB`,
              venue_label: evt.venue ? `${evt.venue.name}, ${evt.venue.city}` : "Lokasi Belum Ditentukan",
              starting_price: 150_000,
              city: evt.venue ? evt.venue.city : "Jakarta",
            };
          });
          setDbEvents(mapped);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch events from API:", err);
      });
  }, []);

  const displayEvents = dbEvents;

  const featuredEvents = useMemo<FeaturedCarouselEvent[]>(() => {
    return dbEvents.slice(0, 3).map((evt, idx) => ({
      event_id: evt.event_id,
      cover_image_url: evt.cover_image_url,
      tag_label: idx === 0 ? "Pilihan Editor" : "Trending",
      tag_color: idx % 2 === 0 ? "secondary" : "success",
      title: evt.title,
      date_venue_label: evt.date_label,
      starting_price: evt.starting_price,
    }));
  }, [dbEvents]);

  const aiRecommendedEvents = useMemo<AIRecommendedEvent[]>(() => {
    return dbEvents.slice(0, 2).map((evt, idx) => ({
      event_id: evt.event_id,
      cover_image_url: evt.cover_image_url,
      tag_label: idx === 0 ? "Top Match" : "Hot Deal",
      match_pct: idx === 0 ? 98 : 94,
      title: evt.title,
      date_venue_label: evt.date_label.split("•")[0].trim(),
      price: evt.starting_price,
    }));
  }, [dbEvents]);

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
    set_availability("tersedia");
    set_active_quick_filter("Semua");
  }

  const filtered_events = useMemo(() => {
    let events = displayEvents.filter(
      (event) => event.starting_price <= max_price
    );

    if (selected_cities.length > 0) {
      events = events.filter((event) => selected_cities.includes(event.city));
    }

    if (availability === "tersedia") {
      events = events.filter((event) => event.badge !== "sold_out");
    } else {
      events = events.filter(
        (event) => event.badge === "selling_fast" || event.badge === "sold_out"
      );
    }

    if (sort_by === "Harga Terendah") {
      events = [...events].sort((a, b) => a.starting_price - b.starting_price);
    } else if (sort_by === "Harga Tertinggi") {
      events = [...events].sort((a, b) => b.starting_price - a.starting_price);
    }

    return events;
  }, [displayEvents, selected_cities, max_price, availability, sort_by]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar active_href="/events" />

      <main>
        <EventSearchHero />
        {featuredEvents.length > 0 && <FeaturedCarousel events={featuredEvents} />}
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
                {aiRecommendedEvents.length > 0 && (
                  <AIRecommendationsPanel
                    recommendations={aiRecommendedEvents}
                  />
                )}

                {filtered_events.length > 0 ? (
                  <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
                    {filtered_events.map((event) => (
                      <EventListingCard key={event.event_id} event={event} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border-subtle py-16 text-center">
                    <p className="font-body-md text-body-md text-text-secondary">
                      Tidak ada event yang cocok dengan filter Anda.
                    </p>
                  </div>
                )}

                {filtered_events.length > 0 && (
                  <div className="mt-12 text-center">
                    <button
                      type="button"
                      className="rounded-full border-2 border-border-subtle px-12 py-4 font-bold text-text-primary transition-all hover:border-secondary hover:text-secondary"
                    >
                      Muat Lebih Banyak
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <ResaleMarketplacePromo />
      </main>

      <EventDiscoveryFooter />
    </div>
  );
}