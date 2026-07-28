/**
 * components/seat-selection/MapLegend.tsx
 *
 * Legend for the buyer's seat map: the event's real tiers, then the states a
 * seat can be in. Previously five invented tiers at USD prices.
 *
 * The state swatches mirror LayoutPreview's own constants — seats it cannot
 * offer are drawn at reduced opacity, which is what "Tidak tersedia" covers.
 */

"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { formatIDR } from "@/lib/pricing";
import type { SelectableTier } from "./TicketTypeSelector";

/**
 * Kept in step with LayoutPreview.
 *
 * "Selected" is a ring rather than a fill, because that is how the map draws
 * it: a selected seat keeps its tier colour and gains a dark ring. Showing a
 * solid blue swatch here was doubly wrong — it matched no seat on the map, and
 * the blue it used is TIER_PALETTE[0], so it collided with the cheapest tier's
 * own entry directly above it in this legend.
 */
const STATE_ITEMS: { label: string; color?: string; ring?: boolean }[] = [
  { label: "Selected", ring: true },
  { label: "Unavailable", color: "#cbd5e1" },
];

interface MapLegendProps {
  tiers: SelectableTier[];
}

export function MapLegend({ tiers }: MapLegendProps) {
  const [is_open, set_is_open] = useState(false);

  return (
    <div className="absolute bottom-32 left-4 z-10 w-[160px] rounded-xl border border-border-subtle bg-white/95 shadow-elevated backdrop-blur-md md:bottom-28 md:left-6 md:w-auto">
      {/* Mobile Toggle */}
      <button
        type="button"
        className="flex w-full items-center justify-between p-3 font-label-sm text-label-sm font-bold uppercase tracking-wider text-text-secondary md:hidden"
        onClick={() => set_is_open(!is_open)}
      >
        Legend
        {is_open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      <div className={`flex-col gap-2 p-3 pt-0 md:flex md:p-4 ${is_open ? "flex" : "hidden"}`}>
        <h3 className="mb-1 hidden font-label-sm text-label-sm font-bold uppercase tracking-wider text-text-secondary md:block">
          Legend
        </h3>

        {tiers
          .filter((t) => !t.is_general_admission)
          .map((tier) => (
            <div key={tier.ticket_tier_id} className="flex items-center justify-between gap-3 md:gap-6">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full border border-white/50 shadow-sm md:h-4 md:w-4"
                  style={{ backgroundColor: tier.color }}
                />
                <span className="font-body-sm text-xs text-text-primary md:text-sm">{tier.name}</span>
              </div>
              <span className="font-label-sm text-[10px] text-text-secondary md:text-xs">
                {formatIDR(tier.price)}
              </span>
            </div>
          ))}

        <div className="mt-1 border-t border-border-subtle pt-2">
          {STATE_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2 py-0.5">
              {item.ring ? (
                // Neutral fill so the ring is what reads, exactly as on the map
                // where the fill underneath is whatever tier the seat is in.
                <div
                  className="h-3 w-3 rounded-full border-2 border-[#0f172a] bg-surface-container-low md:h-4 md:w-4"
                />
              ) : (
                <div
                  className="h-3 w-3 rounded-full border border-white/50 shadow-sm md:h-4 md:w-4"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span className="font-body-sm text-xs text-text-primary md:text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
