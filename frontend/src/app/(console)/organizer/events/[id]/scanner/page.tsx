"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceStaff from "../../../components/Workspace/WorkspaceStaff";
import { getEventCheckInStats, type GateCheckInStat } from "@/lib/api/eorganizer";
import { listEventGates, createEventGate } from "@/lib/api/scanner";
import { listTicketTiers, OrganizerTicketTier } from "@/lib/api/eorganizer";
import {
  listEventStaff,
  updateStaffStatus,
  deleteEventStaff,
  resetStaffCredentials,
  EventStaffMember,
} from "@/lib/api/eventstaff";
import { Gate } from "../../../types";

export default function OrganizerEventScannerPage() {
  const params = useParams<{ id: string }>();
  const eventIdNum = Number(params.id);

  const [gates, setGates] = useState<Gate[]>([]);
  const [tiers, setTiers] = useState<OrganizerTicketTier[]>([]);
  const [staff, setStaff] = useState<EventStaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [gatesRes, statsRes, tiersRes, staffRes] = await Promise.all([
        listEventGates(eventIdNum),
        getEventCheckInStats(eventIdNum),
        listTicketTiers(eventIdNum),
        listEventStaff(eventIdNum),
      ]);

      const statsByGate = new Map<number, GateCheckInStat>();
      if (statsRes.success && statsRes.data) {
        for (const g of statsRes.data.gates) statsByGate.set(g.gateId, g);
      }

      let currentGates: Gate[] = [];
      if (gatesRes.success && gatesRes.data) {
        currentGates = gatesRes.data.map((g: any) => ({
          id: String(g.id),
          name: g.name,
          scans: statsByGate.get(g.id)?.scans ?? 0,
          status: (g.status === "active" ? "online" : "offline") as "online" | "offline",
          staffCount: statsByGate.get(g.id)?.deviceCount ?? 0,
        }));
      }

      if (currentGates.length === 0) {
        const defaults = ["Gate A - Main", "Gate B - VIP", "Gate C - General"];
        const createdGates: Gate[] = [];
        for (const name of defaults) {
          const createRes = await createEventGate(eventIdNum, name);
          if (createRes.success && createRes.data) {
            const g = createRes.data;
            createdGates.push({ id: String(g.id), name: g.name, scans: 0, status: g.status === "active" ? "online" : "offline", staffCount: 0 });
          }
        }
        currentGates = createdGates;
      }

      setGates(currentGates);
      if (tiersRes.success && tiersRes.data) setTiers(tiersRes.data);
      if (staffRes.success && staffRes.data) setStaff(staffRes.data);
    } catch (err) {
      console.error("Failed to load staff/scanner data from DB:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventIdNum]);

  const handleToggleStatus = async (staffId: number, next: "active" | "suspended") => {
    const res = await updateStaffStatus(eventIdNum, staffId, next);
    if (res.success) await loadData();
  };

  const handleDelete = async (staffId: number) => {
    const res = await deleteEventStaff(eventIdNum, staffId);
    if (res.success) await loadData();
  };

  const handleResetCredentials = async (staffId: number) => {
    const res = await resetStaffCredentials(eventIdNum, staffId);
    return res.success && res.data ? res.data : null;
  };

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="scanner">
      {isLoading && gates.length === 0 ? (
        <div className="bg-white border border-border-subtle rounded-xl p-10 text-center soft-shadow">
          <p className="text-sm font-bold text-text-primary">Loading staff and gate data...</p>
        </div>
      ) : (
        <WorkspaceStaff
          eventId={eventIdNum}
          gates={gates}
          tiers={tiers}
          staff={staff}
          onRefresh={loadData}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
          onResetCredentials={handleResetCredentials}
        />
      )}
    </EventWorkspaceShell>
  );
}
