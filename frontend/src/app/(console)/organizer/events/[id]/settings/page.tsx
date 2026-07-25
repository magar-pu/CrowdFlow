"use client";

import { useParams, useRouter } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceSettings from "../../../components/Workspace/WorkspaceSettings";
import { useOrganizerData } from "../../../OrganizerDataContext";
import { deleteOrganizerEvent, updateOrganizerEvent } from "@/lib/api/eorganizer";

export default function OrganizerEventSettingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { events, fetchData, pushToast, staffList, handleAddStaff, handleDeleteStaff } = useOrganizerData();
  const event = events.find((e) => e.id === params.id);
  const eventId = Number(params.id);

  const handleSaveGeneral = async (values: {
    name: string;
    category: string;
    description: string;
    startDate: string;
  }) => {
    const res = await updateOrganizerEvent(eventId, {
      name: values.name,
      category: values.category,
      description: values.description,
      // The update keeps the existing times; only the calendar day moves here.
      startDate: values.startDate,
      startTime: event?.startTime,
      endDate: event?.endDate,
      endTime: event?.endTime,
      // The update writes every column it receives, so a field left out of the
      // payload is blanked — carry the cover image through untouched.
      image: event?.image,
    });
    if (res.success) {
      pushToast("Event details saved", "success");
      await fetchData();
      return true;
    }
    pushToast(`Failed to save: ${res.error?.message ?? "Unknown error"}`, "warning");
    return false;
  };

  // The backend only deletes drafts; anything submitted has an audit trail.
  const canDelete = event?.status === "Draft";

  const handleDeleteEvent = async () => {
    const res = await deleteOrganizerEvent(eventId);
    if (res.success) {
      pushToast("Event deleted", "success");
      await fetchData();
      router.push("/organizer/events");
      return true;
    }
    pushToast(`Failed to delete: ${res.error?.message ?? "Unknown error"}`, "warning");
    return false;
  };

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="settings">
      {event && (
        <WorkspaceSettings
          eventName={event.name}
          initial={{
            category: event.category,
            description: event.description,
            startDate: event.startDate,
          }}
          onSaveGeneral={handleSaveGeneral}
          onDeleteEvent={handleDeleteEvent}
          canDelete={canDelete}
          staffList={staffList}
          onAddStaff={handleAddStaff}
          onDeleteStaff={handleDeleteStaff}
        />
      )}
    </EventWorkspaceShell>
  );
}
