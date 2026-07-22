"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import EventManagementView from "@/components/admin/events/EventManagementView";
import { useAdminData } from "../AdminDataContext";

export default function AdminEventsPage() {
  const router = useRouter();
  const {
    events,
    eventTypes,
    eventsLoading,
    eventsError,
    eventsPage,
    setEventsPage,
    eventsHasNext,
    handleApproveEvent,
    handleRejectEvent,
  } = useAdminData();

  // Reset to the first page whenever the list is (re)opened, so a deep page
  // from a prior visit doesn't linger (matches the pre-routing behavior).
  useEffect(() => {
    setEventsPage(0);
  }, [setEventsPage]);

  return (
    <div className="space-y-4">
      {eventsError && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-xs font-semibold text-danger">
          {eventsError}
        </div>
      )}
      {eventsLoading ? (
        <div className="py-24 text-center text-sm text-text-secondary">Loading events...</div>
      ) : (
        <EventManagementView
          events={events}
          eventTypes={eventTypes}
          onCreateEvent={() => router.push('/admin/events/create')}
          onSelectEvent={(id) => router.push(`/admin/events/${id}`)}
          onApproveEvent={handleApproveEvent}
          onRejectEvent={handleRejectEvent}
          page={eventsPage}
          hasNextPage={eventsHasNext}
          onPrevPage={() => setEventsPage((p) => Math.max(0, p - 1))}
          onNextPage={() => setEventsPage((p) => p + 1)}
        />
      )}
    </div>
  );
}
