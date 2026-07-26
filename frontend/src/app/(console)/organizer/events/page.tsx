"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import EventsView from "../components/EventsView";
import { useOrganizerData } from "../OrganizerDataContext";
import { EventItem } from "../types";
import { listOrganizerEvents, unarchiveOrganizerEvent, type OrganizerEvent } from "@/lib/api/eorganizer";

// The archive is fetched on demand rather than kept in the shared context: it is
// a rarely-opened view, and loading it alongside every dashboard render would
// double the events query for a list most sessions never look at.
function toEventItem(e: OrganizerEvent): EventItem {
  return {
    id: e.id,
    name: e.name,
    category: e.category,
    description: e.description,
    date: e.date,
    startDate: e.startDate,
    startTime: e.startTime,
    endDate: e.endDate,
    endTime: e.endTime,
    venueId: e.venueId,
    location: e.location,
    locationAddress: e.locationAddress,
    venueName: e.venueName,
    venueCity: e.venueCity,
    capacity: e.capacity,
    sold: e.sold,
    revenue: e.revenue,
    status: e.status as EventItem["status"],
    image: e.image,
  };
}

export default function OrganizerEventsPage() {
  const router = useRouter();
  const { events, fetchData, pushToast } = useOrganizerData();

  const [view, setView] = useState<"active" | "archived">("active");
  const [archivedEvents, setArchivedEvents] = useState<EventItem[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  // Loaded from a click, never from an effect — no fetch-on-mount cascade.
  const loadArchived = useCallback(async () => {
    setLoadingArchived(true);
    const res = await listOrganizerEvents(true);
    if (res.success && res.data) {
      setArchivedEvents(res.data.map(toEventItem));
    } else {
      pushToast(res.error?.message ?? "Failed to load archived events", "warning");
    }
    setLoadingArchived(false);
  }, [pushToast]);

  const handleViewChange = async (next: "active" | "archived") => {
    setView(next);
    if (next === "archived") await loadArchived();
  };

  const handleRestore = async (eventId: string) => {
    const res = await unarchiveOrganizerEvent(Number(eventId));
    if (!res.success) {
      pushToast(res.error?.message ?? "Failed to restore event", "warning");
      return;
    }
    pushToast("Event restored to your active list", "success");
    // Refresh both sides: the event leaves the archive and rejoins the active
    // list the rest of the console reads from.
    await Promise.all([loadArchived(), fetchData()]);
  };

  return (
    <EventsView
      events={view === "archived" ? archivedEvents : events}
      view={view}
      onViewChange={handleViewChange}
      isLoadingArchived={loadingArchived}
      onRestoreEvent={handleRestore}
      onCreateEvent={() => router.push('/organizer/events/create')}
      onOpenWorkspace={(eventId) => router.push(`/organizer/events/${eventId}`)}
    />
  );
}
