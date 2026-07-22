"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceScanner from "../../../components/Workspace/WorkspaceScanner";
import { useOrganizerData } from "../../../OrganizerDataContext";
import { checkInAttendee } from "@/lib/api/eorganizer";
import {
  listEventGates,
  createEventGate,
  listScannerDevices,
  registerScannerDevice,
  deleteScannerDevice
} from "@/lib/api/scanner";
import { Gate, ScannerDevice, Staff } from "../../../types";

export default function OrganizerEventScannerPage() {
  const params = useParams<{ id: string }>();
  const eventIdNum = Number(params.id);
  const router = useRouter();

  const { staffList, handleLogActivity } = useOrganizerData();

  // Local state connected to database
  const [gates, setGates] = useState<Gate[]>([]);
  const [devices, setDevices] = useState<ScannerDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [gatesRes, devicesRes] = await Promise.all([
        listEventGates(eventIdNum),
        listScannerDevices(eventIdNum),
      ]);

      let currentGates: Gate[] = [];
      if (gatesRes.success && gatesRes.data) {
        // Map from backend EventGate
        currentGates = gatesRes.data.map((g: any) => ({
          id: String(g.id),
          name: g.name,
          scans: 0, // dynamic client counter
          status: (g.status === "active" ? "online" : "offline") as "online" | "offline",
          staffCount: 0,
        }));
      }

      // Auto-create default gates if none exist
      if (currentGates.length === 0) {
        const defaults = ["Gate A - Main", "Gate B - VIP", "Gate C - General"];
        const createdGates: Gate[] = [];
        for (const name of defaults) {
          const createRes = await createEventGate(eventIdNum, name);
          if (createRes.success && createRes.data) {
            const g = createRes.data;
            createdGates.push({
              id: String(g.id),
              name: g.name,
              scans: 0,
              status: (g.status === "active" ? "online" : "offline") as "online" | "offline",
              staffCount: 0,
            });
          }
        }
        currentGates = createdGates;
      }

      setGates(currentGates);

      if (devicesRes.success && devicesRes.data) {
        const mappedDevices: ScannerDevice[] = devicesRes.data.map((d: any) => ({
          id: String(d.id),
          name: d.deviceName,
          staff: d.staffName || "Staff Scanner",
          gate: d.gateName || "General",
          status: d.status === "online" ? "online" : "offline",
          battery: 100,
          lastSync: "Just now",
          scans: 0,
          role: d.role as any,
          permissions: ["Scan Tickets"],
          deviceToken: d.deviceToken,
        }));
        setDevices(mappedDevices);

        // Update staff counts on gates
        setGates(prev =>
          prev.map(g => ({
            ...g,
            staffCount: mappedDevices.filter(d => d.gate === g.name).length,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load scanner data from DB:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventIdNum]);

  const handleAddDevice = async (deviceInput: any) => {
    // Locate the gate object from the database list by its name to get its actual integer ID
    const matchedGate = gates.find(g => g.name === deviceInput.gate);
    const gateId = matchedGate ? Number(matchedGate.id) : null;

    try {
      const res = await registerScannerDevice(
        eventIdNum,
        deviceInput.name,
        gateId,
        deviceInput.staff,
        deviceInput.role
      );

      if (res.success && res.data) {
        const fullURL = `${window.location.origin}${res.data.scannerUrl}`;
        await loadData();
        return {
          token: res.data.deviceToken,
          url: fullURL,
        };
      }
    } catch (err) {
      console.error("Failed to register scanner device:", err);
    }
    return null;
  };

  const handleDeleteDevice = async (deviceId: string) => {
    setIsLoading(true);
    try {
      await deleteScannerDevice(eventIdNum, Number(deviceId));
      await loadData();
    } catch (err) {
      console.error("Failed to delete device:", err);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleIncrementScan = (deviceId: string, gateName: string) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, scans: d.scans + 1 } : d));
    setGates(prev => prev.map(g => g.name === gateName ? { ...g, scans: g.scans + 1 } : g));
  };

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="scanner">
      {isLoading && gates.length === 0 ? (
        <div className="bg-white border border-border-subtle rounded-xl p-10 text-center soft-shadow">
          <p className="text-sm font-bold text-text-primary">Loading live scanner devices...</p>
        </div>
      ) : (
        <WorkspaceScanner
          devices={devices}
          gates={gates}
          staffList={staffList}
          onAddDevice={handleAddDevice}
          onUpdateDevice={() => {}}
          onDeleteDevice={handleDeleteDevice}
          onLogActivity={handleLogActivity}
          onIncrementScan={handleIncrementScan}
          onCheckIn={handleCheckIn}
        />
      )}
    </EventWorkspaceShell>
  );
}
