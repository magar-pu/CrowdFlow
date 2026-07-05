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
  COUNTRY_FILTERS,
} from "@/mock/homeV2Data";

export default function HomePage() {
  const [trendingEvents, setTrendingEvents] = useState<TrendingEventCard[]>([]);

  useEffect(() => {
    listEvents(10)
      .then((res) => {
        if (res.success && res.data) {
          const mapped: TrendingEventCard[] = res.data.map((evt, idx) => {
            // Determine country based on city to support filters dynamically
            let country = "Indonesia";
            const cityLower = (evt.venue?.city || "").toLowerCase();
            if (cityLower.includes("tokyo")) {
              country = "Japan";
            } else if (cityLower.includes("singapore")) {
              country = "Singapore";
            } else if (cityLower.includes("new york") || cityLower.includes("los angeles")) {
              country = "United States";
            }

            return {
              event_id: String(evt.event_id),
              title: evt.title,
              cover_image_url: evt.cover_image_url || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=600&auto=format&fit=crop",
              city: evt.venue ? evt.venue.city : "Jakarta",
              rating: (5.0 - (idx * 0.1)) > 3.0 ? (5.0 - (idx * 0.1)) : 4.5,
              review_count: 120 + (idx * 45),
              starting_price: 150_000,
              country: country,
            };
          });
          setTrendingEvents(mapped);
        }
      })
      .catch((err) => {
        console.error("Failed to load trending events from API:", err);
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
            countries={COUNTRY_FILTERS}
          />
        )}
        <NewsletterBanner />
      </main>
      <HomeFooterV2 />
    </div>
  );
}