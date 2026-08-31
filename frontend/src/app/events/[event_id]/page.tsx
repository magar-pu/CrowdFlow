"use client";

/**
 * app/events/[event_id]/page.tsx
 *
 * Event Detail page — hero banner, About + Venue info (8-col), sticky ticket
 * CTA + Organizer card (4-col).
 *
 * Reads the event from `getEvent(event_id)` and its ticket tiers from
 * `listTicketTiers(event_id)` (both lib/api/events.ts). Neither falls back to
 * mock data: a failed lookup renders the error state, and an event with no
 * tiers on sale renders the card's empty state.
 *
 * The page does not choose a tier. It reads tiers only for the "starting from"
 * price and to tell whether anything is buyable; the seat screen owns tier
 * selection.
 */

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { HomeFooterV3 } from "@/components/home-v3/HomeFooterV3";
import { EventHero } from "@/components/event-detail/EventHero";
import { AboutEventSection } from "@/components/event-detail/AboutEventSection";
import { TicketTiersSection } from "@/components/event-detail/TicketTiersSection";
import { VenueInfoSection } from "@/components/event-detail/VenueInfoSection";
import { TicketCtaCard } from "@/components/event-detail/TicketCtaCard";
import { OrganizerInfoCard } from "@/components/event-detail/OrganizerInfoCard";
import { formatIDR } from "@/lib/pricing";
import { getEvent, listTicketTiers, type PublicTicketTier } from "@/lib/api/events";
import { Event } from "@/types/ticket";
import { Footer } from "@/components/layout/Footer";
import { useAuthStore } from "@/lib/store/authStore";
import { canPurchase, BUYER_BLOCKED_MESSAGE } from "@/lib/buyerGate";

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const event_id = params?.event_id;
  const [event, setEvent] = useState<Event | null>(null);
  const [tiers, setTiers] = useState<PublicTicketTier[]>([]);
  // Tracked separately from `loading`, which covers only the event fetch: the
  // tiers card must not flash "nothing on sale" while its request is inflight.
  const [tiers_loading, set_tiers_loading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!event_id) return;
    const id = event_id as string;

    getEvent(id)
      .then((res) => {
        if (res.success && res.data) {
          setEvent(res.data);
        } else {
          setError("Event tidak ditemukan");
        }
      })
      .catch(() => {
        setError("Gagal memuat event. Silakan coba lagi.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [event_id]);

  // Ticket tiers load independently of the event. The endpoint only returns
  // tiers currently on sale, so an empty list is a legitimate "no tickets on
  // sale" state rather than an error, and must not fall back to mock tiers.
  // The page no longer picks a tier — it only needs to know the cheapest price
  // and whether anything is purchasable at all.
  useEffect(() => {
    if (!event_id) return;

    listTicketTiers(event_id as string)
      .then((res) => {
        setTiers(res.success && res.data ? res.data : []);
      })
      .catch(() => {
        setTiers([]);
      })
      .finally(() => {
        set_tiers_loading(false);
      });
  }, [event_id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-muted-foreground">
        <div className="animate-pulse text-lg">Memuat rincian event...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen flex-col bg-surface text-muted-foreground">
        <Navbar active_href="/events" />
        <main className="flex-grow flex items-center justify-center p-6">
          <div className="text-center max-w-md bg-white p-8 rounded-xl shadow-md border border-border-subtle">
            <h2 className="text-2xl font-bold text-text-primary mb-2">Gagal Memuat Event</h2>
            <p className="text-text-secondary mb-6">{error || "Event tidak ditemukan"}</p>
            <button
              onClick={() => router.push("/events")}
              className="rounded-full bg-secondary px-8 py-3 font-semibold text-white transition-all hover:bg-secondary/90"
            >
              Kembali ke Discovery
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentEvent = event;
  // Every tier this endpoint returns is public and inside its sales window, so
  // remaining quota is the only thing left that can make one unbuyable.
  const purchasable_tiers = tiers.filter((t) => t.quota_remaining > 0);
  const starting_price_label =
    purchasable_tiers.length > 0
      ? formatIDR(Math.min(...purchasable_tiers.map((t) => t.price)))
      : "—";

  // No tier is passed along any more: the seat screen owns tier choice and
  // defaults to the first available one on its own.
  function handle_continue() {
    if (currentEvent.is_high_demand) {
      router.push(`/events/${currentEvent.event_id}/queue`);
    } else {
      router.push(`/events/${currentEvent.event_id}/seats`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Navbar active_href="/events" />
      <main className="flex-grow">
        <EventHero event={event} starting_price_label={starting_price_label} />
        <div className="mx-auto grid w-full max-w-container-max grid-cols-1 items-start gap-gutter px-margin-mobile py-section-gap md:px-margin-desktop lg:grid-cols-12">
          {/* Left column */}
          <div className="flex flex-col gap-8 lg:col-span-8">
            <AboutEventSection
              description={currentEvent.description}
              important_info={currentEvent.important_info ?? []}
            />
            <TicketTiersSection tiers={tiers} loading={tiers_loading} />
            <VenueInfoSection
              venue={event.venue}
              event_id={event.event_id}
              google_maps_url={event.google_maps_url}
            />
          </div>
          {/* Right column sticky */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:col-span-4">
            <TicketCtaCard
              starting_price_label={starting_price_label}
              has_tickets_on_sale={purchasable_tiers.length > 0}
              on_continue={handle_continue}
              purchase_blocked_reason={
                canPurchase(user) ? null : BUYER_BLOCKED_MESSAGE
              }
            />
            {currentEvent.organizer && (
              <OrganizerInfoCard organizer={currentEvent.organizer} />
            )}
          </div>
        </div>
      </main>
      <HomeFooterV3 />
    </div>
  );
}