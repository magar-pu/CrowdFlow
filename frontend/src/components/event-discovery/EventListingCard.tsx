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

import Link from "next/link";
import {
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
  const badge = BADGE_CONFIG[event.badge];
  const is_sold_out = event.badge === "sold_out";

  // Clean date_label to strip out any time string (e.g. " • 02:00 WIB" -> "")
  const cleanDate = (event.date_label || "")
    .replace(/\s*•\s*\d{1,2}:\d{2}(\s*WIB)?/gi, "")
    .trim();

  return (
    <Link
      href={`/events/${event.event_id}`}
      className="bg-surface-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-border-subtle group cursor-pointer flex flex-col h-full"
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.cover_image_url}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
        />
        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider shadow-sm uppercase",
              badge.class_name
            )}
          >
            {badge.label}
          </span>
          {event.trust_signal === "verified" && (
            <span className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary shadow-sm backdrop-blur-md">
              <BadgeCheck size={12} className="text-success shrink-0" /> Verified
            </span>
          )}
          {event.trust_signal === "identity_required" && (
            <span className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary shadow-sm backdrop-blur-md">
              <ShieldCheck size={12} className="text-secondary shrink-0" /> Identity Required
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h4 className="font-display text-lg text-on-surface font-bold mb-2 group-hover:text-accent-blue transition-colors line-clamp-2">
          {event.title}
        </h4>

        <div className="mb-4 space-y-1 text-sm text-on-surface-variant">
          <p className="flex items-center gap-1.5">
            <CalendarDays size={14} className="shrink-0 text-on-surface-variant" />
            <span>{cleanDate}</span>
          </p>

          {event.trust_signal === "sell_out_warning" && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-danger">
              <Zap size={14} />
              <span>Likely to sell out in 48 hours</span>
            </div>
          )}
          {event.trust_signal === "protection_enabled" && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-secondary">
              <Lock size={14} />
              <span>CrowdFlow Protection Enabled</span>
            </div>
          )}
        </div>

        <div className="mt-auto flex justify-between items-center pt-3 border-t border-border-subtle gap-2">
          <div>
            <p className="text-xs text-on-surface-variant mb-0.5">Tickets from</p>
            <p className="font-bold text-accent-blue text-lg">
              {event.starting_price === null
                ? "—"
                : formatIDR(event.starting_price)}
            </p>
          </div>

          {is_sold_out ? (
            <span
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-surface-container px-3 py-1.5 text-xs text-text-secondary opacity-60"
            >
              <Ban size={14} /> Sold Out
            </span>
          ) : (
            <div className="w-8 h-8 bg-surface-container-low text-on-surface rounded-full flex items-center justify-center group-hover:bg-accent-blue group-hover:text-white transition-colors shrink-0">
              <ArrowRight size={16} />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}