"use client";

import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceLayoutBinder from "../../../components/Workspace/WorkspaceLayoutBinder";

export default function OrganizerEventVenuePage() {
  const params = useParams<{ id: string }>();
  const eventIdNum = Number(params.id);

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="venue">
      {!isNaN(eventIdNum) && <WorkspaceLayoutBinder eventId={eventIdNum} />}
    </EventWorkspaceShell>
  );
}
