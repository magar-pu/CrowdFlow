"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceVenuePicker from "../../../components/Workspace/WorkspaceVenuePicker";
import WorkspaceLayoutBinder from "../../../components/Workspace/WorkspaceLayoutBinder";
import WorkspaceEventMapsLink from "../../../components/Workspace/WorkspaceEventMapsLink";
import { getEventLayoutBinding } from "@/lib/api/events";

export default function OrganizerEventVenuePage() {
  const params = useParams<{ id: string }>();
  const eventIdNum = Number(params.id);
  const valid = !isNaN(eventIdNum);

  // The venue is owned by this page rather than the layout binder, because the
  // picker sets it and the binder reads it — the binder can only offer layouts
  // once a venue exists.
  const [venueId, setVenueId] = useState(0);
  const [loading, setLoading] = useState(true);
  // Bumped after the venue changes so the binder remounts and refetches: the
  // old venue's layout binding and seat overlay are gone by then.
  const [refreshKey, setRefreshKey] = useState(0);

  const loadVenue = useCallback(async () => {
    if (!valid) return;
    const res = await getEventLayoutBinding(eventIdNum);
    setVenueId(res.success && res.data ? res.data.venue_id : 0);
    setLoading(false);
  }, [eventIdNum, valid]);

  useEffect(() => {
    loadVenue();
  }, [loadVenue]);

  const handleVenueChanged = () => {
    loadVenue();
    setRefreshKey((k) => k + 1);
  };

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="venue">
      {valid && (
        <div className="space-y-6">
          <WorkspaceVenuePicker
            eventId={eventIdNum}
            venueId={venueId}
            onVenueChanged={handleVenueChanged}
          />
          {/* The seat map is meaningless without a venue — layouts belong to one. */}
          {!loading && venueId > 0 && (
            <>
              <WorkspaceLayoutBinder key={refreshKey} eventId={eventIdNum} />
              {/* Below the binder: the link only matters once there is a place
                  to point at, and it is the least urgent thing on this tab. */}
              <WorkspaceEventMapsLink eventId={eventIdNum} />
            </>
          )}
        </div>
      )}
    </EventWorkspaceShell>
  );
}
