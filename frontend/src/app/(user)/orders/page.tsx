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

const MOCK_TICKETS: MyTicketCard[] = [];

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
            View Dynamic Ticket (Offline Ready)
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
              Manage your upcoming events, past purchases, and offline PWA dynamic TOTP passes.
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

        {/* Payment Status Cards Section (Matching Screenshot 2) */}
        <div className="mb-12 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary">Payment Status</h2>
              <p className="text-xs text-text-secondary">Track your current ticket reservations and purchase history.</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Card 1: Payment Successful */}
            <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-border-subtle bg-white p-4 shadow-xs">
              <img
                src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=600&auto=format&fit=crop"
                alt="Coldplay"
                className="h-28 w-full sm:w-28 rounded-xl object-cover border border-border-subtle shrink-0"
              />
              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-bold text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success"></span> Payment Successful
                  </span>
                </div>
                <h3 className="text-base font-bold text-text-primary leading-tight">
                  Coldplay: Music of the Spheres
                </h3>
                <p className="text-[10px] font-mono text-text-secondary">Order #CF-202700456</p>
                <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50">
                  <div className="text-[10px] text-text-secondary">
                    <span className="block font-bold">DATE &amp; VENUE</span>
                    <span>Oct 24, 2027 • National Stadium</span>
                  </div>
                  <Link
                    href={`/orders/ORD-89241`}
                    className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-black/90 transition-all"
                  >
                    View Ticket
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 2: Waiting for Payment */}
            <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-warning/30 bg-warning/5 p-4 shadow-xs relative">
              <span className="absolute top-3 right-3 rounded-md bg-warning/20 px-2 py-0.5 font-mono text-[10px] font-bold text-warning-700">
                2:53
              </span>
              <img
                src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop"
                alt="Java Jazz"
                className="h-28 w-full sm:w-28 rounded-xl object-cover border border-border-subtle shrink-0"
              />
              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2.5 py-0.5 text-[10px] font-bold text-warning-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-warning animate-ping"></span> Waiting for Payment
                  </span>
                </div>
                <h3 className="text-base font-bold text-text-primary leading-tight">
                  Java Jazz Festival 2027
                </h3>
                <p className="text-[10px] text-text-secondary leading-tight">
                  Please complete your payment within the time limit to secure your seats.
                </p>
                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => alert("Redirecting to Midtrans Payment Gateway...")}
                    className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    Pay Now
                  </button>
                </div>
              </div>
            </div>
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