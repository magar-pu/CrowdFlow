"use client";

/**
 * app/events/[event_id]/page.tsx
 *
 * Event Detail page — hero banner, About + Venue info (8-col), sticky
 * Ticket Selection + Organizer card (4-col). Matches the
 * event_detail_eras_tour_manila Stitch screen end-to-end.
 *
 * Currently reads from mockEvent regardless of the [event_id] param —
 * swap the lookup for `getEvent(event_id)` (lib/api/events.ts) once the Go
 * endpoint exists. Next.js 16 passes `params` as a Promise, so the real
 * lookup will need `const { event_id } = await params` in a Server
 * Component wrapper, or `use(params)` here if this stays a Client Component.
 */

import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { EventHero } from "@/components/event-detail/EventHero";
import { AboutEventSection } from "@/components/event-detail/AboutEventSection";
import { VenueInfoSection } from "@/components/event-detail/VenueInfoSection";
import { TicketSelectionCard } from "@/components/event-detail/TicketSelectionCard";
import { OrganizerInfoCard } from "@/components/event-detail/OrganizerInfoCard";
import { formatIDR } from "@/lib/pricing";
import { mockEvent } from "@/mock/eventData";

export default function EventDetailPage() {
  const router = useRouter();
  const event = mockEvent; // TODO: replace with getEvent(event_id) once the Go API exists

  const active_categories = event.ticket_categories.filter((c) => c.is_active);
  const cheapest_price = Math.min(
    ...active_categories.map((c) => c.face_value)
  );
  const starting_price_label =
    active_categories.length > 0 ? formatIDR(cheapest_price) : "—";

  function handle_continue(ticket_category_id: string) {
    // High-demand events route through the virtual waiting room first
    // (anti-bot/high-traffic queueing per the BRD); other events skip
    // straight to seat selection.
    const query = `?ticket_category_id=${ticket_category_id}`;
    if (event.is_high_demand) {
      router.push(`/events/${event.event_id}/queue${query}`);
    } else {
      router.push(`/events/${event.event_id}/seats${query}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Navbar active_href="/events" />

      <main className="flex-grow">
        <EventHero event={event} starting_price_label={starting_price_label} />

        <div className="mx-auto grid w-full max-w-container-max grid-cols-1 items-start gap-gutter px-margin-mobile py-section-gap md:px-margin-desktop lg:grid-cols-12">
          {/* Left column */}
          <div className="flex flex-col gap-12 lg:col-span-8">
            <AboutEventSection
              description={event.description}
              important_info={event.important_info}
            />
            <VenueInfoSection venue={event.venue} />
          </div>

          {/* Right column — sticky */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:col-span-4">
            <TicketSelectionCard
              ticket_categories={event.ticket_categories}
              on_continue={handle_continue}
            />
            <OrganizerInfoCard organizer={event.organizer} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}