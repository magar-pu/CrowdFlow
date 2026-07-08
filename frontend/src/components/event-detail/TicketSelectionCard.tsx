/**
 * components/event-detail/TicketSelectionCard.tsx
 *
 * Sticky right-column ticket category picker. Each TicketCategory renders
 * as a selectable radio row; availability state drives the badge/label:
 *   - quota_remaining === 0           -> "Sold Out", disabled, dimmed
 *   - 0 < quota_remaining <= 50        -> "Only N left" warning + flame icon
 *   - quota_remaining > 50             -> "Available" success label
 * "Premium" pill shows for any category whose face_value is the highest
 * among active categories (mirrors the Stitch VIP example) rather than a
 * hardcoded category name, so this works for any event's category set.
 *
 * Matches event_detail_eras_tour_manila Stitch markup exactly.
 */

"use client";

import { useState } from "react";
import { Flame, CircleCheck, Ban, ArrowRight, Lock } from "lucide-react";
import { formatIDR } from "@/lib/pricing";
import type { TicketCategory } from "@/types/ticket";
import { cn } from "@/lib/utils";

interface TicketSelectionCardProps {
  ticket_categories: TicketCategory[];
  on_continue: (ticket_category_id: string) => void;
}

const LOW_STOCK_THRESHOLD = 50;

export function TicketSelectionCard({
  ticket_categories,
  on_continue,
}: TicketSelectionCardProps) {
  const [selected_id, set_selected_id] = useState<string | null>(null);

  const active_categories = ticket_categories.filter((c) => c.is_active);
  const highest_face_value = Math.max(
    ...active_categories.map((c) => c.face_value),
    0
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-white shadow-[0_8px_30px_-10px_rgba(15,23,42,0.1)]">
      <div className="border-b border-border-subtle bg-surface-bright p-6">
        <h3 className="mb-1 font-headline-sm text-headline-sm font-bold text-primary">
          Select Tickets
        </h3>
        <p className="font-body-sm text-body-sm text-text-secondary">
          Choose your category to proceed to seat selection.
        </p>
      </div>

      <div className="space-y-4 p-6">
        {ticket_categories.map((category) => {
          const is_sold_out =
            !category.is_active || category.quota_remaining === 0;
          const is_low_stock =
            !is_sold_out && category.quota_remaining <= LOW_STOCK_THRESHOLD;
          const is_premium =
            !is_sold_out && category.face_value === highest_face_value;
          const is_selected = selected_id === category.ticket_category_id;

          if (is_sold_out) {
            return (
              <div
                key={category.ticket_category_id}
                className="relative cursor-not-allowed rounded-xl border-2 border-border-subtle bg-surface-container-low p-4 opacity-60"
              >
                <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                  <div>
                    <h4 className="font-label-md text-label-md font-bold text-on-surface-variant">
                      {category.name}
                    </h4>
                    <p className="mt-1 font-body-sm text-body-sm text-outline">
                      {category.description}
                    </p>
                  </div>
                  <span className="block shrink-0 font-headline-sm text-headline-sm font-bold text-on-surface-variant">
                    {formatIDR(category.face_value)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-label-sm text-label-sm text-danger">
                    <Ban size={16} />
                    Sold Out
                  </div>
                </div>
              </div>
            );
          }

          return (
            <label
              key={category.ticket_category_id}
              className="group relative block cursor-pointer"
            >
              <input
                type="radio"
                name="ticket_category"
                checked={is_selected}
                onChange={() => set_selected_id(category.ticket_category_id)}
                className="sr-only"
              />
              <div
                className={cn(
                  "rounded-xl border-2 p-4 transition-all duration-200",
                  is_selected
                    ? "border-secondary shadow-md"
                    : "border-border-subtle bg-surface-white hover:border-secondary hover:shadow-md"
                )}
              >
                <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                  <div>
                    <h4 className="flex flex-wrap items-center gap-2 font-label-md text-label-md font-bold text-primary">
                      {category.name}
                      {is_premium && (
                        <span className="inline-flex items-center rounded bg-secondary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
                          Premium
                        </span>
                      )}
                    </h4>
                    <p className="mt-1 font-body-sm text-body-sm text-text-secondary">
                      {category.description}
                    </p>
                  </div>
                  <span className="block shrink-0 font-headline-sm text-headline-sm font-bold text-primary">
                    {formatIDR(category.face_value)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  {is_low_stock ? (
                    <div className="flex items-center gap-2 font-label-sm text-label-sm text-warning">
                      <Flame size={16} />
                      Only {category.quota_remaining} left
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 font-label-sm text-label-sm text-success">
                      <CircleCheck size={16} />
                      Available
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                      is_selected
                        ? "border-secondary"
                        : "border-outline-variant group-hover:border-secondary"
                    )}
                  >
                    <div
                      className={cn(
                        "h-2.5 w-2.5 rounded-full bg-secondary transition-opacity",
                        is_selected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="border-t border-border-subtle bg-surface-bright p-6">
        <button
          type="button"
          disabled={!selected_id}
          onClick={() => selected_id && on_continue(selected_id)}
          className={cn(
            "group flex w-full items-center justify-center gap-2 rounded-xl py-4 font-label-md text-label-md shadow-sm transition-all duration-200",
            selected_id
              ? "bg-primary text-on-primary hover:bg-primary/90"
              : "cursor-not-allowed bg-surface-dim text-text-secondary"
          )}
        >
          Continue to Seat Selection
          <ArrowRight
            size={18}
            className="transition-transform group-hover:translate-x-1"
          />
        </button>
        <p className="mt-3 flex items-center justify-center gap-1 text-center font-body-sm text-body-sm text-text-secondary">
          <Lock size={14} />
          Secure transaction powered by CrowdFlow
        </p>
      </div>
    </div>
  );
}