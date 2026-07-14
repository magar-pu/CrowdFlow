"use client";

import { useParams, useRouter } from "next/navigation";
import EventWorkspaceShell from "../../components/EventWorkspaceShell";
import WorkspaceOverview from "../../components/Workspace/WorkspaceOverview";
import { useEorganizerData } from "../../EorganizerDataContext";

export default function EorganizerEventOverviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { events, ticketTiers, devices, transactions, logs } = useEorganizerData();
  const event = events.find((e) => e.id === params.id);

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="overview">
      {event && (
        <WorkspaceOverview
          event={event}
          ticketTiers={ticketTiers}
          devices={devices}
          transactions={transactions}
          logs={logs}
          onSwitchTab={(tab) => router.push(tab === 'overview' ? `/eorganizer/events/${params.id}` : `/eorganizer/events/${params.id}/${tab}`)}
        />
      )}
    </EventWorkspaceShell>
  );
}
