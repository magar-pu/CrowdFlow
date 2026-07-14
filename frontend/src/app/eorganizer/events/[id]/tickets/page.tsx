"use client";

import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceTickets from "../../../components/Workspace/WorkspaceTickets";
import { useEorganizerData } from "../../../EorganizerDataContext";

export default function EorganizerEventTicketsPage() {
  const params = useParams<{ id: string }>();
  const { ticketTiers, handleCreateTier, handleUpdateTier, handleDeleteTier } = useEorganizerData();

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
