/**
 * components/seat-selection/TicketTypeSelector.tsx
 *
 * Tier picker across the top of the seat map, built from the event's real
 * tiers. Choosing a tier both filters which seats are clickable and decides
 * which tier the hold is taken against — a hold covers exactly one tier.
 *
 * Previously this listed five invented tiers at USD prices on an IDR platform.
 */

"use client";

import { cn } from "@/lib/utils";
import { formatIDR } from "@/lib/pricing";

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

interface TicketTypeSelectorProps {
  tiers: SelectableTier[];
  active_tier_id: number | null;
  on_select: (ticket_tier_id: number) => void;
}

export function TicketTypeSelector({
  tiers,
  active_tier_id,
  on_select,
}: TicketTypeSelectorProps) {
  if (tiers.length === 0) return null;

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
        {tiers.map((tier) => {
          const is_active = active_tier_id === tier.ticket_tier_id;
          return (
            <button
              key={tier.ticket_tier_id}
              type="button"
              role="radio"
              aria-checked={is_active}
              disabled={!tier.available}
              onClick={() => on_select(tier.ticket_tier_id)}
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
                  {tier.is_general_admission && (
                    <span className="ml-1.5 font-label-sm text-label-sm font-normal text-text-secondary">
                      (bebas tempat)
                    </span>
                  )}
                </span>
                <span className="font-label-sm text-label-sm text-text-secondary">
                  {tier.available ? formatIDR(tier.price) : "Habis"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
