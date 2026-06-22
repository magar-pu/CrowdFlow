/**
 * lib/pricing.ts
 *
 * Pure, side-effect-free fee + tax calculations for CrowdFlow checkout.
 * Kept separate from components so it can be unit-tested in isolation and
 * later cross-checked 1:1 against the Go backend's calculation (the backend
 * is the source of truth at payment time — this is for live UI preview only).
 *
 * RULES (from BRD):
 *   FR-022 — Primary ticket fee:  4% of face value
 *   FR-022 — Resale ticket fee:   2% of face value
 *   FR-023 — PPN (tax):          11%, applied ONLY to (platform_service_fee + payment_gateway_fee)
 *                                 — never applied to ticket face value.
 *   FR-024 — Itemized breakdown must be shown before payment confirmation.
 */

import type {
    CartItem,
    PaymentMethod,
    PriceBreakdown,
    PriceBreakdownLine,
  } from "@/types/ticket";
  
  // ─────────────────────────────────────────────────────────────────────────
  // Constants — keep these in one place so a BRD change is a one-line diff
  // ─────────────────────────────────────────────────────────────────────────
  
  export const PLATFORM_FEE_RATE_PRIMARY = 0.04; // FR-022
  export const PLATFORM_FEE_RATE_RESALE = 0.02; // FR-022
  export const PPN_TAX_RATE = 0.11; // FR-023
  
  /**
   * Flat/percentage gateway fees per payment method.
   * Stand-in values for the mock phase — the Go backend will own the
   * authoritative fee table (payment provider contracts change independently
   * of frontend releases).
   */
  const PAYMENT_GATEWAY_FEES: Record<
    PaymentMethod,
    { type: "flat" | "percentage"; value: number }
  > = {
    credit_card: { type: "percentage", value: 0.029 },
    debit_card: { type: "percentage", value: 0.015 },
    virtual_account: { type: "flat", value: 4_000 },
    e_wallet: { type: "percentage", value: 0.02 },
    qris: { type: "percentage", value: 0.007 },
  };
  
  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────
  
  function platformFeeRateFor(saleChannel: CartItem["sale_channel"]): number {
    return saleChannel === "primary"
      ? PLATFORM_FEE_RATE_PRIMARY
      : PLATFORM_FEE_RATE_RESALE;
  }
  
  function calculateGatewayFee(
    paymentMethod: PaymentMethod | null,
    feeableAmount: number
  ): number {
    if (!paymentMethod) return 0;
    const config = PAYMENT_GATEWAY_FEES[paymentMethod];
    if (config.type === "flat") return config.value;
    return Math.round(feeableAmount * config.value);
  }
  
  /** Rounds to the nearest whole Rupiah — IDR has no subunit in practice. */
  function roundCurrency(amount: number): number {
    return Math.round(amount);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Builds the full itemized PriceBreakdown for a cart, per FR-022/023/024.
   *
   * Calculation order is fixed and must not be reordered:
   *   1. Per-line: subtotal_face_value, then platform_service_fee (4% or 2%)
   *   2. Cart-level: sum platform fees -> total_platform_service_fee
   *   3. Cart-level: payment_gateway_fee from the selected payment method
   *   4. PPN base = total_platform_service_fee + payment_gateway_fee (face value excluded)
   *   5. ppn_tax_amount = PPN base * 11%
   *   6. grand_total = subtotal_face_value + total_platform_service_fee + payment_gateway_fee + ppn_tax_amount
   */
  export function calculatePriceBreakdown(
    cartItems: CartItem[],
    paymentMethod: PaymentMethod | null = null
  ): PriceBreakdown {
    const lines: PriceBreakdownLine[] = cartItems.map((item) => {
      const subtotal_face_value = roundCurrency(
        item.unit_face_value * item.quantity
      );
      const platform_service_fee_rate = platformFeeRateFor(item.sale_channel);
      const platform_service_fee = roundCurrency(
        subtotal_face_value * platform_service_fee_rate
      );
  
      return {
        cart_item_id: item.cart_item_id,
        ticket_category_name: item.ticket_category_name,
        sale_channel: item.sale_channel,
        quantity: item.quantity,
        unit_face_value: item.unit_face_value,
        subtotal_face_value,
        platform_service_fee_rate,
        platform_service_fee,
        line_total: subtotal_face_value + platform_service_fee,
      };
    });
  
    const subtotal_face_value = lines.reduce(
      (sum, line) => sum + line.subtotal_face_value,
      0
    );
    const total_platform_service_fee = lines.reduce(
      (sum, line) => sum + line.platform_service_fee,
      0
    );
  
    // Gateway fee is typically computed on (face value + platform fee) by the
    // provider, but only the fee itself (not the face value) feeds into PPN.
    const payment_gateway_fee = calculateGatewayFee(
      paymentMethod,
      subtotal_face_value + total_platform_service_fee
    );
  
    const ppn_taxable_base = total_platform_service_fee + payment_gateway_fee;
    const ppn_tax_amount = roundCurrency(ppn_taxable_base * PPN_TAX_RATE);
  
    const grand_total =
      subtotal_face_value +
      total_platform_service_fee +
      payment_gateway_fee +
      ppn_tax_amount;
  
    return {
      lines,
      currency: "IDR",
      subtotal_face_value,
      total_platform_service_fee,
      payment_method: paymentMethod,
      payment_gateway_fee,
      ppn_tax_rate: PPN_TAX_RATE,
      ppn_taxable_base,
      ppn_tax_amount,
      grand_total,
    };
  }
  
  /** Formats a whole-Rupiah integer as "Rp 1.234.567". */
  export function formatIDR(amount: number): string {
    return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
  }