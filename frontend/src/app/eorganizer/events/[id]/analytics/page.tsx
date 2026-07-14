"use client";

import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceAnalytics from "../../../components/Workspace/WorkspaceAnalytics";

export default function EorganizerEventAnalyticsPage() {
  const params = useParams<{ id: string }>();

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="analytics">
      <WorkspaceAnalytics />
    </EventWorkspaceShell>
  );
}
