"use client";

/**
 * app/(user)/checkout/[event_id]/page.tsx
 *
 * Checkout for a held selection. The cart is rebuilt from the ?hold_token in
 * the URL via GET /booking/holds/{token}, which resolves the tier, the seats
 * and the price server-side.
 *
 * This page previously rendered a hardcoded cart imported from src/mock — two
 * VIP tickets and a resale pass for an event that does not exist — so whatever
 * a buyer picked on the seat map was discarded on arrival. Prices are read from
 * the hold rather than the query string so they cannot be edited by the buyer.
 *
 * A hold lasts 10 minutes. Once it lapses the seats are already back on the
 * map, so an expired token sends the buyer back to seat selection rather than
 * letting them pay for seats they no longer have.
 */

import { useCallback, useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { HoldTimer } from "@/components/booking/HoldTimer";
import { getHold, type HoldDetail } from "@/lib/api/booking";
import { getEvent } from "@/lib/api/events";
import { createOrder } from "@/lib/api/payment";
import { useAuthStore } from "@/lib/store/authStore";
import { useHoldCountdown } from "@/lib/hooks/useHoldCountdown";
import { storeHoldToken } from "@/lib/holdStorage";
import type { CartItem, Event } from "@/types/ticket";

/** The slice of the Midtrans Snap global this page uses. */
interface SnapCallbacks {
  onSuccess?: (result?: any) => void;
  onPending?: (result?: any) => void;
  onError?: (result?: any) => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    snap?: { pay: (token: string, callbacks: SnapCallbacks) => void };
  }
}

const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";

/**
 * Which Snap bundle to load, decided by the client key rather than hardcoded.
 *
 * This URL was pinned to app.sandbox.midtrans.com while the configured keys
 * were production ones, and the backend was pinned to sandbox independently —
 * two hardcodes that had to agree with each other AND with the keys, with
 * nothing checking any of it. Midtrans prefixes sandbox credentials with `SB-`
 * and production ones with nothing, so the key decides here exactly as it does
 * in payment/service.go. Paste a matching pair from one dashboard tab and both
 * ends follow it.
 */
const SNAP_SRC = MIDTRANS_CLIENT_KEY.startsWith("SB-")
  ? "https://app.sandbox.midtrans.com/snap/snap.js"
  : "https://app.midtrans.com/snap/snap.js";

/** The subset of the event CheckoutSummary renders. */
type SummaryEvent = Pick<Event, "title" | "cover_image_url" | "starts_at" | "venue">;

