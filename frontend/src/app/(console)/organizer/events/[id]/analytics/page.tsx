"use client";

import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceAnalytics from "../../../components/Workspace/WorkspaceAnalytics";

export default function OrganizerEventAnalyticsPage() {
  const params = useParams<{ id: string }>();

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="analytics">
      <WorkspaceAnalytics eventId={params.id} />
    </EventWorkspaceShell>
  );
}
