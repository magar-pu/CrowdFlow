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
  { value: "bca_va", label: "BCA Virtual Account", icon: Landmark },
  { value: "bni_va", label: "BNI Virtual Account", icon: Landmark },
  { value: "mandiri_bill", label: "Mandiri Bill", icon: Landmark },
  { value: "gopay", label: "GoPay", icon: QrCode },
  { value: "shopeepay", label: "ShopeePay", icon: QrCode },
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
    useState<PaymentMethod>("bca_va");
  const [promo_code, set_promo_code] = useState("");

  const breakdown = useMemo(
    () => calculatePriceBreakdown(cart_items, selected_payment_method),
    [cart_items, selected_payment_method]
  );

  return (
    <main className="mx-auto max-w-container-max px-margin-mobile py-stack-lg md:px-margin-desktop md:py-section-gap">
      {/* Breadcrumb */}
      <div className="mb-stack-md flex flex-wrap items-center gap-2 font-label-sm text-label-sm text-text-secondary md:mb-stack-lg">
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

      {/* Title */}
      <h1 className="mb-6 font-headline-lg text-headline-lg font-bold text-primary">
        Checkout
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        {/* Left column — Order summary */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="flex-1 rounded-2xl border border-border-subtle bg-surface-white p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="mb-6 font-headline-sm text-headline-sm font-bold text-primary">
                Order Summary
              </h2>

              {/* Event details */}
              <div className="mb-6 flex flex-col gap-4 border-b border-border-subtle pb-6 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                />
                <div>
                  <h3 className="font-headline-sm text-base sm:text-lg font-bold text-primary">
                    {event.title}
                  </h3>
                  <p className="mt-1 font-body-sm text-xs sm:text-sm text-text-secondary">
                    {formatEventDateTime(event.starts_at)}
                  </p>
                  <p className="font-body-sm text-xs sm:text-sm text-text-secondary">
                    {event.venue.name}
                  </p>
                </div>
              </div>

              {/* Ticket breakdown */}
              <div className="mb-6 space-y-3">
                {breakdown.lines.map((line) => (
                  <div
                    key={line.cart_item_id}
                    className="flex flex-wrap items-baseline justify-between gap-x-2 font-body-md text-sm text-primary"
                  >
                    <span>
                      {line.quantity}x {line.ticket_category_name}
                    </span>
                    <span className="font-bold">
                      {formatIDR(line.subtotal_face_value)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs sm:text-sm text-text-secondary">
                  <span>Service Fee</span>
                  <span>{formatIDR(breakdown.total_platform_service_fee)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border-subtle pb-4 text-xs sm:text-sm text-text-secondary">
                  <span>
                    Tax ({(breakdown.ppn_tax_rate * 100).toFixed(0)}%)
                  </span>
                  <span>{formatIDR(breakdown.ppn_tax_amount)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 text-base sm:text-lg font-bold text-primary">
                  <span>Total</span>
                  <span>{formatIDR(breakdown.grand_total)}</span>
                </div>
              </div>
            </div>

            {/* Promo code */}
            <div className="pt-4 border-t border-border-subtle/50">
              <label
                htmlFor="promo"
                className="mb-2 block text-xs font-semibold text-text-secondary"
              >
                Promo Code
              </label>
              <div className="flex gap-2">
                <input
                  id="promo"
                  type="text"
                  placeholder="Enter code"
                  value={promo_code}
                  onChange={(e) => set_promo_code(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-border-subtle bg-surface-white px-3.5 py-2.5 text-sm transition-all focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
                <button
                  type="button"
                  onClick={() => on_apply_promo_code?.(promo_code)}
                  className="shrink-0 rounded-xl bg-surface-container-high px-5 py-2.5 text-xs sm:text-sm font-semibold text-primary transition-colors hover:bg-surface-dim cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — Payment selection */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="flex-1 rounded-2xl border border-border-subtle bg-surface-white p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Lock size={20} className="text-success" />
                <h2 className="font-headline-sm text-headline-sm font-bold text-primary">
                  Secure Payment
                </h2>
              </div>
              <p className="mb-6 text-xs sm:text-sm text-text-secondary">
                All transactions are secure and encrypted.
              </p>

              {/* Payment methods (2-column layout) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          "flex items-center justify-between rounded-xl border p-3.5 transition-all h-full",
                          is_selected
                            ? "border-secondary bg-secondary/5 ring-1 ring-secondary shadow-2xs"
                            : "border-border-subtle bg-surface-white hover:border-secondary/60"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-border-subtle">
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full",
                                is_selected ? "bg-secondary" : "bg-transparent"
                              )}
                            />
                          </div>
                          <span className="text-xs sm:text-sm font-semibold text-primary truncate">
                            {option.label}
                          </span>
                        </div>
                        <Icon size={18} className="text-text-secondary shrink-0 ml-1" />
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Confirm */}
            <div className="mt-6 border-t border-border-subtle pt-6">
              <button
                type="button"
                disabled={is_submitting}
                onClick={() => on_confirm(selected_payment_method)}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-primary/10 transition-all cursor-pointer",
                  is_submitting
                    ? "cursor-not-allowed bg-primary/60 text-on-primary"
                    : "bg-primary text-on-primary hover:bg-primary/90"
                )}
              >
                {is_submitting
                  ? "Processing…"
                  : `Pay ${formatIDR(breakdown.grand_total)}`}
                {!is_submitting && <ArrowRight size={18} />}
              </button>
              <p className="mt-2 text-center text-xs text-text-secondary">
                By proceeding, you agree to our Terms &amp; Conditions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}