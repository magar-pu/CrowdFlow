/**
 * components/event-discovery/EventListingCard.tsx
 *
 * Main event grid card: cover image with status badge + trust badge +
 * favorite button, category label, title, date/venue, an optional
 * urgency/trust line, and a price + "View Event" footer. Matches Stitch
 * markup exactly — badge/trust_signal combinations are data-driven via
 * EventListingBadge / EventListingTrustSignal rather than hardcoded per
 * card, so any event can carry any combination.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  CalendarDays,
  MapPin,
  BadgeCheck,
  ShieldCheck,
  Lock,
  Zap,
  Ban,
  ArrowRight,
} from "lucide-react";
import { formatIDR } from "@/lib/pricing";
import type { EventListingCard as EventListingCardType } from "@/types/ticket";
import { cn } from "@/lib/utils";

interface EventListingCardProps {
  event: EventListingCardType;
}

const BADGE_CONFIG: Record<
  EventListingCardType["badge"],
  { label: string; class_name: string }
> = {
  on_sale: { label: "ON SALE", class_name: "bg-success text-white" },
  selling_fast: { label: "SELLING FAST", class_name: "bg-danger text-white" },
  newly_added: { label: "NEWLY ADDED", class_name: "bg-secondary text-white" },
  sold_out: { label: "SOLD OUT", class_name: "bg-outline text-white" },
};

export function EventListingCard({ event }: EventListingCardProps) {
  const [is_favorited, set_is_favorited] = useState(false);
  const badge = BADGE_CONFIG[event.badge];
  const is_sold_out = event.badge === "sold_out";

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-white shadow-sm transition-all hover:shadow-xl">
      {/* Full card clickable overlay */}
      <Link href={`/events/${event.event_id}`} className="absolute inset-0 z-0" aria-label={`View ${event.title}`} />
      <div className="relative aspect-video overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.cover_image_url}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 flex flex-col gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 font-label-sm text-label-sm shadow-lg",
              badge.class_name
            )}
          >
            {badge.label}
          </span>
          {event.trust_signal === "verified" && (
            <span className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 font-label-sm text-label-sm text-primary backdrop-blur">
              <BadgeCheck size={14} /> Verified
            </span>
          )}
          {event.trust_signal === "identity_required" && (
            <span className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 font-label-sm text-label-sm text-primary backdrop-blur">
              <ShieldCheck size={14} /> Identity Required
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            set_is_favorited((fav) => !fav);
          }}
          aria-label={is_favorited ? "Remove from favorites" : "Add to favorites"}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-all hover:bg-white hover:text-danger"
        >
          <Heart size={20} fill={is_favorited ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4">
          <p className="mb-1 font-label-md text-label-md uppercase tracking-tight text-secondary">
            {event.category_label}
          </p>
          <h3 className="font-headline-sm text-headline-sm text-text-primary transition-colors group-hover:text-secondary">
            {event.title}
          </h3>
        </div>

        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-2 text-body-sm text-text-secondary">
            <CalendarDays size={18} />
            <span>{event.date_label}</span>
          </div>
          <div className="flex items-center gap-2 text-body-sm text-text-secondary">
            <MapPin size={18} />
            <span>{event.venue_label}</span>
          </div>

          {event.trust_signal === "sell_out_warning" && (
            <div className="mt-3 flex items-center gap-2 font-label-md text-label-sm text-danger">
              <Zap size={18} />
              <span>Likely to sell out in 48 hours</span>
            </div>
          )}
          {event.trust_signal === "protection_enabled" && (
            <div className="mt-3 flex items-center gap-2 font-label-md text-label-sm text-secondary">
              <Lock size={18} />
              <span>CrowdFlow Protection Enabled</span>
            </div>
          )}
        </div>

        <div className="relative z-10 mt-auto flex items-center justify-between border-t border-border-subtle pt-4 gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-text-secondary truncate">
              Starting From
            </p>
            <p className="font-bold text-text-primary text-base sm:text-lg whitespace-nowrap">
              {event.starting_price === null
                ? "—"
                : formatIDR(event.starting_price)}
            </p>
          </div>
          {is_sold_out ? (
            <button
              type="button"
              disabled
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-xs text-text-secondary"
            >
              <Ban size={14} /> Sold Out
            </button>
          ) : (
            <span
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-text-primary px-3.5 py-2 font-label-sm text-xs font-bold text-white transition-all group-hover:bg-secondary active:scale-95 shadow-sm"
            >
              View <ArrowRight size={14} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}