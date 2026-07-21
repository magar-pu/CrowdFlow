/**
 * components/seat-selection/SelectionPanel.tsx
 *
 * Right panel — Your Selection + Seat Grid + Order Summary + CTA.
 * Gabungan SeatSelectionPanel lama + SelectionPanel baru.
 */

"use client";

import { ArrowRight, ArrowUp, Hand, Lock, X } from "lucide-react";
import type { SeatSection, SelectedSeat } from "@/types/ticket";
import { formatIDR } from "@/lib/pricing";
import { cn } from "@/lib/utils";

interface SelectionPanelProps {
  // Ticket type
  selected_ticket_type_label: string;
  selected_ticket_type_price: number;
  // Seat state
  active_section: SeatSection | null;
  selected_seats: SelectedSeat[];
  subtotal: number;
  // Handlers
  is_seat_sold: (section_id: string, row: string, seat_number: number) => boolean;
  is_seat_selected: (section_id: string, row: string, seat_number: number) => boolean;
  on_toggle_seat: (section_id: string, section_label: string, row: string, seat_number: number) => void;
  on_remove_seat: (seat_id: string) => void;
  on_proceed: () => void;
}

const SERVICE_FEE_RATE = 0.04;
const TAX_RATE = 0.11;

export function SelectionPanel({
  selected_ticket_type_label,
  selected_ticket_type_price,
  active_section,
  selected_seats,
  subtotal,
  is_seat_sold,
  is_seat_selected,
  on_toggle_seat,
  on_remove_seat,
  on_proceed,
}: SelectionPanelProps) {
  const ticket_count = selected_seats.length;
  const service_fee = Math.round(subtotal * SERVICE_FEE_RATE);
  const tax = Math.round(service_fee * TAX_RATE);
  const total = subtotal + service_fee + tax;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Your Selection header ── */}
      <div className="border-b border-border-subtle px-5 py-4">
        <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
          Your Selection
        </h2>
      </div>

      {/* ── Scrollable middle ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Selected ticket type */}
        <div className="border-b border-border-subtle p-5">
          <div className="flex items-center justify-between rounded-xl border border-border-subtle p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10">
                <span className="text-base">👑</span>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-text-secondary">Selected Ticket Type</p>
                <p className="font-label-md text-label-md font-bold text-text-primary">
                  {selected_ticket_type_label}
                </p>
              </div>
            </div>
            <p className="font-headline-sm text-headline-sm font-bold text-text-primary">
              {formatIDR(selected_ticket_type_price)}
            </p>
          </div>
        </div>

        {/* ── Seat grid ── */}
        <div className="border-b border-border-subtle">
          {/* Seat grid header */}
          <div className="sticky top-0 z-10 border-b border-border-subtle bg-white/90 px-5 py-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-label-md text-label-md font-bold text-text-primary">
                  {active_section ? active_section.label : "Choose Your Seats"}
                </h3>
                {active_section && (
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    {formatIDR(selected_ticket_type_price)} per seat
                  </p>
                )}
              </div>
              <p className="font-headline-sm text-headline-sm font-bold text-text-primary">
                {ticket_count > 0 ? formatIDR(subtotal) : "$0.00"}
              </p>
            </div>
          </div>

          {/* Seat grid content */}
          <div className="p-5">
            {!active_section ? (
              /* Empty state */
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-3 flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className={`h-8 w-6 rounded-t-lg border-2 ${i === 1 ? "border-secondary bg-secondary/10" : "border-border-subtle bg-surface-container"}`} />
                      <div className={`h-1.5 w-8 rounded ${i === 1 ? "bg-secondary/30" : "bg-border-subtle"}`} />
                    </div>
                  ))}
                </div>
                <p className="font-body-sm text-body-sm text-text-secondary">
                  Click on the map to select your seats
                </p>
              </div>
            ) : active_section.rows.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Hand size={32} className="mb-3 text-border-subtle" />
                <p className="font-body-sm text-body-sm text-danger">This section is sold out.</p>
              </div>
            ) : (
              <div>
                {/* Stage direction hint */}
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-text-secondary">Available Seats</span>
                  <div className="flex items-center gap-1 font-label-sm text-label-sm text-text-secondary">
                    <span>Stage</span>
                    <ArrowUp size={14} />
                  </div>
                </div>

                {/* Seat rows */}
                <div className="flex flex-col gap-2">
                  {active_section.rows.map((row) => (
                    <div key={row} className="flex items-center gap-2">
                      <span className="w-4 shrink-0 text-right font-label-sm text-label-sm text-text-secondary">
                        {row}
                      </span>
                      <div className="flex flex-1 flex-wrap gap-1">
                        {Array.from({ length: active_section.seats_per_row }, (_, i) => i + 1).map((seat_number) => {
                          const sold = is_seat_sold(active_section.section_id, row, seat_number);
                          const selected = is_seat_selected(active_section.section_id, row, seat_number);
                          return (
                            <button
                              key={seat_number}
                              type="button"
                              disabled={sold}
                              onClick={() => on_toggle_seat(
                                active_section.section_id,
                                active_section.label,
                                row,
                                seat_number
                              )}
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded text-[9px] font-semibold transition-all duration-150",
                                sold && "cursor-not-allowed border border-border-subtle bg-surface-dim opacity-40",
                                !sold && selected && "scale-110 border border-secondary bg-secondary text-white shadow-sm",
                                !sold && !selected && "cursor-pointer border border-outline-variant bg-surface text-text-primary hover:border-secondary hover:bg-secondary/10"
                              )}
                            >
                              {sold ? "" : seat_number}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected seat tags */}
                {selected_seats.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {selected_seats.map((seat) => (
                      <div
                        key={seat.seat_id}
                        className="flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1"
                      >
                        <span className="font-label-sm text-label-sm text-secondary">
                          {seat.section_label} {seat.row}{seat.seat_number}
                        </span>
                        <button
                          type="button"
                          onClick={() => on_remove_seat(seat.seat_id)}
                          className="text-secondary/60 hover:text-danger"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Order Summary ── */}
        <div className="p-5">
          <h3 className="mb-4 font-label-md text-label-md font-bold text-text-primary">
            Order Summary
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-body-sm text-body-sm text-text-secondary">
                Ticket Price ({ticket_count})
              </span>
              <span className="font-body-sm text-body-sm text-text-primary">
                {formatIDR(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body-sm text-body-sm text-text-secondary">Service Fee</span>
              <span className="font-body-sm text-body-sm text-text-primary">
                {formatIDR(service_fee)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body-sm text-body-sm text-text-secondary">Tax</span>
              <span className="font-body-sm text-body-sm text-text-primary">
                {formatIDR(tax)}
              </span>
            </div>
            <div className="border-t border-border-subtle pt-2.5">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md font-bold text-text-primary">Total</span>
                <span className="font-headline-sm text-headline-sm font-bold text-text-primary">
                  {formatIDR(total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="border-t border-border-subtle p-5">
        <button
          type="button"
          disabled={ticket_count === 0}
          onClick={on_proceed}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-label-md text-label-md text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Proceed to Checkout
          <ArrowRight size={16} />
        </button>
        <div className="mt-2.5 flex items-center justify-center gap-1.5 font-body-sm text-body-sm text-text-secondary">
          <Lock size={12} />
          Your payment is secure and encrypted
        </div>
      </div>
    </div>
  );
}