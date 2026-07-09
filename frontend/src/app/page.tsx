"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { HeroSearchSection } from "@/components/home-v2/HeroSearchSection";
import { CategoryIconRow } from "@/components/home-v2/CategoryIconRow";
import { BentoCollectionGrid } from "@/components/home-v2/BentoCollectionGrid";
import { TrendingEventsSection } from "@/components/home-v2/TrendingEventsSection";
import { NewsletterBanner } from "@/components/home-v2/NewsletterBanner";
import { HomeFooterV2 } from "@/components/home-v2/HomeFooterV2";
import { listEvents } from "@/lib/api/events";
import type { TrendingEventCard } from "@/types/ticket";
import {
  mockBentoTiles,
  mockTrendingCardStats,
  CATEGORY_FILTERS,
} from "@/mock/homeV2Data";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=600&auto=format&fit=crop";

export default function HomePage() {
  const [trendingEvents, setTrendingEvents] = useState<TrendingEventCard[]>([]);

  useEffect(() => {
    listEvents(20)
      .then((res) => {
        if (res.success && res.data) {
          const mapped: TrendingEventCard[] = res.data.map((evt) => ({
            event_id: String(evt.event_id),
            title: evt.title,
            cover_image_url: evt.cover_image_url || FALLBACK_COVER,
            city: evt.venue?.city ?? "Indonesia",
            category: evt.category ?? "other",
            starts_at: evt.starts_at,
            // Placeholder stats — no backend source yet, see mockTrendingCardStats.
            ...mockTrendingCardStats(String(evt.event_id)),
          }));
          setTrendingEvents(mapped);
        }
      })
      .catch((err) => {
        console.error("Failed to load trending events:", err);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar active_href="/" />
      <main className="w-full">
        <HeroSearchSection />
        <CategoryIconRow />
        <BentoCollectionGrid tiles={mockBentoTiles} />
        {trendingEvents.length > 0 && (
          <TrendingEventsSection
            events={trendingEvents}
            categories={CATEGORY_FILTERS}
          />
        )}
        <NewsletterBanner />
      </main>
      <HomeFooterV2 />
    </div>
  );
}