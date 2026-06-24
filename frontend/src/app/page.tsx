/**
 * app/page.tsx
 *
 * CrowdFlow landing page — REDESIGNED per the team's request, replacing
 * the previous English-language version. Assembles Navbar,
 * HeroSearchSection, CategoryIconRow, BentoCollectionGrid,
 * TrendingEventsSection, NewsletterBanner, HomeFooterV2. Matches the new
 * Indonesian-language Stitch home screen end-to-end.
 *
 * The old components/home/* (HeroSection, FeaturedEvents,
 * ResaleTrustSection, CategoryGrid, AppPromoSection) and
 * components/layout/Footer.tsx are no longer used by this page — left in
 * place in case the team wants to repurpose them elsewhere, but nothing
 * here references them anymore.
 */

import { Navbar } from "@/components/layout/Navbar";
import { HeroSearchSection } from "@/components/home-v2/HeroSearchSection";
import { CategoryIconRow } from "@/components/home-v2/CategoryIconRow";
import { BentoCollectionGrid } from "@/components/home-v2/BentoCollectionGrid";
import { TrendingEventsSection } from "@/components/home-v2/TrendingEventsSection";
import { NewsletterBanner } from "@/components/home-v2/NewsletterBanner";
import { HomeFooterV2 } from "@/components/home-v2/HomeFooterV2";
import {
  mockBentoTiles,
  mockTrendingEvents,
  COUNTRY_FILTERS,
} from "@/mock/homeV2Data";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar active_href="/" />
      <main className="w-full">
        <HeroSearchSection />
        <CategoryIconRow />
        <BentoCollectionGrid tiles={mockBentoTiles} />
        <TrendingEventsSection
          events={mockTrendingEvents}
          countries={COUNTRY_FILTERS}
        />
        <NewsletterBanner />
      </main>
      <HomeFooterV2 />
    </div>
  );
}