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

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { PurchaseSuccessHeader } from "@/components/your-ticket/PurchaseSuccessHeader";
import { DigitalTicketCard } from "@/components/your-ticket/DigitalTicketCard";
import { TicketActions } from "@/components/your-ticket/TicketActions";
import ResellTicketModal from "@/components/your-ticket/ResellTicketModal";
import { mockOrder } from "@/mock/eventData";
import { cancelResaleListing } from "@/lib/api/resale";

export default function YourTicketPage() {
  const [show_resell_modal, set_show_resell_modal] = useState(false);
  const [isListed, setIsListed] = useState(false);

  // Load sticky state on mount
  useEffect(() => {
    const listed = localStorage.getItem('dummy_is_listed');
    if (listed === 'true') {
      setIsListed(true);
    }
  }, []);

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

  async function handle_cancel_listing() {
    const listingId = localStorage.getItem('dummy_listing_id');
    if (!listingId) {
      alert("Error: Listing ID not found in local storage.");
      return;
    }

    const res = await cancelResaleListing(listingId);
    if (!res.success) {
      alert(res.error?.message || "Failed to cancel listing.");
      return;
    }

    setIsListed(false);
    localStorage.setItem('dummy_is_listed', 'false');
    localStorage.removeItem('dummy_listing_id');
    alert("Resale listing cancelled successfully. The ticket is back in your possession.");
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
          on_resell_ticket={() => set_show_resell_modal(true)}
          on_cancel_resale={handle_cancel_listing}
          is_listed={isListed}
        />
      </main>

      {show_resell_modal && (
        <ResellTicketModal
          ticketId={ticket.ticket_id}
          originalPrice={100000} // Hardcoded for mock, will come from DB
          onClose={(success, listingId) => {
            set_show_resell_modal(false);
            if (success) {
              setIsListed(true);
              localStorage.setItem('dummy_is_listed', 'true');
              if (listingId) localStorage.setItem('dummy_listing_id', listingId);
            }
          }}
        />
      )}
    </div>
  );
}