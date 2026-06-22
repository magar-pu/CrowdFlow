/**
 * components/event-detail/VenueInfoSection.tsx
 *
 * "Venue Information" card — abstract venue/map visual with a glass-panel
 * overlay showing the address + "Get Directions" CTA.
 * Matches Stitch markup (aspect-video map placeholder + glass-panel).
 */

import { Map, ArrowRight } from "lucide-react";
import type { Venue } from "@/types/ticket";

interface VenueInfoSectionProps {
  venue: Venue;
}

export function VenueInfoSection({ venue }: VenueInfoSectionProps) {
  const maps_query = encodeURIComponent(`${venue.name}, ${venue.address}`);

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-white p-6 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] md:p-8">
      <h2 className="mb-6 flex items-center gap-3 font-headline-md text-headline-md font-bold text-primary">
        <Map size={24} className="text-secondary" />
        Venue Information
      </h2>
      <div className="group relative aspect-video w-full overflow-hidden rounded-xl border border-border-subtle bg-surface-container">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://maps.googleapis.com/maps/api/staticmap?center=${venue.latitude},${venue.longitude}&zoom=15&size=800x450&style=feature:all|element:geometry|color:0xeceef0`}
          alt={`Map of ${venue.name}`}
          className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100"
          onError={(e) => {
            // Static Maps requires an API key in production; fall back to a
            // flat placeholder so the layout never breaks during the mock phase.
            e.currentTarget.style.display = "none";
          }}
        />
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-lg border border-white/30 bg-white/70 p-4 backdrop-blur-xl">
          <div>
            <p className="font-label-md text-label-md text-primary">
              {venue.name}
            </p>
            <p className="font-body-sm text-body-sm text-text-secondary">
              {venue.address}, {venue.city}
            </p>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${maps_query}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-label-md text-label-md text-secondary transition-colors hover:text-primary"
          >
            Get Directions <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}