"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EventsView from "../components/EventsView";
import { useOrganizerData } from "../OrganizerDataContext";
import { unarchiveOrganizerEvent } from "@/lib/api/eorganizer";

export default function OrganizerEventsPage() {
  const router = useRouter();
  const { events, fetchData, pushToast } = useOrganizerData();

  const [view, setView] = useState<"active" | "archived">("active");

  const activeEvents = events.filter((e) => e.status !== "Archived");
  const archivedEvents = events.filter((e) => e.status === "Archived");

  const handleViewChange = (next: "active" | "archived") => {
    setView(next);
  };

  const handleRestore = async (eventId: string) => {
    const res = await unarchiveOrganizerEvent(Number(eventId));
    if (!res.success) {
      pushToast(res.error?.message ?? "Failed to restore event", "warning");
      return;
    }
    pushToast("Event restored to your active list", "success");
    await fetchData();
  };

  return (
    <EventsView
      events={view === "archived" ? archivedEvents : activeEvents}
      view={view}
      onViewChange={handleViewChange}
      isLoadingArchived={false}
      onRestoreEvent={handleRestore}
      onCreateEvent={() => router.push('/organizer/events/create')}
      onOpenWorkspace={(eventId) => router.push(`/organizer/events/${eventId}`)}
    />
  );
}
