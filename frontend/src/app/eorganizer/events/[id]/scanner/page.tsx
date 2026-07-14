"use client";

import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceScanner from "../../../components/Workspace/WorkspaceScanner";
import { useEorganizerData } from "../../../EorganizerDataContext";

export default function EorganizerEventScannerPage() {
  const params = useParams<{ id: string }>();
  const {
    devices, gates, staffList,
    handleAddDevice, handleUpdateDevice, handleDeleteDevice, handleLogActivity, handleIncrementScan,
  } = useEorganizerData();

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
