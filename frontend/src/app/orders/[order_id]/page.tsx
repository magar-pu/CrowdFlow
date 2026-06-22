"use client";

/**
 * app/orders/[order_id]/page.tsx
 *
 * "Your Ticket" purchase-success page — success header, the digital
 * ticket card (with perforated tear-line + scannable QR), and
 * Wallet/PDF/Share actions. Matches the your_ticket Stitch screen
 * end-to-end.
 *
 * Currently reads from mockOrder regardless of the [order_id] param —
 * swap for `getOrder(order_id)` (lib/api/orders.ts) once the Go endpoint
 * exists. This page only renders the first ticket in the order; multi-
 * ticket orders would need a carousel/list, which isn't in scope yet.
 */

import { Navbar } from "@/components/layout/Navbar";
import { PurchaseSuccessHeader } from "@/components/your-ticket/PurchaseSuccessHeader";
import { DigitalTicketCard } from "@/components/your-ticket/DigitalTicketCard";
import { TicketActions } from "@/components/your-ticket/TicketActions";
import { mockOrder } from "@/mock/eventData";

export default function YourTicketPage() {
  const order = mockOrder; // TODO: replace with getOrder(order_id) once the Go API exists
  const ticket = order.tickets[0];

  function handle_add_to_wallet() {
    // TODO: call the Go endpoint that issues a signed .pkpass file once it exists.
    console.log("Add to Apple Wallet:", ticket.ticket_id);
  }

  function handle_download_pdf() {
    // TODO: call the Go endpoint that renders a printable PDF ticket.
    console.log("Download PDF ticket:", ticket.ticket_id);
  }

  async function handle_share() {
    const share_data = {
      title: ticket.event_title,
      text: `I'm going to ${ticket.event_title}!`,
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(share_data);
      } catch {
        // User cancelled the share sheet — no action needed.
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar active_href="" />

      <main className="mx-auto flex w-full max-w-container-max flex-grow flex-col items-center justify-center px-margin-mobile py-section-gap md:px-margin-desktop">
        <PurchaseSuccessHeader
          event_title={ticket.event_title}
          amount_paid={order.amount_paid}
          user_email={order.user_email}
        />

        <DigitalTicketCard ticket={ticket} />

        <TicketActions
          on_add_to_wallet={handle_add_to_wallet}
          on_download_pdf={handle_download_pdf}
          on_share={handle_share}
        />
      </main>
    </div>
  );
}