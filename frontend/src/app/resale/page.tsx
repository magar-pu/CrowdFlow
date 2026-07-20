"use client";

/**
 * app/resale/page.tsx
 *
 * Verified Resale Marketplace — hero search, filter toolbar, and the
 * resale listing grid.
 *
 * Fetches live data from GET /api/resale/listings via the centralized
 * API service. Falls back to mock data if the API returns empty/error
 * (e.g. during local dev without backend).
 */

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { HomeFooterV3 } from "@/components/home-v3/HomeFooterV3";
import { ResaleHeroSearch } from "@/components/resale-marketplace/ResaleHeroSearch";
import { ResaleFilterToolbar } from "@/components/resale-marketplace/ResaleFilterToolbar";
import { ResaleListingCard } from "@/components/resale-marketplace/ResaleListingCard";
import { fetchResaleListings } from "@/lib/api/resale";
import { mockResaleListings } from "@/mock/resaleData";
import type { ResaleListing } from "@/types/ticket";

export default function ResaleMarketplacePage() {
  const [sort_by, set_sort_by] = useState("Recently Added");
  const [listings, set_listings] = useState<ResaleListing[]>(mockResaleListings);
  const [visible_count, set_visible_count] = useState(6);

  useEffect(() => {
    async function loadListings() {
      const res = await fetchResaleListings(50, 0);
      if (res.success && res.data && res.data.length > 0) {
        set_listings(res.data);
      }
      // If API fails or returns empty, keep mock data as fallback
    }
    loadListings();
  }, []);

  const handle_load_more = () => {
    set_visible_count((prev) => prev + 6);
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Navbar active_href="/resale" />

      <ResaleHeroSearch />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-stack-lg px-margin-mobile py-section-gap md:px-margin-desktop">
        <ResaleFilterToolbar sort_by={sort_by} on_sort_change={set_sort_by} />

        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
          {listings.slice(0, visible_count).map((listing) => (
            <ResaleListingCard key={listing.listing_id} listing={listing} />
          ))}
        </div>

        {visible_count < listings.length && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={handle_load_more}
              className="rounded-full border border-border-subtle bg-surface-white px-6 py-3 font-label-md text-label-md text-secondary shadow-sm transition-colors hover:text-primary hover:shadow-md"
            >
              Load More Listings
            </button>
          </div>
        )}
      </main>

      <HomeFooterV3 />
    </div>
  );
}