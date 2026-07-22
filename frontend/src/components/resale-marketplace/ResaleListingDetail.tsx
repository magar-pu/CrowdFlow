/**
 * components/resale-marketplace/ResaleListingDetail.tsx
 *
 * Detailed view of a single resale listing.
 * Two-column layout with event/ticket info on the left, and a sticky checkout summary on the right.
 */

import Link from "next/link";
import { BadgeCheck, CalendarDays, MapPin, ShieldCheck, Info } from "lucide-react";
import { formatIDR } from "@/lib/pricing";
import type { ResaleListing } from "@/types/ticket";

interface ResaleListingDetailProps {
  listing: ResaleListing;
}

export function ResaleListingDetail({ listing }: ResaleListingDetailProps) {
  const total_price = listing.resale_price_per_ticket * listing.ticket_count;

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
      {/* Left Column: Details */}
      <div className="flex flex-col gap-6 lg:col-span-8">
        {/* Cover Image & Basic Info */}
        <div className="relative overflow-hidden rounded-3xl shadow-lg h-[450px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.cover_image_url}
            alt={listing.event_title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10" />
          
          {listing.is_verified && (
            <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full bg-surface-white/95 px-4 py-2 font-label-md text-label-md text-primary shadow-sm backdrop-blur-md">
              <BadgeCheck size={18} className="text-success" />
              100% Verified Official Ticket
            </div>
          )}

          <div className="absolute bottom-0 left-0 w-full p-8 text-white">
            <div className="mb-3 font-label-sm text-label-sm uppercase tracking-widest text-white/80">
              {listing.event_category}
            </div>
            <h1 className="mb-4 font-display text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl text-white">
              {listing.event_title}
            </h1>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-8 text-white/90">
              <div className="flex items-center gap-2 font-body-md text-body-md">
                <CalendarDays size={20} className="text-white/80" />
                {listing.event_date_label}
              </div>
              <div className="flex items-center gap-2 font-body-md text-body-md">
                <MapPin size={20} className="text-white/80" />
                {listing.venue_label}
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Details */}
        <div className="rounded-2xl border border-border-subtle bg-surface-white p-6 shadow-sm md:p-8">
          <h2 className="mb-4 font-headline-md text-headline-md text-primary">Ticket Details</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="mb-1 font-label-sm text-label-sm text-text-secondary">Ticket Type</div>
              <div className="font-body-md font-medium text-primary">
                {listing.is_vip ? "VIP Admission" : "General Admission"}
              </div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="mb-1 font-label-sm text-label-sm text-text-secondary">Quantity</div>
              <div className="font-body-md font-medium text-primary">{listing.ticket_count} Ticket(s)</div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="mb-1 font-label-sm text-label-sm text-text-secondary">Section</div>
              <div className="font-body-md font-medium text-primary">General</div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="mb-1 font-label-sm text-label-sm text-text-secondary">Row / Seat</div>
              <div className="font-body-md font-medium text-primary">Unreserved</div>
            </div>
          </div>
          
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-border-subtle bg-surface p-4">
            <Info size={20} className="mt-0.5 text-text-secondary shrink-0" />
            <p className="font-body-sm text-body-sm text-text-secondary">
              This ticket is a verified digital asset. Upon purchase, ownership will be instantly transferred to your CrowdFlow account. You will be able to access the QR code directly from your &quot;Orders&quot; tab.
            </p>
          </div>
        </div>

        {/* About the Seller (Mock) */}
        <div className="rounded-2xl border border-border-subtle bg-surface-white p-6 shadow-sm md:p-8">
          <h2 className="mb-4 font-headline-md text-headline-md text-primary">About the Seller</h2>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-blue/10 font-label-lg text-label-lg text-accent-blue">
              TF
            </div>
            <div>
              <div className="font-label-md text-label-md text-primary">Trusted Fan</div>
              <div className="font-body-sm text-body-sm text-text-secondary">Member since 2024 • Verified Identity</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Sticky Summary */}
      <div className="lg:col-span-4">
        <div className="sticky top-24 rounded-2xl border border-border-subtle bg-surface-white p-6 shadow-lg">
          <h2 className="mb-6 font-headline-md text-headline-md text-primary">Order Summary</h2>
          
          <div className="mb-4 flex items-center justify-between border-b border-border-subtle pb-4">
            <div>
              <div className="font-label-md text-label-md text-primary">{listing.ticket_count}x Ticket</div>
              <div className="font-body-sm text-body-sm text-text-secondary">
                {formatIDR(listing.resale_price_per_ticket)} /ea
              </div>
            </div>
            <div className="font-label-lg text-label-lg text-primary">{formatIDR(total_price)}</div>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <div className="font-body-md text-body-md text-text-secondary">Original Face Value</div>
            <div className="font-body-md text-body-md text-text-secondary line-through">
              {formatIDR(listing.original_face_value * listing.ticket_count)}
            </div>
          </div>

          <Link
            href={`/checkout/${listing.event_id}?resale=${listing.listing_id}`}
            className="mb-4 flex w-full items-center justify-center rounded-xl bg-accent-blue py-4 font-label-lg text-label-lg text-white shadow-[0_8px_30px_rgba(29,78,216,0.3)] transition-all hover:bg-accent-blue/90 hover:shadow-[0_8px_30px_rgba(29,78,216,0.5)] hover:-translate-y-1"
          >
            Buy Tickets Now
          </Link>

          <div className="flex items-center justify-center gap-2 text-center text-success">
            <ShieldCheck size={18} />
            <span className="font-label-sm text-label-sm">Secure Checkout Guaranteed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
