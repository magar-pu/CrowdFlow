"use client";

/**
 * app/resale/[listing_id]/page.tsx
 *
 * Detail page for a single resale listing. Fetches live data from
 * GET /api/resale/listings/{id}. Falls back to mock data if the
 * API is unavailable.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { HomeFooterV3 } from "@/components/home-v3/HomeFooterV3";
import { ResaleListingDetail } from "@/components/resale-marketplace/ResaleListingDetail";
import { fetchResaleListingDetail } from "@/lib/api/resale";
import { mockResaleListings } from "@/mock/resaleData";
import type { ResaleListing } from "@/types/ticket";

export default function ResaleListingPage() {
  const params = useParams<{ listing_id: string }>();
  const [listing, set_listing] = useState<ResaleListing | null>(null);
  const [is_loading, set_is_loading] = useState(true);

  useEffect(() => {
    async function loadListing() {
      if (!params.listing_id) return;

      // Try live API first
      const res = await fetchResaleListingDetail(params.listing_id);
      if (res.success && res.data) {
        set_listing(res.data);
        set_is_loading(false);
        return;
      }

      // Fallback to mock data
      const mock = mockResaleListings.find(
        (l) => l.listing_id === params.listing_id
      );
      set_listing(mock ?? null);
      set_is_loading(false);
    }
    loadListing();
  }, [params.listing_id]);

  if (is_loading) {
    return (
      <div className="flex min-h-screen flex-col bg-surface">
        <Navbar active_href="/resale" />
        <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center">
          <div className="font-body-md text-body-md text-text-secondary">
            Loading listing...
          </div>
        </main>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex min-h-screen flex-col bg-surface">
        <Navbar active_href="/resale" />
        <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="mb-2 font-headline-lg text-headline-lg text-primary">
              Listing Not Found
            </h1>
            <p className="font-body-md text-body-md text-text-secondary">
              This resale listing may have been cancelled or expired.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Navbar active_href="/resale" />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-margin-mobile py-12 md:px-margin-desktop md:py-16">
        {/* Breadcrumbs */}
        <div className="mb-8 font-body-sm text-body-sm text-text-secondary">
          <span className="cursor-pointer hover:text-primary">Resale Marketplace</span>
          <span className="mx-2">/</span>
          <span className="cursor-pointer hover:text-primary">{listing.event_category}</span>
          <span className="mx-2">/</span>
          <span className="text-primary">{listing.event_title}</span>
        </div>

        <ResaleListingDetail listing={listing} />
      </main>

      <HomeFooterV3 />
    </div>
  );
}
