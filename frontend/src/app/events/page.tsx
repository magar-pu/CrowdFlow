"use client";

/**
 * app/events/page.tsx
 *
 * Event Discovery page — search hero, featured carousel, category icons,
 * quick-filter bar, advanced filter sidebar, event grid, resale marketplace
 * promo, footer.
 *
 * Events come from GET /api/v1/events with no mock fallback: an empty
 * response renders the empty state. Filtering (city, price, availability,
 * quick filter, keyword search, date) runs client-side.
 *
 * Accepts query params from the home SearchBar:
 *   ?q=keyword&location=Jakarta&date=2026-09-15
 */

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { EventSearchHero } from "@/components/event-discovery/EventSearchHero";
import { FeaturedCarousel } from "@/components/event-discovery/FeaturedCarousel";
import { CategoryIconsGrid } from "@/components/event-discovery/CategoryIconsGrid";
import { QuickFilterBar } from "@/components/event-discovery/QuickFilterBar";
import { FilterSidebar } from "@/components/event-discovery/FilterSidebar";
import { EventListingCard } from "@/components/event-discovery/EventListingCard";
import { ResaleMarketplacePromo } from "@/components/event-discovery/ResaleMarketplacePromo";
import { HomeFooterV3 } from "@/components/home-v3/HomeFooterV3";
import { EventDiscoveryFooter } from "@/components/event-discovery/EventDiscoveryFooter";
import { listEvents } from "@/lib/api/events";
import { EventListingCard as EventCardType, FeaturedCarouselEvent } from "@/types/ticket";

const DEFAULT_MAX_PRICE = 5_000_000;

export default function EventsDiscoveryPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-lg text-text-secondary">Memuat...</div></div>}>
      <EventsDiscoveryContent />
    </Suspense>
  );
}

function EventsDiscoveryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Hero search state — initialised from URL query params (set by home SearchBar)
  const [search_query, set_search_query] = useState(searchParams.get("q") ?? "");
  const [search_location, set_search_location] = useState(
    searchParams.get("location") ?? "All Locations"
  );
  const [search_date, set_search_date] = useState(searchParams.get("date") ?? "");

  const [active_quick_filter, set_active_quick_filter] = useState("All");
  const [sort_by, set_sort_by] = useState("Most Popular");
  const [selected_cities, set_selected_cities] = useState<string[]>(() => {
    // If a location was passed via query param, pre-select it in sidebar too
    const loc = searchParams.get("location");
    return loc ? [loc] : [];
  });
  const [max_price, set_max_price] = useState(DEFAULT_MAX_PRICE);
  const [availability, set_availability] = useState<"available" | "limited">(
    "available"
  );
  const [dbEvents, setDbEvents] = useState<EventCardType[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  // Sync search state when URL searchParams change
  useEffect(() => {
    const q = searchParams.get("q");
    set_search_query(q ?? "");
  }, [searchParams]);

  function handle_select_category(keyword: string) {
    set_search_query(keyword);
    const params = new URLSearchParams(searchParams.toString());
    if (keyword) {
      params.set("q", keyword);
    } else {
      params.delete("q");
    }
    const newUrl = params.toString() ? `/events?${params.toString()}` : "/events";
    router.replace(newUrl, { scroll: false });
  }

  useEffect(() => {
    listEvents()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          const mapped: EventCardType[] = res.data.map((evt) => {
            const startsAtDate = new Date(evt.starts_at);
            const formattedDate = startsAtDate.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            return {
              event_id: String(evt.event_id),
              title: evt.title,
              category_label: evt.category ? evt.category.replace(/_/g, " • ").toUpperCase() : "MUSIC • KONSER",
              cover_image_url: evt.cover_image_url || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop",
              badge: "on_sale",
              trust_signal: "verified",
              date_label: formattedDate,
              venue_label: evt.venue ? `${evt.venue.name}, ${evt.venue.city}` : "Lokasi Belum Ditentukan",
              starting_price: evt.starting_price ?? null,
              city: evt.venue ? evt.venue.city : "Jakarta",
              // Keep raw starts_at for date filtering
              _starts_at: evt.starts_at,
            };
          });
          setDbEvents(mapped);
        } else if (!res.success) {
          setLoadFailed(true);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch events from API:", err);
        setLoadFailed(true);
      });
  }, []);

  const displayEvents = dbEvents;

  const featuredEvents = useMemo<FeaturedCarouselEvent[]>(() => {
    return displayEvents.slice(0, 3).map((evt, idx) => ({
      event_id: evt.event_id,
      cover_image_url: evt.cover_image_url,
      tag_label: idx === 0 ? "Pilihan Editor" : "Trending",
      tag_color: idx % 2 === 0 ? "secondary" : "success",
      title: evt.title,
      date_venue_label: evt.date_label,
      starting_price: evt.starting_price,
    }));
  }, [displayEvents]);

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

  function handle_hero_reset() {
    set_search_query("");
    set_search_location("All Locations");
    set_search_date("");
    handle_clear_filters();
    router.replace("/events", { scroll: false });
  }

  // Sync hero location → sidebar cities
  function handle_hero_location_change(loc: string) {
    set_search_location(loc);
    if (loc === "All Locations") {
      set_selected_cities([]);
    } else {
      set_selected_cities([loc]);
    }
  }

  const [visible_count, set_visible_count] = useState(6);

  useEffect(() => {
    set_visible_count(6);
  }, [selected_cities, max_price, availability, sort_by, active_quick_filter, search_query, search_date]);

  const filtered_events = useMemo(() => {
    let events = displayEvents.filter(
      (event) => event.starting_price === null || event.starting_price <= max_price
    );

    // Keyword search — match against event title, venue label, or category label (case-insensitive)
    if (search_query.trim()) {
      const q = search_query.trim().toLowerCase();
      events = events.filter((event) =>
        event.title.toLowerCase().includes(q) ||
        event.venue_label.toLowerCase().includes(q) ||
        event.category_label.toLowerCase().includes(q)
      );
    }

    // Date filter — match events on selected date
    if (search_date) {
      const selectedDate = new Date(search_date);
      events = events.filter((event) => {
        const rawDate = (event as EventCardType & { _starts_at?: string })._starts_at;
        if (!rawDate) return true;
        const eventDate = new Date(rawDate);
        return (
          eventDate.getFullYear() === selectedDate.getFullYear() &&
          eventDate.getMonth() === selectedDate.getMonth() &&
          eventDate.getDate() === selectedDate.getDate()
        );
      });
    }

    // Quick Filter Chips (Today, This Week, This Month, Free Events, Nearby, Online, Newest)
    if (active_quick_filter === "Today") {
      const now = new Date();
      events = events.filter((event) => {
        const rawDate = (event as EventCardType & { _starts_at?: string })._starts_at;
        if (!rawDate) return true;
        const d = new Date(rawDate);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      });
    } else if (active_quick_filter === "This Week") {
      const now = new Date();
      const endOfWeek = new Date();
      endOfWeek.setDate(now.getDate() + 7);
      events = events.filter((event) => {
        const rawDate = (event as EventCardType & { _starts_at?: string })._starts_at;
        if (!rawDate) return true;
        const d = new Date(rawDate);
        return d >= now && d <= endOfWeek;
      });
    } else if (active_quick_filter === "This Month") {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      events = events.filter((event) => {
        const rawDate = (event as EventCardType & { _starts_at?: string })._starts_at;
        if (!rawDate) return true;
        const d = new Date(rawDate);
        return d >= now && d <= endOfMonth;
      });
    } else if (active_quick_filter === "Free Events") {
      events = events.filter((event) => event.starting_price === 0);
    } else if (active_quick_filter === "Nearby") {
      events = events.filter(
        (event) =>
          event.city.toLowerCase().includes("jakarta") ||
          event.city.toLowerCase().includes("bandung") ||
          event.city.toLowerCase().includes("tangerang")
      );
    } else if (active_quick_filter === "Online") {
      events = events.filter(
        (event) =>
          event.city.toLowerCase().includes("online") ||
          event.venue_label.toLowerCase().includes("online")
      );
    } else if (active_quick_filter === "Newest") {
      events = [...events].sort((a, b) => {
        const dateA = (a as EventCardType & { _starts_at?: string })._starts_at || "";
        const dateB = (b as EventCardType & { _starts_at?: string })._starts_at || "";
        return dateB.localeCompare(dateA);
      });
    }

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
      events = [...events].sort(
        (a, b) => (a.starting_price ?? 0) - (b.starting_price ?? 0)
      );
    } else if (sort_by === "Highest Price") {
      events = [...events].sort(
        (a, b) => (b.starting_price ?? 0) - (a.starting_price ?? 0)
      );
    } else if (sort_by === "Newest") {
      events = [...events].sort((a, b) => {
        const dateA = (a as EventCardType & { _starts_at?: string })._starts_at || "";
        const dateB = (b as EventCardType & { _starts_at?: string })._starts_at || "";
        return dateB.localeCompare(dateA);
      });
    }

    return events;
  }, [displayEvents, selected_cities, max_price, availability, sort_by, active_quick_filter, search_query, search_date]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar active_href="/events" />

      <main>
        <EventSearchHero
          query={search_query}
          on_query_change={handle_select_category}
          location={search_location}
          on_location_change={handle_hero_location_change}
          date={search_date}
          on_date_change={set_search_date}
          on_reset={handle_hero_reset}
        />
        {featuredEvents.length > 0 && <FeaturedCarousel events={featuredEvents} />}
        <CategoryIconsGrid
          active_category={search_query}
          on_select_category={handle_select_category}
        />

        <section className="bg-background py-section-gap">
          <div className="mx-auto max-w-7xl w-full px-margin-mobile md:px-margin-desktop">
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

                {filtered_events.length > 0 ? (
                  <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
                    {filtered_events.slice(0, visible_count).map((event) => (
                      <EventListingCard key={event.event_id} event={event} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border-subtle py-16 text-center">
                    <p className="font-body-md text-body-md text-text-secondary">
                      {loadFailed
                        ? "Gagal memuat event. Silakan coba lagi nanti."
                        : dbEvents.length === 0
                          ? "Belum ada event yang tersedia."
                          : search_query.trim()
                            ? `Tidak ada event yang cocok dengan "${search_query}".`
                            : "No events match your filter."}
                    </p>
                  </div>
                )}

                {filtered_events.length > visible_count && (
                  <div className="mt-12 text-center">
                    <button
                      type="button"
                      onClick={() => set_visible_count(prev => prev + 6)}
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

      <HomeFooterV3 />
    </div>
  );
}