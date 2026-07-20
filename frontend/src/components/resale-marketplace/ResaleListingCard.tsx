/**
 * components/resale-marketplace/ResaleListingCard.tsx
 *
 * Single resale ticket card: cover image with "Verified Resale" badge,
 * category/ticket-count label, title, date/venue rows, struck-through
 * original price + current resale price, and a "View" CTA. Matches
 * verified_resale_marketplace Stitch markup exactly.
 */

import Link from "next/link";
import { BadgeCheck, CalendarDays, MapPin } from "lucide-react";
import { formatIDR } from "@/lib/pricing";
import type { ResaleListing } from "@/types/ticket";

interface ResaleListingCardProps {
  listing: ResaleListing;
}

export function ResaleListingCard({ listing }: ResaleListingCardProps) {
  const ticket_count_label = `${listing.ticket_count} Ticket${
    listing.ticket_count > 1 ? "s" : ""
  }${listing.is_vip ? " (VIP)" : ""}`;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-white shadow-sm transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
      <div className="relative h-48 overflow-hidden bg-surface-container-low">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.cover_image_url}
          alt={listing.event_title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {listing.is_verified && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-surface-white/90 px-3 py-1 font-label-sm text-label-sm text-primary shadow-sm backdrop-blur-md">
            <BadgeCheck size={14} className="text-success" />
            Verified Resale
          </div>
        )}
      </div>

      <div className="flex flex-grow flex-col p-5">
        <div className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
          {listing.event_category} • {ticket_count_label}
        </div>
        <h3 className="mb-2 line-clamp-2 font-headline-sm text-headline-sm text-primary">
          {listing.event_title}
        </h3>
        <div className="mb-1 flex items-center gap-2 font-body-sm text-body-sm text-text-secondary">
          <CalendarDays size={16} />
          {listing.event_date_label}
        </div>
        <div className="mb-6 flex items-center gap-2 font-body-sm text-body-sm text-text-secondary">
          <MapPin size={16} />
          {listing.venue_label}
        </div>

        <div className="mt-auto flex items-end justify-between border-t border-border-subtle pt-4">
          <div>
            <div className="font-body-sm text-body-sm text-text-secondary line-through">
              Orig: {formatIDR(listing.original_face_value)}
            </div>
            <div className="font-headline-md text-headline-md text-primary">
              {formatIDR(listing.resale_price_per_ticket)}
              {listing.ticket_count > 1 && (
                <span className="font-body-sm text-body-sm font-normal text-text-secondary">
                  {" "}
                  /ea
                </span>
              )}
            </div>
          </div>
          <Link
            href={`/resale/${listing.listing_id}`}
            className="rounded-full bg-secondary px-5 py-2 font-label-md text-label-md text-on-secondary shadow-sm transition-colors hover:bg-secondary/90 hover:shadow-md"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}