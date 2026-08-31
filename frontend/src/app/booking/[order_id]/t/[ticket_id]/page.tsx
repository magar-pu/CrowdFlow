"use client";

/**
 * Single-attendee ticket page — /booking/<order_uuid>/t/<ticket_uuid>
 * (plan_2026-08-30_dynamic_qr_ticketman.md, decision 4). Link is the
 * credential; per-ticket links exist specifically so attendees on the same
 * order can't see each other's data. This page fetches the event/venue
 * display context from GET /order-access/{orderId} (never a secret) and
 * hands off to DigitalTicketCard, which independently fetches the actual
 * secret_key from GET /order-access/{orderId}/tickets/{ticketId} — keeping
 * the sensitive fetch scoped to the one component that needs it.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { getOrderAccess, OrderAccessResponse } from "@/lib/api/orderAccess";
import { DigitalTicketCard } from "@/components/your-ticket/DigitalTicketCard";
import { BookingWatermark } from "@/components/your-ticket/BookingWatermark";
import type { PurchasedTicket } from "@/types/ticket";

// "Row ZZ Seat 2" -> { row: "ZZ", seat: "2" }; anything else (e.g. "General
// Admission") is left as the seat_number slot as-is, matching the existing
// convention in app/orders/[order_id]/page.tsx.
function parseSeatLabel(seatLabel: string): { row: string; seat: string } {
  const match = seatLabel.match(/^Row (.+) Seat (.+)$/);
  if (match) return { row: match[1], seat: match[2] };
  return { row: "-", seat: seatLabel };
}

export default function BookingTicketPage() {
  const params = useParams<{ order_id: string; ticket_id: string }>();
  const orderId = params.order_id || "";
  const ticketId = params.ticket_id || "";

  const [order, setOrder] = useState<OrderAccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId || !ticketId) return;
    let isMounted = true;

    async function load() {
      setLoading(true);
      const res = await getOrderAccess(orderId);
      if (!isMounted) return;
      if (res.success && res.data && res.data.tickets.some((t) => t.ticketId === ticketId)) {
        setOrder(res.data);
        setError("");
      } else {
        setError("This ticket link is invalid or has expired.");
      }
      setLoading(false);
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [orderId, ticketId]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <h1 className="text-lg font-bold text-text-primary">Ticket link not found</h1>
        <p className="max-w-sm text-sm text-text-secondary">{error}</p>
      </div>
    );
  }

  const attendee = order.tickets.find((t) => t.ticketId === ticketId)!;
  const { row, seat } = parseSeatLabel(attendee.seatLabel);

  const purchasedTicket: PurchasedTicket = {
    ticket_id: attendee.ticketId,
    order_id: order.orderId,
    event_id: "",
    event_title: order.eventName,
    event_category_label: attendee.tierName,
    cover_image_url: order.coverImageUrl || "",
    starts_at: order.eventStart || "",
    venue_name: order.venueName || "",
    venue_city: order.venueCity || "",
    section: attendee.tierName,
    row,
    seat_number: seat,
    ticket_code: `CF-${attendee.ticketId.substring(0, 8).toUpperCase()}`,
    qr_payload: "",
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center bg-background">
      <BookingWatermark purchaserName={order.purchaserName} orderIdShort={order.orderIdShort} />

      <header className="w-full border-b border-border-subtle bg-surface-white px-6 py-4">
        <span className="font-headline-sm text-headline-sm font-bold text-text-primary">
          CrowdFlow
        </span>
      </header>

      <main className="flex w-full flex-grow flex-col items-center px-6 py-8">
        <DigitalTicketCard ticket={purchasedTicket} />
      </main>
    </div>
  );
}
