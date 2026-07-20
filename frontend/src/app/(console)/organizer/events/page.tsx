"use client";

import { useRouter } from "next/navigation";
import EventsView from "../components/EventsView";
import { useOrganizerData } from "../OrganizerDataContext";

export default function OrganizerEventsPage() {
  const router = useRouter();
  const { events } = useOrganizerData();

  return (
    <EventsView
      events={events}
      onCreateEvent={() => router.push('/organizer/events/create')}
      onOpenWorkspace={(eventId) => router.push(`/organizer/events/${eventId}`)}
    />
  );
}
