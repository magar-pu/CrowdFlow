/**
 * components/event-detail/VenueInfoSection.tsx
 *
 * Venue information for the buyer's event page: what the venue actually is,
 * the real bound seat layout, and working directions.
 *
 * This screen used to carry a venue type, entrance/exit/parking counts,
 * accessibility badges, a transport guide and a nearby-facilities grid. None
 * of it came from anywhere — `venues` stores only name, address, city,
 * province, postal_code and total_capacity. The transport guide was the worst
 * of it: it named Senayan MRT Exit 4 and GBK Pintu 1 and rendered identically
 * for every venue on the platform, so an event in Bandung told buyers to take
 * the Jakarta MRT. All of it is gone rather than invented per venue.
 *
 * What remains is sourced or actionable. If those venue attributes are wanted
 * back, they need columns on `venues` first.
 */

"use client";

import { useState } from "react";
import { Map, Navigation, Copy, Check, Share2 } from "lucide-react";
import type { Venue } from "@/types/ticket";
import { VenueLayoutPreview } from "@/components/event-detail/VenueLayoutPreview";

interface VenueInfoSectionProps {
  venue: Venue;
  event_id: string;
  /**
   * The organizer's own map link for this event, "" when unset. A name+address
   * search resolves to the wrong pin for generically named venues, so an
   * explicit link wins over it when there is one.
   */
  google_maps_url?: string;
}

export function VenueInfoSection({
  venue,
  event_id,
  google_maps_url,
}: VenueInfoSectionProps) {
  const [copied, set_copied] = useState(false);

  const full_address = [venue.address, venue.city, venue.province]
    .filter(Boolean)
    .join(", ");
  // Name first so the search resolves to the venue itself rather than the
  // street. No geocoding API involved — these are plain search URLs.
  const maps_query = encodeURIComponent(`${venue.name}, ${full_address}`);
  const google_maps_href =
    google_maps_url && google_maps_url.trim() !== ""
      ? google_maps_url
      : `https://www.google.com/maps/search/?api=1&query=${maps_query}`;

  async function handle_copy() {
    try {
      await navigator.clipboard.writeText(`${venue.name}, ${full_address}`);
      set_copied(true);
      setTimeout(() => set_copied(false), 2000);
    } catch {
      // Clipboard is unavailable over plain http on some browsers. The address
      // is on screen and selectable, so there is nothing to recover from.
    }
  }

  async function handle_share() {
    const share_data = {
      title: venue.name,
      text: `${venue.name}, ${full_address}`,
      url: typeof window === "undefined" ? "" : window.location.href,
    };
    // navigator.share is mobile-mostly and requires a user gesture, which this
    // click is. Anything else falls back to copying the link.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(share_data);
        return;
      } catch {
        // Dismissing the share sheet rejects; not an error worth surfacing.
        return;
      }
    }
    handle_copy();
  }

  return (
    <section className="space-y-6">
      {/* ── Venue Information Card ── */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-sm md:p-8">
        <h2 className="mb-6 flex items-center gap-3 font-headline-md text-headline-md font-bold text-primary">
          <Map size={24} className="text-secondary" />
          Venue Information
        </h2>

        <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-border-subtle bg-surface-container-low p-4 sm:grid-cols-2">
          <div>
            <p className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Venue
            </p>
            <p className="mt-1 font-label-md text-label-md font-bold text-text-primary">
              {venue.name}
            </p>
            <p className="font-body-sm text-body-sm text-text-secondary">
              {full_address}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Capacity
            </p>
            <p className="mt-1 font-label-md text-label-md font-bold text-text-primary">
              {venue.total_capacity.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {/* The event's real bound layout, not a mockup. */}
        <VenueLayoutPreview event_id={event_id} />
      </div>

      {/* ── Getting There ── */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-sm md:p-8">
        <h2 className="mb-6 flex items-center gap-3 font-headline-md text-headline-md font-bold text-primary">
          <Navigation size={24} className="text-secondary" />
          Getting There
        </h2>

        <p className="mb-1 font-label-md text-label-md font-bold text-text-primary">
          {venue.name}
        </p>
        <p className="mb-5 font-body-md text-body-md text-text-secondary">
          {full_address}
          {venue.postal_code ? ` ${venue.postal_code}` : ""}
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href={google_maps_href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-border-subtle bg-white px-4 py-2.5 font-label-sm text-label-sm font-bold text-text-primary shadow-sm transition-colors hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            <Map size={16} className="text-secondary" />
            Open in Google Maps
          </a>
          <button
            type="button"
            onClick={handle_copy}
            className="flex items-center gap-2 rounded-xl border border-border-subtle bg-white px-4 py-2.5 font-label-sm text-label-sm font-bold text-text-primary shadow-sm transition-colors hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            {copied ? (
              <>
                <Check size={16} className="text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy size={16} className="text-secondary" />
                Copy address
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handle_share}
            className="flex items-center gap-2 rounded-xl border border-border-subtle bg-white px-4 py-2.5 font-label-sm text-label-sm font-bold text-text-primary shadow-sm transition-colors hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            <Share2 size={16} className="text-secondary" />
            Share
          </button>
        </div>
      </div>
    </section>
  );
}
