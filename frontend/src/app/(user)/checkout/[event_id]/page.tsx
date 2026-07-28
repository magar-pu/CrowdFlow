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

import { useState, useMemo, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Navbar } from "@/components/layout/Navbar";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { mockEvent, mockOrder, mockTicketCategoryById } from "@/mock/eventData";
import type { CartItem } from "@/types/ticket";
import { createOrder } from "@/lib/api/payment";
import { useAuthStore } from "@/lib/store/authStore";

declare global {
  interface Window {
    snap: any;
  }
}

// Default fallback demo items when page is accessed directly without query params
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

function CheckoutContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [is_submitting, set_is_submitting] = useState(false);

  // Parse event_id from URL params or fallback to an existing DB event (id: 4)
  const paramEventId = Array.isArray(params?.event_id) ? params.event_id[0] : params?.event_id;
  const parsedId = parseInt(paramEventId as string, 10);
  const targetEventId = (!isNaN(parsedId) && parsedId > 1) ? parsedId : 4;

  const queryTierId = searchParams.get("ticket_category_id") || searchParams.get("tier_id");
  const queryQuantity = parseInt(searchParams.get("quantity") || "1", 10);
  const queryPrice = parseFloat(searchParams.get("price") || "0");
  const queryName = searchParams.get("name") || searchParams.get("tier_name");

  // Dynamically compute active cart items from URL query params
  const cart_items: CartItem[] = useMemo(() => {
    if (queryTierId && queryPrice > 0) {
      return [
        {
          cart_item_id: `cart_item_${queryTierId}`,
          event_id: String(targetEventId),
          ticket_category_id: queryTierId,
          ticket_category_name: queryName || "Selected Ticket",
          sale_channel: "primary",
          unit_face_value: queryPrice,
          quantity: queryQuantity > 0 ? queryQuantity : 1,
          currency: "IDR",
        },
      ];
    }
    return demo_cart_items;
  }, [queryTierId, queryPrice, queryName, queryQuantity, targetEventId]);

  async function handle_confirm(payment_method: string) {
    set_is_submitting(true);
    console.log("Confirmed with payment method:", payment_method);
    
    try {
      // 1. Call backend to create order and get snap_token
      const res = await createOrder({
        event_id: targetEventId,
        payment_method: payment_method,
        cart_items: cart_items,
      });

      if (!res.success || !res.data?.snap_token) {
        alert("Failed to create order: " + (res.error?.message || "Unknown error"));
        set_is_submitting(false);
        return;
      }

      // 2. Open Midtrans Snap Popup
      window.snap.pay(res.data.snap_token, {
        onSuccess: function (result: any) {
          console.log("Payment success:", result);

          // Notify backend webhook for localhost testing so E-Ticket email is dispatched immediately
          fetch("/api/v1/payment/webhook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: result?.order_id || res.data?.order_id,
              transaction_status: result?.transaction_status || "settlement",
              transaction_id: result?.transaction_id || "LOCAL_SETTLEMENT",
            }),
          }).catch((err) => console.error("Failed to notify backend webhook:", err));

          // Add the ticket to local storage to simulate buying
          const boughtTicket = {
            ticket_id: "123e4567-e89b-12d3-a456-426614174001",
            order_id: res.data?.order_id || "ORD-NEW",
            event_title: "Soundscape Festival 2026",
            cover_image_url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=900&auto=format&fit=crop",
            date_label: "Sat, Sep 12 • 7:30 PM",
            venue_name: "Gelora Bung Karno Stadium",
            section_label: "102",
            ticket_type: cart_items[0]?.ticket_category_name || "VIP Experience",
            quantity: cart_items[0]?.quantity || 1,
            status: "confirmed",
            tab: "upcoming",
          };

          const existingStr = localStorage.getItem('demo_tickets');
          const existing = existingStr ? JSON.parse(existingStr) : [];
          if (!existing.find((t: any) => t.ticket_id === boughtTicket.ticket_id)) {
            localStorage.setItem('demo_tickets', JSON.stringify([boughtTicket, ...existing]));
          }

          const finalOrderId = res.data?.order_id || result?.order_id || mockOrder.order_id;
          const userEmail = useAuthStore.getState().user?.email || "";
          const totalAmount = cart_items.reduce((sum, item) => sum + (item.unit_face_value * item.quantity), 0);
          const ticketTitle = cart_items[0]?.ticket_category_name || "Event Ticket";
          router.push(`/orders/${finalOrderId}?amount=${totalAmount}&email=${encodeURIComponent(userEmail)}&title=${encodeURIComponent(ticketTitle)}`);
        },
        onPending: function (result: any) {
          console.log("Payment pending:", result);
          alert("Payment is pending. Please complete your payment.");
          set_is_submitting(false);
        },
        onError: function (result: any) {
          console.log("Payment error:", result);
          alert("Payment failed!");
          set_is_submitting(false);
        },
        onClose: function () {
          console.log("Customer closed the popup without finishing the payment");
          set_is_submitting(false);
        },
      });
    } catch (err) {
      console.error(err);
      set_is_submitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
      />
      <Navbar is_authenticated active_href="" />
      <CheckoutSummary
        event={mockEvent}
        cart_items={cart_items}
        is_submitting={is_submitting}
        on_apply_promo_code={(code) => {
          console.log("Applying promo code:", code);
        }}
        on_confirm={handle_confirm}
      />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}