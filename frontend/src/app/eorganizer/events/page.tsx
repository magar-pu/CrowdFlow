"use client";

import { useRouter } from "next/navigation";
import EventsView from "../components/EventsView";
import { useEorganizerData } from "../EorganizerDataContext";

export default function EorganizerEventsPage() {
  const router = useRouter();
  const { events } = useEorganizerData();

  return (
    <EventsView
      events={events}
      onCreateEvent={() => router.push('/eorganizer/events/create')}
      onOpenWorkspace={(eventId) => router.push(`/eorganizer/events/${eventId}`)}
    />
  );
}
