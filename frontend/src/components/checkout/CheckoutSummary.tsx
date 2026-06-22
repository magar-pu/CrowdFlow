/**
 * components/checkout/CheckoutSummary.tsx
 *
 * Checkout summary + payment selection, matching the CrowdFlow Stitch
 * design ("secure_checkout" screen) exactly: breadcrumb, 7/5 column split,
 * white card with border-subtle + shadow-sm, custom radio payment rows,
 * navy "Pay Rp ..." CTA.
 *
 * Pricing math lives in lib/pricing.ts — this component is presentation-only.
 * Accepts snake_case CartItem[] data and computes the 4%/2% platform fee
 * plus 11% PPN on fees only (FR-022/023/024).
 */

"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  Lock,
  Landmark,
  QrCode,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { calculatePriceBreakdown, formatIDR } from "@/lib/pricing";
import type { CartItem, Event, PaymentMethod } from "@/types/ticket";
import { cn } from "@/lib/utils";

interface CheckoutSummaryProps {
  event: Pick<Event, "title" | "cover_image_url" | "starts_at" | "venue">;
  cart_items: CartItem[];
  breadcrumb_steps?: string[];
  on_apply_promo_code?: (code: string) => void;
  on_confirm: (payment_method: PaymentMethod) => void;
  is_submitting?: boolean;
}

const PAYMENT_METHOD_OPTIONS: {
  value: PaymentMethod;
  label: string;
  icon: typeof Landmark;
}[] = [
  { value: "virtual_account", label: "Virtual Account", icon: Landmark },
  { value: "qris", label: "QRIS", icon: QrCode },
  { value: "credit_card", label: "Credit/Debit Card", icon: CreditCard },
];

