"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";
import { getMyTickets, UserTicket } from "@/lib/api/tickets";

// ── Types ─────────────────────────────────────────────────────────────────

type TicketTab = "upcoming" | "past" | "cancelled";

interface MyTicketCard {
  ticket_id: string;
  order_id: string;
  event_title: string;
  cover_image_url: string;
  date_label: string;
  venue_name: string;
  section_label: string;
  ticket_type: string;
  quantity: number;
  status: "confirmed" | "cancelled" | "used";
  tab: TicketTab;
}

// ── Fallback data ─────────────────────────────────────────────────────────

const MOCK_TICKETS: MyTicketCard[] = [
  {
    ticket_id: "tkt_001",
    order_id: "ORD-89241",
    event_title: "Global Soundscapes: Music Festival 2026",
    cover_image_url:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop",
    date_label: "Sat, Aug 15 • 2:00 PM",
    venue_name: "Metropolis Grand Park",
    section_label: "Main Stage",
    ticket_type: "VIP All-Access Pass",
    quantity: 1,
    status: "confirmed",
    tab: "upcoming",
  },
  {
    ticket_id: "tkt_002",
    order_id: "ORD-89242",
    event_title: "Symphony in the City: Autumn Series",
    cover_image_url:
      "https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=800&auto=format&fit=crop",
    date_label: "Fri, Sep 10 • 7:30 PM",
    venue_name: "The Heritage Concert Hall",
    section_label: "Section A",
    ticket_type: "Orchestra Premium",
    quantity: 1,
    status: "confirmed",
    tab: "upcoming",
  },
];

const TABS: { key: TicketTab; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past Events" },
  { key: "cancelled", label: "Cancelled" },
];

// ── Carousel ──────────────────────────────────────────────────────────────

interface CarouselProps {
  tickets: MyTicketCard[];
}

