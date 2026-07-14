"use client";

import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceSettings from "../../../components/Workspace/WorkspaceSettings";
import { useEorganizerData } from "../../../EorganizerDataContext";

export default function EorganizerEventSettingsPage() {
  const params = useParams<{ id: string }>();
  const { events, handleUpdateEventName, staffList, handleAddStaff, handleDeleteStaff } = useEorganizerData();
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
