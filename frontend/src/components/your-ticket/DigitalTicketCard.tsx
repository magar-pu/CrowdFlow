/**
 * components/your-ticket/DigitalTicketCard.tsx
 *
 * The digital ticket itself: cover image with title overlay, date/venue
 * details, a perforated "tear line" divider (two notched circles + a
 * dashed line — the signature CrowdFlow ticket motif), Sec/Row/Seat grid,
 * and a real scannable QR code encoding the ticket's qr_payload.
 * Matches your_ticket Stitch markup exactly.
 */

import { QRCodeSVG } from "qrcode.react";
import type { PurchasedTicket } from "@/types/ticket";

interface DigitalTicketCardProps {
  ticket: PurchasedTicket;
}

function formatTicketDateTime(iso_datetime: string): string {
  const date = new Date(iso_datetime);
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
  return (
    <div className="relative flex w-full max-w-[420px] flex-col rounded-xl border border-border-subtle bg-surface-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
      {/* Cover image with title overlay */}
      <div className="relative h-48 w-full overflow-hidden rounded-t-xl bg-surface-container-high">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ticket.cover_image_url}
          alt={ticket.event_title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-6 right-6">
          <span className="mb-2 inline-block rounded bg-surface-white/20 px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-surface-white backdrop-blur-md">
            {ticket.event_category_label}
          </span>
          <h2 className="font-headline-sm text-headline-sm text-surface-white">
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
            <p className="font-label-md text-label-md text-text-primary">
              {formatTicketDateTime(ticket.starts_at)}
            </p>
          </div>
        </div>
        <div className="mb-2 flex items-start justify-between">
          <div>
            <p className="mb-1 font-body-sm text-body-sm text-text-secondary">
              Venue
            </p>
            <p className="font-label-md text-label-md text-text-primary">
              {ticket.venue_name}
            </p>
            <p className="font-body-sm text-body-sm text-text-secondary">
              {ticket.venue_city}
            </p>
          </div>
        </div>
      </div>

      {/* Perforated tear line */}
      <div className="relative my-2 flex h-8 w-full items-center justify-between">
        <div className="absolute left-[-16px] z-10 h-8 w-8 rounded-full border-r border-border-subtle bg-background shadow-[inset_-4px_0_6px_rgba(0,0,0,0.02)]" />
        <div className="mx-4 w-full border-t-2 border-dashed border-border-subtle" />
        <div className="absolute right-[-16px] z-10 h-8 w-8 rounded-full border-l border-border-subtle bg-background shadow-[inset_4px_0_6px_rgba(0,0,0,0.02)]" />
      </div>

      {/* Sec / Row / Seat + QR */}
      <div className="flex flex-col items-center p-6 pt-2">
        <div className="mb-6 grid w-full grid-cols-3 gap-4 rounded-lg bg-surface-container-low py-3 text-center">
          <div>
            <p className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Sec
            </p>
            <p className="font-headline-sm text-headline-sm text-text-primary">
              {ticket.section}
            </p>
          </div>
          <div className="border-x border-border-subtle">
            <p className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Row
            </p>
            <p className="font-headline-sm text-headline-sm text-text-primary">
              {ticket.row}
            </p>
          </div>
          <div>
            <p className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Seat
            </p>
            <p className="font-headline-sm text-headline-sm text-text-primary">
              {ticket.seat_number}
            </p>
          </div>
        </div>

        <div className="mb-4 flex h-48 w-48 items-center justify-center rounded-lg border border-border-subtle bg-surface-white p-2">
          <QRCodeSVG
            value={ticket.qr_payload}
            size={176}
            level="M"
            className="h-full w-full"
          />
        </div>
        <p className="font-label-sm text-label-sm tracking-[0.2em] text-text-secondary">
          {ticket.ticket_code}
        </p>
      </div>

      {/* Inset border highlight */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-full rounded-xl border border-border-subtle shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]" />
    </div>
  );
}