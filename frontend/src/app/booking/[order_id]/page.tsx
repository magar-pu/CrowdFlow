"use client";

/**
 * Purchaser's no-login order overview — /booking/<order_uuid>
 * (plan_2026-08-30_dynamic_qr_ticketman.md, decision 4). The order UUID in
 * the URL is the credential; there is no auth gate here beyond that. Lists
 * every ticket on the order and links each attendee to their own
 * /booking/<order_uuid>/t/<ticket_uuid> page — deliberately never shows a
 * secret_key or NIK itself (see OrderAccessResponse in entity.go).
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Ticket as TicketIcon, ChevronRight } from "lucide-react";
import { getOrderAccess, OrderAccessResponse } from "@/lib/api/orderAccess";
import { BookingWatermark } from "@/components/your-ticket/BookingWatermark";

function formatEventDateTime(iso?: string): string {
  if (!iso) return "Upcoming Event";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function BookingOrderPage() {
  const params = useParams<{ order_id: string }>();
  const orderId = params.order_id || "";

  const [data, setData] = useState<OrderAccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    let isMounted = true;

    async function load() {
      setLoading(true);
      const res = await getOrderAccess(orderId);
      if (!isMounted) return;
      if (res.success && res.data) {
        setData(res.data);
        setError("");
      } else {
        setError(res.error?.message || "This booking link is invalid or has expired.");
      }
      setLoading(false);
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <h1 className="text-lg font-bold text-text-primary">Booking link not found</h1>
        <p className="max-w-sm text-sm text-text-secondary">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background">
      <BookingWatermark purchaserName={data.purchaserName} orderIdShort={data.orderIdShort} />

      <header className="border-b border-border-subtle bg-surface-white px-6 py-4">
        <span className="font-headline-sm text-headline-sm font-bold text-text-primary">
          CrowdFlow
        </span>
      </header>

      <main className="mx-auto w-full max-w-[560px] flex-grow px-6 py-8">
        <div className="mb-6 overflow-hidden rounded-xl border border-border-subtle bg-surface-white shadow-sm">
          {data.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.coverImageUrl} alt={data.eventName} className="h-40 w-full object-cover" />
          )}
          <div className="p-5">
            <h1 className="font-headline-sm text-headline-sm font-bold text-text-primary">
              {data.eventName}
            </h1>
            <p className="mt-1 font-body-sm text-body-sm text-text-secondary">
              {formatEventDateTime(data.eventStart)}
            </p>
            {data.venueName && (
              <p className="font-body-sm text-body-sm text-text-secondary">
                {data.venueName}
                {data.venueCity ? `, ${data.venueCity}` : ""}
              </p>
            )}
          </div>
        </div>

        <h2 className="mb-3 font-label-md text-label-md font-semibold uppercase tracking-wider text-text-secondary">
          Tickets on this order
        </h2>

        <div className="flex flex-col gap-2">
          {data.tickets.map((t) => (
            <Link
              key={t.ticketId}
              href={`/booking/${orderId}/t/${t.ticketId}`}
              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-white p-4 shadow-xs transition-colors hover:border-emerald-300"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <TicketIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-label-md text-label-md font-semibold text-text-primary">
                  {t.attendeeFullName}
                </p>
                <p className="truncate font-body-sm text-body-sm text-text-secondary">
                  {t.tierName} · {t.seatLabel}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-400" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
