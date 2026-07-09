"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { HeroSlider } from "@/components/home-v3/HeroSlider";
import { SearchBar } from "@/components/home-v3/SearchBar";
import { UpcomingConcerts } from "@/components/home-v3/UpcomingConcerts";
import { StatsBanner } from "@/components/home-v3/StatsBanner";
import { BentoCollections } from "@/components/home-v3/BentoCollections";
import { HomeFooterV3 } from "@/components/home-v3/HomeFooterV3";
import { listEvents } from "@/lib/api/events";
import type { TrendingEventCard } from "@/types/ticket";
import { mockTrendingCardStats } from "@/mock/homeV2Data";

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
    <div className="min-h-screen bg-surface">
      <Navbar active_href="/" isTransparentOnTop={true} />
      
      <main className="w-full">
        <HeroSlider />
        
        {/* Dashboard Content */}
        <div className="relative z-10 bg-surface min-h-screen pb-20">
          <SearchBar />
          
          <div className="px-6 lg:px-16 max-w-7xl mx-auto">
            {/* API data available as 'trendingEvents' when you need to pass it to components */}
            <UpcomingConcerts />
            <StatsBanner />
            <BentoCollections />
          </div>
        </div>
      </main>
      
      <HomeFooterV3 />
    </div>
  );
}