function CheckoutContent() {
  const router = useRouter();
  const params = useParams();
  const search = useSearchParams();

  const paramEventId = Array.isArray(params?.event_id)
    ? params.event_id[0]
    : params?.event_id;
  const hold_token = search?.get("hold_token") ?? "";

  const [hold, set_hold] = useState<HoldDetail | null>(null);
  const [event, set_event] = useState<SummaryEvent | null>(null);
  const [loading, set_loading] = useState(Boolean(hold_token));
  const [load_error, set_load_error] = useState<string | null>(null);
  const [is_submitting, set_is_submitting] = useState(false);

  useEffect(() => {
    if (!hold_token) return;
    let cancelled = false;

    getHold(hold_token)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.success || !res.data) {
          set_load_error(
            res.error?.message ??
              "This seat hold has expired. Please pick your seats again."
          );
          set_loading(false);
          return;
        }

        set_hold(res.data);

        // The event id comes from the hold, not the route: the hold is the
        // authority on what is being bought.
        const evt = await getEvent(res.data.event_id);
        if (cancelled) return;
        if (evt.success && evt.data) set_event(evt.data);
        set_loading(false);
      })
      .catch(() => {
        if (cancelled) return;
        set_load_error("We couldn't load your seat hold. Please try again.");
        set_loading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hold_token]);

  /**
   * The hold ran out while the buyer sat on this page. The seats are already
   * back on the map, so paying now would buy nothing — fall through to the
   * expired screen, which is the same one a dead token lands on.
   *
   * The stored token goes too: without this, going "back to seat selection"
   * would try to restore a hold that no longer exists.
   */
  const handle_hold_expired = useCallback(() => {
    if (hold) storeHoldToken(String(hold.event_id), null);
    set_load_error(
      "Your seat hold expired. The tickets have been released back to the map."
    );
  }, [hold]);

  const { seconds_left: hold_seconds_left, is_expired: hold_expired } =
    useHoldCountdown(hold?.expires_at ?? null, handle_hold_expired);

  // One line per tier: a seated hold may span several, so this mirrors whatever
  // the buyer picked on the map.
  const cart_items: CartItem[] = useMemo(() => {
    if (hold) {
      return hold.items.map((item) => ({
        cart_item_id: `hold-${hold.hold_token}-${item.ticket_tier_id}`,
        event_id: String(hold.event_id),
        ticket_category_id: String(item.ticket_tier_id),
        ticket_category_name: item.tier_name,
        sale_channel: "primary" as const,
        unit_face_value: item.unit_price,
        quantity: item.quantity,
        currency: "IDR",
      }));
    }
    const queryTierId = search.get("ticket_category_id") || search.get("tier_id");
    const queryQuantity = parseInt(search.get("quantity") || "1", 10);
    const queryPrice = parseFloat(search.get("price") || "0");
    const queryName = search.get("name") || search.get("tier_name");
    if (queryTierId && queryPrice > 0) {
      return [
        {
          cart_item_id: `cart_item_${queryTierId}`,
          event_id: String(paramEventId || 1),
          ticket_category_id: queryTierId,
          ticket_category_name: queryName || "Selected Ticket",
          sale_channel: "primary",
          unit_face_value: queryPrice,
          quantity: queryQuantity > 0 ? queryQuantity : 1,
          currency: "IDR",
        },
      ];
    }
    return [];
  }, [hold, search, paramEventId]);

  async function handle_confirm(payment_method: string) {
    // Expiry mid-click: the effect above is about to swap this page out, and
    // the seats are gone either way.
    if (!hold || hold_expired) return;
    set_is_submitting(true);

    try {
      const res = await createOrder({
        event_id: hold ? hold.event_id : Number(paramEventId),
        payment_method,
        cart_items,
      });

      if (!res.success || !res.data?.snap_token) {
        alert("Failed to create order: " + (res.error?.message || "Unknown error"));
        set_is_submitting(false);
        return;
      }

      // Guarded because snap.js is a third-party script that can simply not be
      // there: blocked by an ad blocker, unreachable, or rejected because the
      // client key does not match the bundle. Unguarded, the click threw a
      // TypeError into the console and the button just stopped responding — no
      // message, and the order had already been created server-side.
      if (typeof window.snap?.pay !== "function") {
        alert(
          "The payment window could not be loaded. Please disable any ad blocker for this page and try again — your order has been created and is waiting for payment.",
        );
        set_is_submitting(false);
        return;
      }

      // Open Midtrans Snap Popup
      window.snap.pay(res.data.snap_token, {
        onSuccess: function (result: any) {
          console.log("Payment success:", result);
          const finalOrderId = res.data?.order_id || result?.order_id;
          const userEmail = useAuthStore.getState().user?.email || "";
          const totalAmount = cart_items.reduce((sum, item) => sum + (item.unit_face_value * item.quantity), 0);
          const ticketTitle = cart_items[0]?.ticket_category_name || "Event Ticket";
          router.push(`/orders/${finalOrderId}?amount=${totalAmount}&email=${encodeURIComponent(userEmail)}&title=${encodeURIComponent(ticketTitle)}`);
        },
        onPending: function () {
          alert("Payment is pending. Please complete your payment.");
          set_is_submitting(false);
        },
        onError: function () {
          alert("Payment failed!");
          set_is_submitting(false);
        },
        onClose: function () {
          set_is_submitting(false);
        },
      });
    } catch (err) {
      console.error("Checkout failed:", err);
      set_is_submitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar is_authenticated active_href="" />
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="h-8 w-56 animate-pulse rounded bg-surface-container-low" />
          <div className="mt-6 h-64 animate-pulse rounded-2xl bg-surface-container-low" />
        </div>
      </div>
    );
  }

  if (!hold_token || load_error || !hold || !event) {
    const back_href = paramEventId ? `/events/${paramEventId}/seats` : "/events";
    return (
      <div className="min-h-screen bg-surface">
        <Navbar is_authenticated active_href="" />
        <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
          <h1 className="mb-2 font-headline-md text-headline-md font-bold text-text-primary">
            {hold_token ? "Your seat hold has expired" : "No seats selected"}
          </h1>
          <p className="mb-8 font-body-md text-body-md text-text-secondary">
            {load_error ??
              (hold_token
                ? "We couldn't find the seats you were holding. They have been released back to the map."
                : "This checkout needs a seat selection. Choose your seats to continue.")}
          </p>
          <Link
            href={back_href}
            className="rounded-xl bg-primary px-6 py-3 font-label-md text-label-md text-on-primary transition-opacity hover:opacity-90"
          >
            Pick seats again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Script src={SNAP_SRC} data-client-key={MIDTRANS_CLIENT_KEY} />
      <Navbar is_authenticated active_href="" />

      <div className="mx-auto flex w-full max-w-container-max flex-wrap items-center justify-between gap-3 px-margin-mobile pt-6 md:px-margin-desktop">
        <Link
          href={`/events/${hold.event_id}/seats`}
          className="inline-flex items-center gap-2 rounded-lg py-2 font-label-md text-label-md text-text-secondary transition-colors hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          <ArrowLeft size={18} />
          Back to seat selection
        </Link>

        <HoldTimer
          seconds_left={hold_seconds_left}
          is_expired={hold_expired}
          label="Held for you"
        />
      </div>

      <CheckoutSummary
        event={event}
        cart_items={cart_items}
        is_submitting={is_submitting}
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