function formatEventDateTime(iso_datetime: string): string {
  const date = new Date(iso_datetime);
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function CheckoutSummary({
  event,
  cart_items,
  breadcrumb_steps = ["Detail", "Seats", "Queue", "Checkout"],
  on_apply_promo_code,
  on_confirm,
  is_submitting = false,
}: CheckoutSummaryProps) {
  const [selected_payment_method, set_selected_payment_method] =
    useState<PaymentMethod>("virtual_account");
  const [promo_code, set_promo_code] = useState("");

  const breakdown = useMemo(
    () => calculatePriceBreakdown(cart_items, selected_payment_method),
    [cart_items, selected_payment_method]
  );

  return (
    <main className="mx-auto max-w-container-max px-margin-desktop py-section-gap">
      {/* Breadcrumb */}
      <div className="mb-stack-lg flex items-center gap-2 font-label-sm text-label-sm text-text-secondary">
        {breadcrumb_steps.map((step, index) => {
          const is_last = index === breadcrumb_steps.length - 1;
          return (
            <span key={step} className="flex items-center gap-2">
              <span className={is_last ? "font-bold text-primary" : undefined}>
                {step}
              </span>
              {!is_last && <ChevronRight size={16} />}
            </span>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        {/* Left column — Order summary */}
        <div className="space-y-stack-lg lg:col-span-7">
          <h1 className="font-headline-lg text-headline-lg text-primary">
            Checkout
          </h1>

          <div className="rounded-xl border border-border-subtle bg-surface-white p-stack-lg shadow-sm">
            <h2 className="mb-stack-md font-headline-sm text-headline-sm text-primary">
              Order Summary
            </h2>

            {/* Event details */}
            <div className="mb-stack-lg flex gap-stack-md border-b border-border-subtle pb-stack-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.cover_image_url}
                alt={event.title}
                className="h-24 w-24 rounded-lg object-cover"
              />
              <div>
                <h3 className="font-headline-sm text-headline-sm text-primary">
                  {event.title}
                </h3>
                <p className="mt-1 font-body-sm text-body-sm text-text-secondary">
                  {formatEventDateTime(event.starts_at)}
                </p>
                <p className="font-body-sm text-body-sm text-text-secondary">
                  {event.venue.name}
                </p>
              </div>
            </div>

            {/* Ticket breakdown */}
            <div className="mb-stack-lg space-y-stack-sm">
              {breakdown.lines.map((line) => (
                <div
                  key={line.cart_item_id}
                  className="flex items-center justify-between font-body-md text-body-md text-primary"
                >
                  <span>
                    {line.quantity}x {line.ticket_category_name}
                  </span>
                  <span className="font-bold">
                    {formatIDR(line.subtotal_face_value)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between font-body-sm text-body-sm text-text-secondary">
                <span>Service Fee</span>
                <span>{formatIDR(breakdown.total_platform_service_fee)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border-subtle pb-stack-md font-body-sm text-body-sm text-text-secondary">
                <span>
                  Tax ({(breakdown.ppn_tax_rate * 100).toFixed(0)}%)
                </span>
                <span>{formatIDR(breakdown.ppn_tax_amount)}</span>
              </div>
              <div className="flex items-center justify-between pt-stack-sm font-headline-sm text-headline-sm text-primary">
                <span>Total</span>
                <span>{formatIDR(breakdown.grand_total)}</span>
              </div>
            </div>

            {/* Promo code */}
            <div>
              <label
                htmlFor="promo"
                className="mb-stack-sm block font-label-sm text-label-sm text-text-secondary"
              >
                Promo Code
              </label>
              <div className="flex gap-stack-sm">
                <input
                  id="promo"
                  type="text"
                  placeholder="Enter code"
                  value={promo_code}
                  onChange={(e) => set_promo_code(e.target.value)}
                  className="flex-1 rounded-lg border border-border-subtle bg-surface-white px-3 py-2 font-body-md text-body-md transition-all focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
                <button
                  type="button"
                  onClick={() => on_apply_promo_code?.(promo_code)}
                  className="rounded-lg bg-surface-container-high px-6 py-2 font-label-md text-label-md text-primary transition-colors hover:bg-surface-dim"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — Payment selection */}
        <div className="space-y-stack-lg lg:col-span-5">
          <div className="rounded-xl border border-border-subtle bg-surface-white p-stack-lg shadow-sm">
            <div className="mb-stack-md flex items-center gap-2">
              <Lock size={20} className="text-success" />
              <h2 className="font-headline-sm text-headline-sm text-primary">
                Secure Payment
              </h2>
            </div>
            <p className="mb-stack-lg font-body-sm text-body-sm text-text-secondary">
              All transactions are secure and encrypted.
            </p>

            {/* Payment methods */}
            <div className="space-y-stack-md">
              {PAYMENT_METHOD_OPTIONS.map((option) => {
                const Icon = option.icon;
                const is_selected = selected_payment_method === option.value;
                return (
                  <label key={option.value} className="relative block cursor-pointer">
                    <input
                      type="radio"
                      name="payment_method"
                      checked={is_selected}
                      onChange={() => set_selected_payment_method(option.value)}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-stack-md transition-all",
                        is_selected
                          ? "border-secondary bg-secondary/5"
                          : "border-border-subtle bg-surface-white hover:border-secondary"
                      )}
                    >
                      <div className="flex items-center gap-stack-md">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-border-subtle">
                          <div
                            className={cn(
                              "h-2.5 w-2.5 rounded-full",
                              is_selected ? "bg-secondary" : "bg-transparent"
                            )}
                          />
                        </div>
                        <span className="font-body-md text-body-md font-medium text-primary">
                          {option.label}
                        </span>
                      </div>
                      <Icon size={20} className="text-text-secondary" />
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Confirm */}
            <div className="mt-stack-lg border-t border-border-subtle pt-stack-lg">
              <button
                type="button"
                disabled={is_submitting}
                onClick={() => on_confirm(selected_payment_method)}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg py-4 font-label-md text-label-md shadow-lg shadow-primary/10 transition-all",
                  is_submitting
                    ? "cursor-not-allowed bg-primary/60 text-on-primary"
                    : "bg-primary text-on-primary hover:bg-primary/90"
                )}
              >
                {is_submitting
                  ? "Processing…"
                  : `Pay ${formatIDR(breakdown.grand_total)}`}
                {!is_submitting && <ArrowRight size={20} />}
              </button>
              <p className="mt-stack-sm text-center font-body-sm text-body-sm text-text-secondary">
                By proceeding, you agree to our Terms &amp; Conditions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}