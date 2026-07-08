"use client";

/**
 * app/(user)/checkout/[event_id]/page.tsx
 *
 * Example wiring: turns mock TicketCategory selections into CartItem[],
 * then hands them to <CheckoutSummary>. This is what an organizer/user
 * checkout page would look like end-to-end during the mock phase.
 *
 * on_confirm currently simulates a brief "processing" delay then redirects
 * to the Your Ticket page using mockOrder.order_id — there's no real
 * payment or order creation yet. Once the Go backend exists, replace the
 * setTimeout below with `await fetch('/api/v1/orders', { method: 'POST', ... })`
 * and redirect using the real order_id from that response instead.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { mockEvent, mockOrder, mockTicketCategoryById } from "@/mock/eventData";
import type { CartItem } from "@/types/ticket";

// In the real app this comes from useCartStore() (Zustand). Hardcoded here
// purely to demonstrate CheckoutSummary with realistic data shape.
const demo_cart_items: CartItem[] = [
  {
    cart_item_id: "cart_item_001",
    event_id: "evt_001_soundscape_festival_2026",
    ticket_category_id: "tc_001_vip_experience",
    ticket_category_name: mockTicketCategoryById["tc_001_vip_experience"].name,
    sale_channel: "primary",
    unit_face_value:
      mockTicketCategoryById["tc_001_vip_experience"].face_value,
    quantity: 2,
    currency: "IDR",
  },
  {
    cart_item_id: "cart_item_002",
    event_id: "evt_001_soundscape_festival_2026",
    ticket_category_id: "tc_004_resale_festival_pass",
    ticket_category_name:
      mockTicketCategoryById["tc_004_resale_festival_pass"].name,
    sale_channel: "resale",
    unit_face_value:
      mockTicketCategoryById["tc_004_resale_festival_pass"].face_value,
    quantity: 1,
    currency: "IDR",
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [is_submitting, set_is_submitting] = useState(false);

  function handle_confirm(payment_method: string) {
    // TODO: replace with a real POST /api/v1/orders call once the Go
    // backend exists. The 1.2s delay here just simulates network latency
    // so the "Processing..." button state is visible during testing.
    set_is_submitting(true);
    console.log("Confirmed with payment method:", payment_method);
    setTimeout(() => {
      router.push(`/orders/${mockOrder.order_id}`);
    }, 1200);
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar is_authenticated active_href="" />
      <CheckoutSummary
        event={mockEvent}
        cart_items={demo_cart_items}
        is_submitting={is_submitting}
        on_apply_promo_code={(code) => {
          // Next step: POST /api/v1/promo-codes/validate with { code, event_id }
          console.log("Applying promo code:", code);
        }}
        on_confirm={handle_confirm}
      />
    </div>
  );
}