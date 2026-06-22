/**
 * app/page.tsx
 *
 * CrowdFlow landing page — assembles Navbar, HeroSection, FeaturedEvents,
 * ResaleTrustSection, CategoryGrid, AppPromoSection, Footer.
 * Matches the crowdflow_home Stitch screen end-to-end.
 *
 * This REPLACES the default create-next-app boilerplate page.tsx.
 */

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedEvents } from "@/components/home/FeaturedEvents";
import { ResaleTrustSection } from "@/components/home/ResaleTrustSection";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { AppPromoSection } from "@/components/home/AppPromoSection";
import { mockEventList } from "@/mock/eventData";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar active_href="/" />
      <HeroSection />
      <FeaturedEvents events={mockEventList} />
      <ResaleTrustSection />
      <CategoryGrid />
      <AppPromoSection />
      <Footer />
    </div>
  );
}