"use client";

/**
 * app/events/[event_id]/page.tsx
 *
 * Event Detail page — hero banner, About + Venue info (8-col), sticky
 * Ticket Selection + Organizer card (4-col). Matches the
 * event_detail_eras_tour_manila Stitch screen end-to-end.
 *
 * Reads the event from `getEvent(event_id)` and its ticket tiers from
 * `listTicketTiers(event_id)` (both lib/api/events.ts). Neither falls back to
 * mock data: a failed lookup renders the error state, and an event with no
 * tiers on sale renders the card's empty state.
 */

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { HomeFooterV3 } from "@/components/home-v3/HomeFooterV3";
import { EventHero } from "@/components/event-detail/EventHero";
import { AboutEventSection } from "@/components/event-detail/AboutEventSection";
import { VenueInfoSection } from "@/components/event-detail/VenueInfoSection";
import {
  TicketSelectionCard,
  type TicketSelectionOption,
} from "@/components/event-detail/TicketSelectionCard";
import { OrganizerInfoCard } from "@/components/event-detail/OrganizerInfoCard";
import { formatIDR } from "@/lib/pricing";
import { getEvent, listTicketTiers } from "@/lib/api/events";
import { Event } from "@/types/ticket";
import { Footer } from "@/components/layout/Footer";

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const event_id = params?.event_id;
  const [event, setEvent] = useState<Event | null>(null);
  const [tiers, setTiers] = useState<TicketSelectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Ticket tiers load independently of the event: the endpoint only returns
  // tiers currently on sale, so an empty list is a legitimate "no tickets on
  // sale" state rather than an error, and must not fall back to mock tiers.
  useEffect(() => {
    if (!event_id) return;

    listTicketTiers(event_id as string)
      .then((res) => {
        if (res.success && res.data) {
          setTiers(
            res.data.map((t) => ({
              ticket_category_id: String(t.ticket_tier_id),
              name: t.name,
              description: t.description,
              face_value: t.price,
              quota_remaining: t.quota_remaining,
              // Every tier returned by this endpoint is public and inside its
              // sales window, so it is on sale by definition.
              is_active: true,
            }))
          );
        } else {
          setTiers([]);
        }
      })
      .catch(() => {
        setTiers([]);
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
  const categories = tiers;
  const active_categories = categories.filter((c) => c.is_active);
  const cheapest_price = Math.min(
    ...active_categories.map((c) => c.face_value)
  );
  const starting_price_label =
    active_categories.length > 0 ? formatIDR(cheapest_price) : "—";

  function handle_continue(ticket_category_id: string) {
    const query = `?ticket_category_id=${ticket_category_id}`;
    if (currentEvent.is_high_demand) {
      router.push(`/events/${currentEvent.event_id}/queue${query}`);
    } else {
      router.push(`/events/${currentEvent.event_id}/seats${query}`);
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
            <VenueInfoSection venue={event.venue} event_id={event.event_id} />
          </div>
          {/* Right column sticky */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:col-span-4">
            <TicketSelectionCard
              ticket_categories={categories}
              on_continue={handle_continue}
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