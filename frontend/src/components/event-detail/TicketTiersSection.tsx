/**
 * components/event-detail/TicketTiersSection.tsx
 *
 * "Ticket Types & Prices" card for the buyer's event page.
 *
 * Reads the same `listTicketTiers` result the page already loads for its
 * "starting from" price, so this adds no request. That endpoint returns only
 * tiers that are public and inside their sales window, which means an empty
 * list is a legitimate "nothing on sale" state, not an error — and a tier the
 * organizer has hidden or whose window has closed correctly never appears here.
 *
 * Nothing is shown that the tier row does not carry: no seat maps, no urgency
 * copy, no invented perks. `quota_remaining` is reported only as sold out or
 * not, since the raw number is a stock figure rather than a promise to the
 * buyer.
 */

import { Ticket } from "lucide-react";
import { formatIDR } from "@/lib/pricing";
import type { PublicTicketTier } from "@/lib/api/events";

interface TicketTiersSectionProps {
  tiers: PublicTicketTier[];
  /** Tiers load independently of the event, so an inflight request must render
   *  as a skeleton rather than as "nothing on sale". */
  loading?: boolean;
}

export function TicketTiersSection({ tiers, loading = false }: TicketTiersSectionProps) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-white p-6 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] md:p-8">
      <h2 className="mb-6 flex items-center gap-3 font-headline-md text-headline-md font-bold text-primary">
        <Ticket size={24} className="text-secondary" />
        Ticket Types &amp; Prices
      </h2>

      {loading ? (
        <ul className="divide-y divide-border-subtle" aria-hidden="true">
          {[0, 1, 2].map((row) => (
            <li
              key={row}
              className="flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0"
            >
              <div className="w-full space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-surface-container-high" />
                <div className="h-3 w-48 animate-pulse rounded bg-surface-container-high" />
              </div>
              <div className="h-5 w-24 shrink-0 animate-pulse rounded bg-surface-container-high" />
            </li>
          ))}
        </ul>
      ) : tiers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface-container-lowest px-6 py-8 text-center">
          <Ticket size={28} className="mx-auto mb-3 text-on-surface-variant opacity-40" />
          <p className="font-body-md text-body-md text-on-surface-variant">
            No ticket types are on sale right now.
          </p>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant/70">
            Check back closer to the event date.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {tiers.map((tier) => {
            const sold_out = tier.quota_remaining <= 0;

            return (
              <li
                key={tier.ticket_tier_id}
                className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-label-md text-label-md font-bold text-primary">
                      {tier.name}
                    </h3>
                    {sold_out && (
                      <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                        Sold out
                      </span>
                    )}
                  </div>
                  {tier.description && (
                    <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                      {tier.description}
                    </p>
                  )}
                </div>

                <div className="shrink-0 sm:text-right">
                  <p
                    className={`font-headline-sm text-headline-sm font-bold ${
                      sold_out ? "text-on-surface-variant line-through" : "text-secondary"
                    }`}
                  >
                    {formatIDR(tier.price)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
