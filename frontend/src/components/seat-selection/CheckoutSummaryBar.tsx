/**
 * components/seat-selection/CheckoutSummaryBar.tsx
 *
 * Sticky bottom bar of the right panel: selected-count / max, running
 * subtotal, removable seat tags, and the "Proceed to Checkout" CTA.
 * Matches Stitch markup exactly.
 */

import { X, ArrowRight } from "lucide-react";
import type { SelectedSeat } from "@/types/ticket";
import { formatIDR } from "@/lib/pricing";

interface CheckoutSummaryBarProps {
  selected_seats: SelectedSeat[];
  max_seats: number;
  subtotal: number;
  on_remove_seat: (seat_id: string) => void;
  on_proceed: () => void;
}

export function CheckoutSummaryBar({
  selected_seats,
  max_seats,
  subtotal,
  on_remove_seat,
  on_proceed,
}: CheckoutSummaryBarProps) {
  return (
    <div className="border-t border-border-subtle bg-surface-white p-6 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <span className="mb-1 block font-label-sm text-label-sm text-text-secondary">
            Selected Tickets
          </span>
          <div className="flex gap-2">
            <span className="font-headline-md text-headline-md text-primary">
              {selected_seats.length}
            </span>
            <span className="self-end pb-1 font-body-sm text-body-sm text-text-secondary">
              / {max_seats} max
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="mb-1 block font-label-sm text-label-sm text-text-secondary">
            Subtotal
          </span>
          <span className="font-headline-md text-headline-md text-primary">
            {formatIDR(subtotal)}
          </span>
        </div>
      </div>

      {/* Selected seat tags */}
      <div className="mb-6 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
        {selected_seats.map((seat) => (
          <div
            key={seat.seat_id}
            className="flex items-center gap-2 rounded-full border border-border-subtle bg-surface-container px-3 py-1.5"
          >
            <span className="font-label-sm text-label-sm text-primary">
              {seat.section_label} • {seat.row}
              {seat.seat_number}
            </span>
            <button
              type="button"
              onClick={() => on_remove_seat(seat.seat_id)}
              aria-label={`Remove seat ${seat.row}${seat.seat_number}`}
              className="flex items-center justify-center rounded-full bg-surface-white p-0.5 text-text-secondary shadow-sm transition-colors hover:text-danger"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {selected_seats.length === 0 && (
          <div className="w-full rounded-lg border border-dashed border-border-subtle py-2 text-center">
            <span className="font-body-sm text-body-sm text-text-secondary">
              No seats selected
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={selected_seats.length === 0}
        onClick={on_proceed}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-label-md text-label-md text-white shadow-elevated transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span>Proceed to Checkout</span>
        <ArrowRight size={18} />
      </button>
    </div>
  );
}