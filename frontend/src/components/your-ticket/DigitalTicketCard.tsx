"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, ShieldCheck, Clock } from "lucide-react";
import { getTicketQR, TicketQRResponse } from "@/lib/api/tickets";
import type { PurchasedTicket } from "@/types/ticket";

interface DigitalTicketCardProps {
  ticket: PurchasedTicket;
}

function formatTicketDateTime(iso_datetime: string): string {
  if (!iso_datetime) return "Upcoming Event";
  const date = new Date(iso_datetime);
  if (isNaN(date.getTime())) return iso_datetime;
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

export function DigitalTicketCard({ ticket }: DigitalTicketCardProps) {
  const ticketId = ticket.ticket_id;
  const [qrToken, setQrToken] = useState<string>(ticket.qr_payload || ticketId);
  const [refreshSeconds, setRefreshSeconds] = useState<number>(600);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch dynamic 10-minute token from backend
  const fetchDynamicQR = async () => {
    if (!ticketId) return;
    setIsLoading(true);
    try {
      const res = await getTicketQR(ticketId);
      if (res.success && res.data) {
        setQrToken(res.data.secureToken);
        setRefreshSeconds(res.data.refreshInSeconds || 600);
      }
    } catch (err) {
      console.warn("Using fallback token for ticket:", ticketId);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDynamicQR();
  }, [ticketId]);

  // Countdown timer for 10-minute rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshSeconds((prev) => {
        if (prev <= 1) {
          fetchDynamicQR();
          return 600;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [ticketId]);

  const minutes = Math.floor(refreshSeconds / 60);
  const seconds = refreshSeconds % 60;
  const countdownText = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="relative flex w-full max-w-[420px] flex-col rounded-xl border border-border-subtle bg-surface-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] select-none">
      {/* Cover image with title overlay */}
      <div className="relative h-48 w-full overflow-hidden rounded-t-xl bg-surface-container-high">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ticket.cover_image_url || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop"}
          alt={ticket.event_title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-6 right-6">
          <span className="mb-2 inline-block rounded bg-surface-white/20 px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-surface-white backdrop-blur-md">
            {ticket.event_category_label || "Event Ticket"}
          </span>
          <h2 className="font-headline-sm text-headline-sm text-surface-white font-bold">
            {ticket.event_title}
          </h2>
        </div>
      </div>

      {/* Date / Venue */}
      <div className="p-6 pb-2">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="mb-1 font-body-sm text-body-sm text-text-secondary">
              Date &amp; Time
            </p>
            <p className="font-label-md text-label-md text-text-primary font-semibold">
              {formatTicketDateTime(ticket.starts_at)}
            </p>
          </div>
        </div>
        <div className="mb-2 flex items-start justify-between">
          <div>
            <p className="mb-1 font-body-sm text-body-sm text-text-secondary">
              Venue
            </p>
            <p className="font-label-md text-label-md text-text-primary font-semibold">
              {ticket.venue_name || "Main Venue"}
            </p>
            {ticket.venue_city && (
              <p className="font-body-sm text-body-sm text-text-secondary">
                {ticket.venue_city}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Perforated tear line */}
      <div className="relative my-2 flex h-8 w-full items-center justify-between">
        <div className="absolute left-[-16px] z-10 h-8 w-8 rounded-full border-r border-border-subtle bg-background shadow-[inset_-4px_0_6px_rgba(0,0,0,0.02)]" />
        <div className="mx-4 w-full border-t-2 border-dashed border-border-subtle" />
        <div className="absolute right-[-16px] z-10 h-8 w-8 rounded-full border-l border-border-subtle bg-background shadow-[inset_4px_0_6px_rgba(0,0,0,0.02)]" />
      </div>

      {/* Sec / Row / Seat + Dynamic QR */}
      <div className="flex flex-col items-center p-6 pt-2">
        <div className="mb-5 grid w-full grid-cols-3 gap-4 rounded-lg bg-surface-container-low py-3 text-center">
          <div>
            <p className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Sec
            </p>
            <p className="font-headline-sm text-headline-sm text-text-primary font-bold">
              {ticket.section || "GA"}
            </p>
          </div>
          <div className="border-x border-border-subtle">
            <p className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Row
            </p>
            <p className="font-headline-sm text-headline-sm text-text-primary font-bold">
              {ticket.row || "-"}
            </p>
          </div>
          <div>
            <p className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Seat
            </p>
            <p className="font-headline-sm text-headline-sm text-text-primary font-bold">
              {ticket.seat_number || "-"}
            </p>
          </div>
        </div>

        {/* Dynamic QR Badge & Auto Refresh Indicator */}
        <div className="w-full flex items-center justify-between px-2 mb-2 text-xs">
          <span className="flex items-center gap-1 text-emerald-600 font-mono font-bold text-[10px] uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> 10-Min Dynamic QR
          </span>
          <button
            onClick={fetchDynamicQR}
            disabled={isLoading}
            className="flex items-center gap-1 text-text-secondary hover:text-primary font-mono text-[10px] cursor-pointer transition-colors"
          >
            <Clock className="w-3 h-3" />
            <span>Refreshes in {countdownText}</span>
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="relative mb-4 flex h-48 w-48 items-center justify-center rounded-xl border-2 border-primary/20 bg-surface-white p-2 shadow-inner">
          <QRCodeSVG
            value={qrToken}
            size={176}
            level="M"
            className="h-full w-full"
          />
        </div>

        <p className="font-label-sm text-[10px] font-mono tracking-widest text-text-secondary uppercase truncate max-w-[280px]">
          {qrToken}
        </p>
      </div>

      {/* Inset border highlight */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-full rounded-xl border border-border-subtle shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]" />
    </div>
  );
}