/**
 * components/seat-selection/SelectionPanel.tsx
 *
 * Right panel of the seat map: what the buyer has chosen, the itemised price,
 * and the CTA into checkout.
 *
 * Two modes:
 *   - assigned seating — chips per chosen seat, grouped by tier. A selection
 *     may span tiers, so this renders one block per tier rather than assuming
 *     a single active one.
 *   - general admission — a quantity stepper for one tier, no seats involved.
 *
 * The price breakdown comes from lib/pricing's calculatePriceBreakdown rather
 * than fees invented here, so this agrees with checkout. The gateway fee is
 * absent by design: no payment method has been chosen yet, and PPN is charged
 * on fees rather than on face value.
 */

"use client";

import { ArrowRight, Lock, Minus, Plus, X } from "lucide-react";
import { formatIDR, calculatePriceBreakdown } from "@/lib/pricing";
import type { CartItem } from "@/types/ticket";
import type { SeatGroup } from "@/lib/hooks/useSeatSelection";
import type { SelectableTier } from "./TicketTypeSelector";

interface SelectionPanelProps {
  event_id: string;
  /** General admission only; null while picking seats. */
  active_tier: SelectableTier | null;
  /** Assigned seating only, grouped by tier; empty in general-admission mode. */
  seat_groups: SeatGroup[];
  /** General admission only. */
  quantity: number;
  max_quantity: number;
  /** Shown when a click was refused, e.g. a tier's per-order cap. */
  notice: string | null;
  is_submitting: boolean;
  on_remove_seat: (seat_id: number) => void;
  on_change_quantity: (next: number) => void;
  on_proceed: () => void;
}