function TicketCarousel({ tickets }: CarouselProps) {
  const [active, set_active] = useState(0);

  if (tickets.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border-subtle bg-white">
        <p className="font-body-md text-body-md text-text-secondary">
          Tidak ada tiket di kategori ini.
        </p>
      </div>
    );
  }

  const prev = () => set_active((i) => (i - 1 + tickets.length) % tickets.length);
  const next = () => set_active((i) => (i + 1) % tickets.length);

  return (
    <div className="relative flex flex-col items-center">
      {/* 3D carousel track */}
      <div className="relative flex w-full items-center justify-center" style={{ minHeight: 500 }}>
        {tickets.map((ticket, idx) => {
          const offset = idx - active;
          const abs = Math.abs(offset);

          if (abs > 1) return null;

          const is_center = offset === 0;
          const is_left = offset === -1;

          return (
            <div
              key={ticket.ticket_id}
              onClick={() => !is_center && set_active(idx)}
              style={{
                position: "absolute",
                transform: is_center
                  ? "translateX(0) scale(1)"
                  : is_left
                    ? "translateX(-56%) scale(0.82)"
                    : "translateX(56%) scale(0.82)",
                zIndex: is_center ? 10 : 5,
                transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                opacity: is_center ? 1 : 0.55,
                cursor: is_center ? "default" : "pointer",
                width: "100%",
                maxWidth: 420,
              }}
            >
              <TicketCardFull ticket={ticket} is_active={is_center} />
            </div>
          );
        })}
      </div>

      {/* Prev / Next buttons */}
      {tickets.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-0 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-white shadow-sm transition-all hover:bg-surface-container-high md:left-4"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-0 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-white shadow-sm transition-all hover:bg-surface-container-high md:right-4"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {tickets.length > 1 && (
        <div className="mt-6 flex items-center gap-2">
          {tickets.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => set_active(idx)}
              className={cn(
                "rounded-full transition-all duration-300",
                idx === active
                  ? "h-2 w-6 bg-secondary"
                  : "h-2 w-2 bg-border-subtle"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single full ticket card ───────────────────────────────────────────────

function TicketCardFull({
  ticket,
}: {
  ticket: MyTicketCard;
  is_active: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-[0_8px_30px_rgba(15,23,42,0.1)] select-none">
      {/* Cover image */}
      <div className="relative h-52 w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ticket.cover_image_url}
          alt={ticket.event_title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Status badge */}
        <div className="absolute right-3 top-3">
          {ticket.status === "confirmed" && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 font-label-sm text-label-sm text-success backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Ready
            </span>
          )}
          {ticket.status === "used" && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 font-label-sm text-label-sm text-text-secondary backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-text-secondary" />
              Checked In
            </span>
          )}
          {ticket.status === "cancelled" && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 font-label-sm text-label-sm text-danger backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
              Cancelled
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="mb-1 line-clamp-2 font-headline-sm text-headline-sm font-bold text-text-primary">
          {ticket.event_title}
        </h3>
        <p className="mb-3 font-body-sm text-body-sm font-semibold text-secondary">
          {ticket.date_label}
        </p>
        <div className="mb-4 flex items-center gap-1.5 font-body-sm text-body-sm text-text-secondary">
          <MapPin size={14} className="shrink-0" />
          {ticket.venue_name} • {ticket.section_label}
        </div>

        {/* Ticket type + qty */}
        <div className="mb-5 flex items-center justify-between rounded-lg border border-border-subtle bg-surface-container-low px-4 py-2.5">
          <div>
            <p className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Ticket Type
            </p>
            <p className="font-label-md text-label-md text-text-primary font-bold">
              {ticket.ticket_type}
            </p>
          </div>
          <div className="text-right">
            <p className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Ticket ID
            </p>
            <p className="font-mono text-xs text-text-primary truncate max-w-[120px]">
              {ticket.ticket_id}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/orders/${ticket.order_id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-label-md text-label-md text-white transition-all hover:bg-primary/90"
          >
            <Eye size={16} />
            View Dynamic 10-Min QR
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function MyTicketsPage() {
  const [active_tab, set_active_tab] = useState<TicketTab>("upcoming");
  const [tickets, setTickets] = useState<MyTicketCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTickets() {
      try {
        const res = await getMyTickets();
        if (res.success && res.data && res.data.tickets && res.data.tickets.length > 0) {
          const mapped: MyTicketCard[] = res.data.tickets.map((t: UserTicket) => {
            const status = t.ticketStatus === "used" ? "used" : t.ticketStatus === "cancelled" ? "cancelled" : "confirmed";
            const tab: TicketTab = status === "cancelled" ? "cancelled" : status === "used" ? "past" : "upcoming";
            return {
              ticket_id: t.id,
              order_id: t.orderId,
              event_title: t.eventName || "CrowdFlow Event",
              cover_image_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop",
              date_label: "Sat, Aug 15 • 2:00 PM",
              venue_name: "Venue Arena",
              section_label: t.seatLabel || "General Admission",
              ticket_type: t.tierName || "Standard",
              quantity: 1,
              status,
              tab,
            };
          });
          setTickets(mapped);
        } else {
          setTickets(MOCK_TICKETS);
        }
      } catch (err) {
        setTickets(MOCK_TICKETS);
      } finally {
        setLoading(false);
      }
    }
    fetchTickets();
  }, []);

  const filtered = tickets.filter((t) => t.tab === active_tab);

  return (
    <div className="min-h-screen bg-background">
      <Navbar active_href="/" is_authenticated={true} />

      <main className="mx-auto max-w-container-max px-margin-mobile py-8 md:px-margin-desktop">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 font-body-sm text-body-sm text-text-secondary">
          <Link href="/" className="hover:text-primary">Home</Link>
          <ChevronRight size={14} />
          <span className="hover:text-primary cursor-default">Account</span>
          <ChevronRight size={14} />
          <span className="font-semibold text-text-primary">My Tickets</span>
        </nav>

        {/* Page header */}
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary md:text-[40px] md:leading-[48px]">
              My Tickets
            </h1>
            <p className="mt-1 font-body-md text-body-md text-text-secondary">
              Manage your upcoming events, past purchases, and 10-minute dynamic digital passes.
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs font-mono text-primary">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading tickets...</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-10 border-b border-border-subtle">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => set_active_tab(tab.key)}
                className={cn(
                  "relative px-4 pb-3 pt-2 font-label-md text-label-md transition-colors cursor-pointer",
                  active_tab === tab.key
                    ? "text-primary font-bold"
                    : "text-text-secondary hover:text-primary"
                )}
              >
                {tab.label}
                {active_tab === tab.key && (
                  <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Carousel */}
        <div className="px-8 md:px-16">
          <TicketCarousel tickets={filtered} />
        </div>
      </main>
    </div>
  );
}