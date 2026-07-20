"use client";

import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceSettings from "../../../components/Workspace/WorkspaceSettings";
import { useOrganizerData } from "../../../OrganizerDataContext";

export default function OrganizerEventSettingsPage() {
  const params = useParams<{ id: string }>();
  const { events, handleUpdateEventName, staffList, handleAddStaff, handleDeleteStaff } = useOrganizerData();
  const event = events.find((e) => e.id === params.id);

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="settings">
      {event && (
        <WorkspaceSettings
          eventName={event.name}
          onUpdateEventName={(name) => handleUpdateEventName(params.id, name)}
          staffList={staffList}
          onAddStaff={handleAddStaff}
          onDeleteStaff={handleDeleteStaff}
        />
      )}
    </EventWorkspaceShell>
  );
}
