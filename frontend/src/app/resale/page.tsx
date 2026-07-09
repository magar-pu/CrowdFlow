"use client";

/**
 * app/resale/page.tsx
 *
 * Verified Resale Marketplace — hero search, filter toolbar, and the
 * resale listing grid. Matches the verified_resale_marketplace Stitch
 * screen end-to-end.
 *
 * Currently reads from mockResaleListings — swap for
 * `listResaleListings()` (lib/api/resale.ts) once the Go endpoint exists.
 * "Load More Listings" is presentational only; real pagination would
 * call that endpoint with an offset/cursor once it's backed by data.
 */

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { HomeFooterV3 } from "@/components/home-v3/HomeFooterV3";
import { ResaleHeroSearch } from "@/components/resale-marketplace/ResaleHeroSearch";
import { ResaleFilterToolbar } from "@/components/resale-marketplace/ResaleFilterToolbar";
import { ResaleListingCard } from "@/components/resale-marketplace/ResaleListingCard";
import { mockResaleListings } from "@/mock/resaleData";

export default function ResaleMarketplacePage() {
  const [sort_by, set_sort_by] = useState("Recently Added");

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Navbar active_href="/resale" />

      <ResaleHeroSearch />

      <main className="mx-auto flex w-full max-w-container-max flex-1 flex-col gap-stack-lg px-margin-mobile py-section-gap md:px-margin-desktop">
        <ResaleFilterToolbar sort_by={sort_by} on_sort_change={set_sort_by} />

        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
          {mockResaleListings.map((listing) => (
            <ResaleListingCard key={listing.listing_id} listing={listing} />
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            className="rounded-full border border-border-subtle bg-surface-white px-6 py-3 font-label-md text-label-md text-secondary shadow-sm transition-colors hover:text-primary hover:shadow-md"
          >
            Load More Listings
          </button>
        </div>
      </main>

      <HomeFooterV3 />
    </div>
  );
}