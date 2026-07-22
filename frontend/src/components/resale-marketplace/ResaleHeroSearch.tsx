/**
 * components/resale-marketplace/ResaleHeroSearch.tsx
 *
 * Hero section: "100% Verified Official Tickets" trust badge, headline,
 * subcopy, and the pill-shaped search bar (event/artist/venue + location
 * + "Find Resale Tickets" CTA). Matches verified_resale_marketplace
 * Stitch markup exactly, including the radial dot-pattern background.
 */

"use client";

import { useState } from "react";
import { BadgeCheck, Search, MapPin } from "lucide-react";

export function ResaleHeroSearch() {
  const [search_query, set_search_query] = useState("");
  const [location, set_location] = useState("");

  return (
    <section className="relative overflow-hidden border-b border-border-subtle bg-surface-white pb-stack-lg pt-section-gap">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(#E2E8F0 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative z-10 mx-auto flex max-w-container-max flex-col items-center px-margin-mobile text-center md:px-margin-desktop">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 font-label-sm text-label-sm text-success">
          <BadgeCheck size={16} />
          100% Verified Official Tickets
        </div>
        <h1 className="mb-6 max-w-3xl font-headline-xl text-headline-xl text-primary">
          The Secure Way to Buy &amp; Sell Tickets.
        </h1>
        <p className="mb-12 max-w-2xl font-body-lg text-body-lg text-text-secondary">
          Buy and sell tickets safely with other fans. Every transaction on 
          the CrowdFlow Resale Marketplace is 100% protected by our secure 
          platform.
        </p>

        {/* Search bar */}
        <div className="group flex w-full max-w-4xl flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-white p-2 shadow-xl transition-all duration-300 hover:shadow-2xl focus-within:-translate-y-1 focus-within:border-secondary focus-within:shadow-[0_20px_40px_rgba(29,78,216,0.15)] focus-within:ring-4 focus-within:ring-secondary/10 md:flex-row md:rounded-full">
          <div className="hidden flex-1 items-center border-r border-border-subtle/50 px-4 py-2 md:flex">
            <Search size={20} className="mr-3 text-text-secondary" />
            <input
              type="text"
              value={search_query}
              onChange={(e) => set_search_query(e.target.value)}
              placeholder="Search events, artists, or venues"
              className="w-full border-none bg-transparent p-0 font-body-md text-body-md placeholder:text-text-secondary focus:outline-none focus:ring-0"
            />
          </div>
          <div className="hidden flex-1 items-center border-r border-border-subtle/50 px-4 py-2 md:flex">
            <MapPin size={20} className="mr-3 text-text-secondary" />
            <input
              type="text"
              value={location}
              onChange={(e) => set_location(e.target.value)}
              placeholder="Location"
              className="w-full border-none bg-transparent p-0 font-body-md text-body-md placeholder:text-text-secondary focus:outline-none focus:ring-0"
            />
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-label-md text-label-md text-on-primary transition-opacity hover:opacity-90 md:w-auto"
          >
            Find Resale Tickets
          </button>
        </div>

        <div className="mt-10 flex items-center justify-center">
          <div className="inline-flex items-center gap-4 rounded-full border border-border-subtle bg-surface-container-low/50 px-4 py-2 shadow-sm backdrop-blur-md transition-all hover:bg-surface-container-low/80">
            <span className="font-body-sm font-medium text-text-secondary">
              Got a spare ticket?
            </span>
            <div className="h-4 w-px bg-border-subtle"></div>
            <button
              type="button"
              className="flex items-center gap-1 font-label-sm font-semibold text-primary transition-colors hover:text-secondary"
            >
              List it for sale <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}