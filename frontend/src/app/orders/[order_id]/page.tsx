"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { PurchaseSuccessHeader } from "@/components/your-ticket/PurchaseSuccessHeader";
import { DigitalTicketCard } from "@/components/your-ticket/DigitalTicketCard";
import { TicketActions } from "@/components/your-ticket/TicketActions";
import ResellTicketModal from "@/components/your-ticket/ResellTicketModal";
import { getMyTickets, UserTicket } from "@/lib/api/tickets";
import { cancelResaleListing } from "@/lib/api/resale";
import { generateTicketPdf } from "@/utils/generateTicketPdf";
import type { PurchasedTicket, Order } from "@/types/ticket";

export default function YourTicketPage() {
  const params = useParams<{ order_id: string }>();
  const orderIdParam = params.order_id || "";

  const [show_resell_modal, set_show_resell_modal] = useState(false);
  const [isListed, setIsListed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTicket, setCurrentTicket] = useState<PurchasedTicket>({
    ticket_id: orderIdParam || "test-ticket-id",
    order_id: orderIdParam || "test-order-id",
    event_id: "18",
    event_title: "events test",
    event_category_label: "VIP Test Tier",
    cover_image_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=900&auto=format&fit=crop",
    starts_at: new Date().toISOString(),
    venue_name: "Jakarta Convention Center",
    venue_city: "Jakarta",
    section: "VIP",
    row: "A",
    seat_number: "General Seating",
    ticket_code: `CF-${(orderIdParam || "TEST").substring(0, 8).toUpperCase()}`,
    qr_payload: "",
  });

  const [orderAmount, setOrderAmount] = useState<number>(150000);
  const [userEmail, setUserEmail] = useState<string>("admin@crowdflow.my.id");

  // Load sticky state & fetch dynamic ticket from DB
  useEffect(() => {
    const listed = localStorage.getItem("dummy_is_listed");
    if (listed === "true") {
      setIsListed(true);
    }

    async function loadDynamicTicket() {
      setLoading(true);
      try {
        const res = await getMyTickets();
        if (res.success && res.data?.tickets && res.data.tickets.length > 0) {
          const matched = res.data.tickets.find(
            (t: UserTicket) => t.orderId === orderIdParam || t.id === orderIdParam
          ) || res.data.tickets[0];

          if (matched) {
            setCurrentTicket({
              ticket_id: matched.id,
              order_id: matched.orderId,
              event_id: String(matched.eventId),
              event_title: matched.eventName || "events test",
              event_category_label: matched.tierName || "VIP Pass",
              cover_image_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=900&auto=format&fit=crop",
              starts_at: matched.createdAt || new Date().toISOString(),
              venue_name: "Jakarta Convention Center",
              venue_city: "Jakarta",
              section: "VIP",
              row: "A",
              seat_number: matched.seatLabel || "GA",
              ticket_code: `CF-${matched.id.substring(0, 8).toUpperCase()}`,
              qr_payload: "",
            });
            if (matched.unitPrice) setOrderAmount(matched.unitPrice);
            if (matched.attendeeEmail) setUserEmail(matched.attendeeEmail);
          }
        }
      } catch (err) {
        console.warn("Failed to load ticket from API:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDynamicTicket();
  }, [orderIdParam]);

  function handle_add_to_wallet() {
    console.log("Add to Apple Wallet:", currentTicket.ticket_id);
  }

  function handle_download_pdf() {
    generateTicketPdf(currentTicket, orderAmount, userEmail);
  }

  async function handle_share() {
    const share_data = {
      title: currentTicket.event_title,
      text: `I'm going to ${currentTicket.event_title}!`,
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(share_data);
      } catch {
        // User cancelled share
      }
    }
  }

  async function handle_cancel_listing() {
    const listingId = localStorage.getItem('dummy_listing_id');
    if (listingId) {
      const res = await cancelResaleListing(listingId);
      if (!res.success) {
        alert(res.error?.message || "Failed to cancel listing.");
        return;
      }
    }

    setIsListed(false);
    localStorage.removeItem('dummy_is_listed');
    localStorage.removeItem('dummy_listing_id');
    alert("Resale listing cancelled. The ticket is back in your possession.");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar active_href="" />

      <main className="mx-auto flex w-full max-w-container-max flex-grow flex-col items-center justify-center px-margin-mobile py-section-gap md:px-margin-desktop">
        <PurchaseSuccessHeader
          event_title={currentTicket.event_title}
          amount_paid={orderAmount}
          user_email={userEmail}
        />

        <DigitalTicketCard ticket={currentTicket} />

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
          ticketId={currentTicket.ticket_id}
          originalPrice={currentTicket ? orderAmount : 150000}
          onClose={(success, listingId) => {
            set_show_resell_modal(false);
            if (success) {
              setIsListed(true);
              localStorage.setItem("dummy_is_listed", "true");
              if (listingId) localStorage.setItem("dummy_listing_id", listingId);
            }
          }}
        />
      )}
    </div>
  );
}