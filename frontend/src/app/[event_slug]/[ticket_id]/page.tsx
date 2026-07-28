"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { PurchaseSuccessHeader } from "@/components/your-ticket/PurchaseSuccessHeader";
import { DigitalTicketCard } from "@/components/your-ticket/DigitalTicketCard";
import { TicketActions } from "@/components/your-ticket/TicketActions";
import { getMyTickets, UserTicket } from "@/lib/api/tickets";
import { generateTicketPdf } from "@/utils/generateTicketPdf";
import type { PurchasedTicket } from "@/types/ticket";

export default function EventTicketSlugPage() {
  const params = useParams<{ event_slug: string; ticket_id: string }>();
  const eventSlugParam = params.event_slug || "events-test";
  const ticketIdParam = params.ticket_id || "a04bb786-f3b2-45a3-af5e-49ea4cef4570";

  const [loading, setLoading] = useState(true);

  // Format readable event title from slug
  const formattedEventTitle = eventSlugParam
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const [currentTicket, setCurrentTicket] = useState<PurchasedTicket>({
    ticket_id: ticketIdParam,
    order_id: "bbf302e9-ee42-4706-87c3-575476d7db5a",
    event_id: "18",
    event_title: formattedEventTitle || "Events Test",
    event_category_label: "VIP Pass",
    cover_image_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=900&auto=format&fit=crop",
    starts_at: new Date().toISOString(),
    venue_name: "Gelora Bung Karno Stadium",
    venue_city: "Jakarta",
    section: "VIP",
    row: "A",
    seat_number: "General Seating",
    ticket_code: `CF-${ticketIdParam.substring(0, 8).toUpperCase()}`,
    qr_payload: "",
  });

  const [orderAmount, setOrderAmount] = useState<number>(150000);
  const [userEmail, setUserEmail] = useState<string>("super-admin@crowdflow.my.id");

  useEffect(() => {
    async function loadDynamicTicket() {
      setLoading(true);
      try {
        const res = await getMyTickets();
        if (res.success && res.data?.tickets && res.data.tickets.length > 0) {
          const matched = res.data.tickets.find(
            (t: UserTicket) => t.id === ticketIdParam || t.orderId === ticketIdParam
          ) || res.data.tickets[0];

          if (matched) {
            setCurrentTicket({
              ticket_id: matched.id,
              order_id: matched.orderId,
              event_id: String(matched.eventId),
              event_title: matched.eventName || formattedEventTitle,
              event_category_label: matched.tierName || "VIP Pass",
              cover_image_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=900&auto=format&fit=crop",
              starts_at: matched.createdAt || new Date().toISOString(),
              venue_name: "Gelora Bung Karno Stadium",
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
  }, [ticketIdParam, formattedEventTitle]);

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
        />
      </main>
    </div>
  );
}
