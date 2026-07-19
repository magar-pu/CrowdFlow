"use client";

import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceScanner from "../../../components/Workspace/WorkspaceScanner";
import { useEorganizerData } from "../../../EorganizerDataContext";
import { checkInAttendee } from "@/lib/api/eorganizer";

export default function EorganizerEventScannerPage() {
  const params = useParams<{ id: string }>();
  const eventIdNum = Number(params.id);
  const {
    devices, gates, staffList,
    handleAddDevice, handleUpdateDevice, handleDeleteDevice, handleLogActivity, handleIncrementScan,
  } = useEorganizerData();

  const handleCheckIn = async (qrToken: string) => {
    const res = await checkInAttendee(eventIdNum, qrToken);
    if (res.success && res.data) {
      return {
        success: true,
        attendeeName: res.data.attendeeName,
        ticketType: res.data.ticketType,
        seatNumber: res.data.seatNumber,
        message: "Check-in successful",
      };
    } else {
      return {
        success: false,
        message: res.error?.message || "Check-in failed",
      };
    }
  };

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
        onCheckIn={handleCheckIn}
      />
    </EventWorkspaceShell>
  );
}
