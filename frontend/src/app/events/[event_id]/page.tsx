"use client";

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
  const event = mockEvent;

  const active_categories = event.ticket_categories.filter((c) => c.is_active);
  const cheapest_price = Math.min(...active_categories.map((c) => c.face_value));
  const starting_price_label = active_categories.length > 0 ? formatIDR(cheapest_price) : "—";

  function handle_continue(ticket_category_id: string) {
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
          <div className="flex flex-col gap-8 lg:col-span-8">
            <AboutEventSection
              description={event.description}
              important_info={event.important_info}
            />
            <VenueInfoSection venue={event.venue} event_id={event.event_id} />
          </div>
          {/* Right column sticky */}
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