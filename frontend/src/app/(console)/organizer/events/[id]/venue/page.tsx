"use client";

import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceVenue from "../../../components/Workspace/WorkspaceVenue";
import { useOrganizerData } from "../../../OrganizerDataContext";

export default function OrganizerEventVenuePage() {
  const params = useParams<{ id: string }>();
  const { venueSections } = useOrganizerData();

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="venue">
      <WorkspaceVenue sections={venueSections} />
    </EventWorkspaceShell>
  );
}
