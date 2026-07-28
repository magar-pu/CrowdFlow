"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { HeroSlider } from "@/components/home-v3/HeroSlider";
import { SearchBar } from "@/components/home-v3/SearchBar";
import { UpcomingConcerts } from "@/components/home-v3/UpcomingConcerts";
import { StatsBanner } from "@/components/home-v3/StatsBanner";
import { BentoCollections } from "@/components/home-v3/BentoCollections";
import { HomeFooterV3 } from "@/components/home-v3/HomeFooterV3";
import { TrendingEvents } from "@/components/home-v3/TrendingEvents";
import { listEvents } from "@/lib/api/events";
import type { Event, TrendingEventCard } from "@/types/ticket";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=600&auto=format&fit=crop";

const SECTION_SIZE = 4;

/**
 * Trending is over-fetched so that dropping events already shown under
 * Upcoming still leaves a full row. On a catalogue with no recent sales every
 * event ties at zero and trending falls back to soonest-first, which would
 * otherwise repeat the Upcoming cards verbatim.
 */
const TRENDING_FETCH_SIZE = SECTION_SIZE * 4;

function toCard(evt: Event): TrendingEventCard {
  return {
    event_id: String(evt.event_id),
    title: evt.title,
    cover_image_url: evt.cover_image_url || FALLBACK_COVER,
    city: evt.venue?.city ?? "Indonesia",
    category: evt.category ?? "other",
    starts_at: evt.starts_at,
    starting_price: evt.starting_price ?? null,
    recent_sales: evt.recent_sales ?? 0,
  };
}

export default function HomePage() {
  const [upcomingEvents, setUpcomingEvents] = useState<TrendingEventCard[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<TrendingEventCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Guards against a slow first response landing after a retry and overwriting
  // the newer result.
  const requestRef = useRef(0);

  const loadEvents = useCallback(() => {
    const requestId = ++requestRef.current;
    setIsLoading(true);
    setHasError(false);

    Promise.all([
      listEvents(SECTION_SIZE, 0, "upcoming"),
      listEvents(TRENDING_FETCH_SIZE, 0, "trending"),
    ])
      .then(([upcomingRes, trendingRes]) => {
        if (requestId !== requestRef.current) return;

        if (!upcomingRes.success || !trendingRes.success) {
          setHasError(true);
          return;
        }

        const upcoming = (upcomingRes.data ?? []).map(toCard);
        const shownIds = new Set(upcoming.map((e) => e.event_id));
        const trending = (trendingRes.data ?? [])
          .map(toCard)
          .filter((e) => !shownIds.has(e.event_id))
          .slice(0, SECTION_SIZE);

        setUpcomingEvents(upcoming);
        setTrendingEvents(trending);
      })
      .catch((err) => {
        if (requestId !== requestRef.current) return;
        console.error("Failed to load homepage events:", err);
        setHasError(true);
      })
      .finally(() => {
        if (requestId !== requestRef.current) return;
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar active_href="/" isTransparentOnTop={true} />

      <main className="w-full">
        <HeroSlider />

        {/* Dashboard Content */}
        <div className="relative z-10 bg-surface min-h-screen pb-20">
          <SearchBar />

          <div className="px-6 lg:px-16 max-w-7xl mx-auto">
            <UpcomingConcerts
              events={upcomingEvents}
              isLoading={isLoading}
              hasError={hasError}
              onRetry={loadEvents}
            />
            <TrendingEvents
              events={trendingEvents}
              isLoading={isLoading}
              hasError={hasError}
              onRetry={loadEvents}
            />
            <StatsBanner />
            <BentoCollections />
          </div>
        </div>
      </main>

      <HomeFooterV3 />
    </div>
  );
}
