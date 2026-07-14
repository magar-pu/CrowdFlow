"use client";

import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceVenue from "../../../components/Workspace/WorkspaceVenue";
import { useEorganizerData } from "../../../EorganizerDataContext";

export default function EorganizerEventVenuePage() {
  const params = useParams<{ id: string }>();
  const { venueSections } = useEorganizerData();

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="venue">
      <WorkspaceVenue sections={venueSections} />
    </EventWorkspaceShell>
  );
}