export function SelectionPanel({
  event_id,
  active_tier,
  seat_groups,
  quantity,
  max_quantity,
  notice,
  is_submitting,
  on_remove_seat,
  on_change_quantity,
  on_proceed,
}: SelectionPanelProps) {
  const is_ga = active_tier?.is_general_admission ?? false;
  const seat_count = seat_groups.reduce((n, g) => n + g.seats.length, 0);
  const ticket_count = is_ga ? quantity : seat_count;

  // One cart line per tier. calculatePriceBreakdown already sums across lines,
  // so a mixed selection is priced without special-casing here.
  const cart_items: CartItem[] = is_ga
    ? active_tier && quantity > 0
      ? [
          {
            cart_item_id: `tier-${active_tier.ticket_tier_id}`,
            event_id,
            ticket_category_id: String(active_tier.ticket_tier_id),
            ticket_category_name: active_tier.name,
            sale_channel: "primary",
            unit_face_value: active_tier.price,
            quantity,
            currency: "IDR",
          },
        ]
      : []
    : seat_groups.map((group) => ({
        cart_item_id: `tier-${group.ticket_tier_id}`,
        event_id,
        ticket_category_id: String(group.ticket_tier_id),
        ticket_category_name: group.tier_name,
        sale_channel: "primary" as const,
        unit_face_value: group.unit_face_value,
        quantity: group.seats.length,
        currency: "IDR",
      }));

  const breakdown = calculatePriceBreakdown(cart_items, null);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border-subtle px-5 py-4">
        <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
          Your Selection
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Active tier — general admission only; seated selections show their
            tiers as groups below, since there may be several. */}
        {is_ga && active_tier && (
          <div className="border-b border-border-subtle p-5">
            <div className="flex items-center justify-between rounded-xl border border-border-subtle p-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="h-9 w-9 shrink-0 rounded-full"
                  style={{ backgroundColor: active_tier.color }}
                />
                <div>
                  <p className="font-label-sm text-label-sm text-text-secondary">
                    Selected Ticket Type
                  </p>
                  <p className="font-label-md text-label-md font-bold text-text-primary">
                    {active_tier.name}
                  </p>
                </div>
              </div>
              <p className="font-headline-sm text-headline-sm font-bold text-text-primary">
                {formatIDR(active_tier.price)}
              </p>
            </div>
          </div>
        )}

        {/* Chosen seats / quantity */}
        <div className="border-b border-border-subtle p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-label-md text-label-md font-bold text-text-primary">
              {is_ga ? "Ticket Quantity" : "Selected Seats"}
            </h3>
            <p className="font-headline-sm text-headline-sm font-bold text-text-primary">
              {formatIDR(breakdown.subtotal_face_value)}
            </p>
          </div>

          {is_ga ? (
            <div className="flex items-center justify-between rounded-xl border border-border-subtle p-3">
              <button
                type="button"
                aria-label="Decrease ticket quantity"
                disabled={quantity <= 0}
                onClick={() => on_change_quantity(quantity - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-text-primary transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus size={16} />
              </button>
              <span className="font-headline-sm text-headline-sm font-bold text-text-primary" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Increase ticket quantity"
                disabled={quantity >= max_quantity}
                onClick={() => on_change_quantity(quantity + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-text-primary transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
          ) : seat_groups.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className={`h-8 w-6 rounded-t-lg border-2 ${
                        i === 1
                          ? "border-secondary bg-secondary/10"
                          : "border-border-subtle bg-surface-container"
                      }`}
                    />
                    <div className={`h-1.5 w-8 rounded ${i === 1 ? "bg-secondary/30" : "bg-border-subtle"}`} />
                  </div>
                ))}
              </div>
              <p className="font-body-sm text-body-sm text-text-secondary">
                Click any seat on the map to select it. You can mix ticket types.
              </p>
            </div>
          ) : (
            /* One block per tier — a selection may span several. */
            <div className="space-y-4">
              {seat_groups.map((group) => (
                <div key={group.ticket_tier_id}>
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <p className="font-label-sm text-label-sm font-bold text-text-primary">
                      {group.tier_name}
                      <span className="ml-1.5 font-normal text-text-secondary">
                        × {group.seats.length}
                      </span>
                    </p>
                    <p className="font-label-sm text-label-sm text-text-secondary">
                      {formatIDR(group.unit_face_value * group.seats.length)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.seats.map((seat) => (
                      <div
                        key={seat.seat_id}
                        className="flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1"
                      >
                        <span className="font-label-sm text-label-sm text-secondary">
                          {seat.row}
                          {seat.number}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove seat ${seat.row}${seat.number}`}
                          onClick={() => on_remove_seat(seat.seat_id)}
                          className="text-secondary/60 transition-colors hover:text-danger"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {notice && (
            <p role="status" className="mt-3 font-body-sm text-body-sm text-danger">
              {notice}
            </p>
          )}
        </div>

        {/* Order summary */}
        <div className="p-5">
          <h3 className="mb-4 font-label-md text-label-md font-bold text-text-primary">
            Order Summary
          </h3>
          <div className="space-y-2.5">
            {/* One row per tier so a mixed selection shows what it is made of,
                rather than a single opaque "tickets" line. */}
            {cart_items.map((item) => (
              <div key={item.cart_item_id} className="flex items-center justify-between">
                <span className="font-body-sm text-body-sm text-text-secondary">
                  {item.ticket_category_name} ({item.quantity})
                </span>
                <span className="font-body-sm text-body-sm text-text-primary">
                  {formatIDR(item.unit_face_value * item.quantity)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="font-body-sm text-body-sm text-text-secondary">Service Fee</span>
              <span className="font-body-sm text-body-sm text-text-primary">
                {formatIDR(breakdown.total_platform_service_fee)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body-sm text-body-sm text-text-secondary">
                PPN ({Math.round(breakdown.ppn_tax_rate * 100)}%)
              </span>
              <span className="font-body-sm text-body-sm text-text-primary">
                {formatIDR(breakdown.ppn_tax_amount)}
              </span>
            </div>
            <div className="border-t border-border-subtle pt-2.5">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md font-bold text-text-primary">Total</span>
                <span className="font-headline-sm text-headline-sm font-bold text-text-primary">
                  {formatIDR(breakdown.grand_total)}
                </span>
              </div>
              <p className="mt-1 font-body-sm text-body-sm text-text-secondary">
                Payment fees are calculated once you choose a method.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-border-subtle p-5">
        <button
          type="button"
          disabled={ticket_count === 0 || is_submitting}
          onClick={on_proceed}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-label-md text-label-md text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {is_submitting ? "Securing your seats…" : "Proceed to Checkout"}
          {!is_submitting && <ArrowRight size={16} />}
        </button>
        <div className="mt-2.5 flex items-center justify-center gap-1.5 font-body-sm text-body-sm text-text-secondary">
          <Lock size={12} />
          Your seats are held for 10 minutes once you continue
        </div>
      </div>
    </div>
  );
}
