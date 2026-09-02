/**
 * components/event-detail/TicketCtaCard.tsx
 *
 * Sticky right-column call-to-action for the event detail page.
 *
 * This replaced a full tier picker. The picker was redundant: the seat
 * selection screen carries its own TicketTypeSelector listing every tier, and
 * it only ever read the event page's choice as a default. It was also the less
 * accurate of the two — it listed tiers from GET /events/{id}/ticket-tiers,
 * while the seat screen derives them from the seat map (assigned + GA), so the
 * two could disagree about what was on offer. Tier choice now happens once, on
 * the screen that owns it.
 */

"use client";

import { ArrowRight, Ban, Lock } from "lucide-react";

interface TicketCtaCardProps {
  /** Cheapest on-sale tier, pre-formatted by the page. */
  starting_price_label: string;
  /** False when no tier is currently public and inside its sales window. */
  has_tickets_on_sale: boolean;
  on_continue: () => void;
  /**
   * Set when the signed-in account can't buy (organizer/auditor/staff — see
   * lib/buyerGate.ts). Replaces the CTA button with this explanation instead
   * of leaving a dead button; unset (signed-out or a buyer account) leaves
   * the normal flow untouched.
   */
  purchase_blocked_reason?: string | null;
}

export function TicketCtaCard({
  starting_price_label,
  has_tickets_on_sale,
  on_continue,
  purchase_blocked_reason,
}: TicketCtaCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-white shadow-[0_8px_30px_-10px_rgba(15,23,42,0.1)]">
      <div className="border-b border-border-subtle bg-surface-bright p-6">
        <h3 className="mb-1 font-headline-sm text-headline-sm font-bold text-primary">
          Tickets
        </h3>
        <p className="font-body-sm text-body-sm text-text-secondary">
          Pick your category and seats on the next screen.
        </p>
      </div>

      {has_tickets_on_sale ? (
        <>
          <div className="p-6">
            <p className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Starting from
            </p>
            <p className="font-headline-sm text-headline-sm font-bold text-primary">
              {starting_price_label}
            </p>
          </div>

          <div className="border-t border-border-subtle bg-surface-bright p-6">
            {purchase_blocked_reason ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-border-subtle bg-surface-white p-4 text-center">
                <Ban size={20} className="text-text-secondary" />
                <p className="font-body-sm text-body-sm text-text-secondary">
                  {purchase_blocked_reason}
                </p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={on_continue}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-label-md text-label-md text-on-primary shadow-sm transition-all duration-200 hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                >
                  Choose tickets &amp; seats
                  <ArrowRight
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </button>
                <p className="mt-3 flex items-center justify-center gap-1 text-center font-body-sm text-body-sm text-text-secondary">
                  <Lock size={14} />
                  Secure transaction powered by CrowdFlow
                </p>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 p-6 py-10 text-center">
          <Ban size={24} className="text-text-secondary" />
          <p className="font-label-md text-label-md text-primary">
            No tickets on sale
          </p>
          <p className="font-body-sm text-body-sm text-text-secondary">
            Ticket sales for this event haven&apos;t opened yet, or have closed.
          </p>
        </div>
      )}
    </div>
  );
}
