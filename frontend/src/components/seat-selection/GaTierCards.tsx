/**
 * components/seat-selection/GaTierCards.tsx
 *
 * Fills the main map area with a selectable grid of general-admission tiers
 * when an event has no seat map (or, in GA mode, no seats to draw at all).
 * Replaces the old two-line centred message — same underlying selection
 * (`on_choose` is the page's existing `handle_choose_ga`, not a second
 * selection path), just presented as something a buyer can actually browse
 * and compare instead of only picking from the top strip.
 *
 * Scrolls internally (`overflow-y-auto`) rather than growing past its
 * container, since on mobile this area sits above a bottom sheet capped at
 * max-h-[85vh] — a tall grid must not push that sheet off screen.
 */

"use client";

import { cn } from "@/lib/utils";
import { formatIDR } from "@/lib/pricing";
import { Check } from "lucide-react";
import type { SelectableTier } from "./TicketTypeSelector";

interface GaTierCardsProps {
  /** General-admission tiers only — the page filters before passing these in. */
  tiers: SelectableTier[];
  active_tier_id: number | null;
  on_choose: (ticket_tier_id: number) => void;
}

export function GaTierCards({ tiers, active_tier_id, on_choose }: GaTierCardsProps) {
  return (
    <div className="flex h-full items-start justify-center overflow-y-auto px-6 py-8">
      <div className="w-full max-w-2xl">
        <p className="mb-4 text-center font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
          Choose a ticket type
        </p>
        <div
          role="radiogroup"
          aria-label="Ticket type"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {tiers.map((tier) => {
            const is_active = active_tier_id === tier.ticket_tier_id;
            const sold_out = !tier.available;

            return (
              <button
                key={tier.ticket_tier_id}
                type="button"
                role="radio"
                aria-checked={is_active}
                disabled={sold_out}
                onClick={() => on_choose(tier.ticket_tier_id)}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border p-5 text-left transition-all",
                  is_active
                    ? "border-secondary bg-secondary/10 shadow-sm"
                    : "border-border-subtle bg-white hover:border-outline",
                  sold_out && "cursor-not-allowed opacity-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: tier.color }}
                  />
                  <span className="font-label-md text-label-md font-bold text-text-primary">
                    {tier.name}
                  </span>
                  {sold_out && (
                    <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                      Sold out
                    </span>
                  )}
                  {is_active && (
                    <Check size={16} className="ml-auto shrink-0 text-secondary" />
                  )}
                </div>

                {tier.description && (
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    {tier.description}
                  </p>
                )}

                <div className="mt-auto flex items-end justify-between pt-2">
                  <span
                    className={cn(
                      "font-headline-sm text-headline-sm font-bold",
                      sold_out ? "text-on-surface-variant line-through" : "text-secondary"
                    )}
                  >
                    {formatIDR(tier.price)}
                  </span>
                  {!sold_out && typeof tier.quota_remaining === "number" && (
                    <span className="font-label-sm text-label-sm text-text-secondary">
                      {tier.quota_remaining} left
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
