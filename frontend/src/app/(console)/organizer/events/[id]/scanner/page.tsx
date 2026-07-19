"use client";

import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceScanner from "../../../components/Workspace/WorkspaceScanner";
import { useOrganizerData } from "../../../OrganizerDataContext";

export default function OrganizerEventScannerPage() {
  const params = useParams<{ id: string }>();
  const {
    devices, gates, staffList,
    handleAddDevice, handleUpdateDevice, handleDeleteDevice, handleLogActivity, handleIncrementScan,
  } = useOrganizerData();

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="scanner">
      <WorkspaceScanner
        devices={devices}
        gates={gates}
        staffList={staffList}
        onAddDevice={handleAddDevice}
        onUpdateDevice={handleUpdateDevice}
        onDeleteDevice={handleDeleteDevice}
        onLogActivity={handleLogActivity}
        onIncrementScan={handleIncrementScan}
      />
    </EventWorkspaceShell>
  );
}
