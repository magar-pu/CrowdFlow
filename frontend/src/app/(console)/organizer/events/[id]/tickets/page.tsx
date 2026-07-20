"use client";

import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceTickets from "../../../components/Workspace/WorkspaceTickets";
import { useOrganizerData } from "../../../OrganizerDataContext";

export default function OrganizerEventTicketsPage() {
  const params = useParams<{ id: string }>();
  const { ticketTiers, handleCreateTier, handleUpdateTier, handleDeleteTier } = useOrganizerData();

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="tickets">
      <WorkspaceTickets
        ticketTiers={ticketTiers}
        onCreateTier={handleCreateTier}
        onUpdateTier={handleUpdateTier}
        onDeleteTier={handleDeleteTier}
      />
    </EventWorkspaceShell>
  );
}
