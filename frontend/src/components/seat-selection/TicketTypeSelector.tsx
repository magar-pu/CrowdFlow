/**
 * components/seat-selection/TicketTypeSelector.tsx
 *
 * Mode picker across the top of the seat map.
 *
 * It used to select which single tier the buyer was buying, because a hold
 * covered exactly one tier. Seated holds now span tiers — clicking a seat
 * implies its tier — so seated tiers are no longer a choice to make here. The
 * legend already shows their colours and prices.
 *
 * What remains is the one choice that cannot be made on the map: general
 * admission has no seats to click, so it is picked here, and it stays one tier
 * per hold. Switching between seats and a GA tier clears the other side of the
 * selection, since the two cannot share a hold.
 *
 * Renders nothing when the event has no GA tiers — there is then only one way
 * to buy, and a single dead chip would be noise.
 */

"use client";

import { cn } from "@/lib/utils";
import { formatIDR } from "@/lib/pricing";
import { Armchair } from "lucide-react";

export interface SelectableTier {
  ticket_tier_id: number;
  name: string;
  price: number;
  /** Palette colour, matching the seat fills on the map. */
  color: string;
  /** False for a tier with nothing left to sell. */
  available: boolean;
  /** General admission tiers are bought by quantity, not by seat. */
  is_general_admission: boolean;
}

export type SelectionMode = "seats" | "ga";

interface TicketTypeSelectorProps {
  tiers: SelectableTier[];
  mode: SelectionMode;
  /** Which GA tier is active; null while picking seats. */
  active_ga_tier_id: number | null;
  on_choose_seats: () => void;
  on_choose_ga: (ticket_tier_id: number) => void;
}

export function TicketTypeSelector({
  tiers,
  mode,
  active_ga_tier_id,
  on_choose_seats,
  on_choose_ga,
}: TicketTypeSelectorProps) {
  const ga_tiers = tiers.filter((t) => t.is_general_admission);
  const has_seated = tiers.some((t) => !t.is_general_admission);

  if (ga_tiers.length === 0) return null;

  return (
    <div className="border-b border-border-subtle bg-white px-6 py-3">
      <p className="mb-2 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
        Choose Ticket Type
      </p>
      <div
        role="radiogroup"
        aria-label="Ticket type"
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {has_seated && (
          <button
            type="button"
            role="radio"
            aria-checked={mode === "seats"}
            onClick={on_choose_seats}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-xl border px-4 py-2.5 text-left transition-all",
              mode === "seats"
                ? "border-secondary bg-secondary/10"
                : "border-border-subtle bg-white hover:border-outline"
            )}
          >
            <Armchair size={16} className="shrink-0 text-secondary" />
            <span className="flex flex-col">
              <span className="font-label-md text-label-md font-bold text-text-primary">
                Reserved Seats
              </span>
              <span className="font-label-sm text-label-sm text-text-secondary">
                Pick seats on the map
              </span>
            </span>
          </button>
        )}

        {ga_tiers.map((tier) => {
          const is_active = mode === "ga" && active_ga_tier_id === tier.ticket_tier_id;
          return (
            <button
              key={tier.ticket_tier_id}
              type="button"
              role="radio"
              aria-checked={is_active}
              disabled={!tier.available}
              onClick={() => on_choose_ga(tier.ticket_tier_id)}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-xl border px-4 py-2.5 text-left transition-all",
                is_active
                  ? "border-secondary bg-secondary/10"
                  : "border-border-subtle bg-white hover:border-outline",
                !tier.available && "cursor-not-allowed opacity-40"
              )}
            >
              <span
                aria-hidden
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: tier.color }}
              />
              <span className="flex flex-col">
                <span className="font-label-md text-label-md font-bold text-text-primary">
                  {tier.name}
                  <span className="ml-1.5 font-label-sm text-label-sm font-normal text-text-secondary">
                    (standing)
                  </span>
                </span>
                <span className="font-label-sm text-label-sm text-text-secondary">
                  {tier.available ? formatIDR(tier.price) : "Sold out"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
