"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  EventItem, CreateEventDraft, TicketTier, Gate, ScannerDevice, Staff, VenueSection, Transaction, LogEntry,
} from "./types";
import {
  INITIAL_EVENTS, INITIAL_TICKET_TIERS, INITIAL_GATES, INITIAL_DEVICES,
  STAFF_MEMBERS, INITIAL_VENUE_SECTIONS, RECENT_TRANSACTIONS, ACTIVITY_LOGS,
} from "./data";
import { listOrganizerEvents, getDashboardData, DashboardResponse, createOrganizerEvent, publishOrganizerEvent, updateOrganizerEvent, uploadEventCover } from "@/lib/api/eorganizer";

interface Toast {
  message: string;
  type: "success" | "warning" | "info";
}

interface OrganizerDataValue {
  events: EventItem[];
  dashboardData: DashboardResponse | null;
  isLoading: boolean;
  fetchData: () => Promise<void>;
  ticketTiers: TicketTier[];
  gates: Gate[];
  devices: ScannerDevice[];
  staffList: Staff[];
  venueSections: VenueSection[];
  transactions: Transaction[];
  logs: LogEntry[];
  adminName: string;
  setAdminName: (name: string) => void;
  adminRole: string;
  setAdminRole: (role: string) => void;
  toast: Toast | null;
  pushToast: (message: string, type?: Toast['type']) => void;

  handleCreateEvent: (wizardEvent: CreateEventDraft, coverFile?: File | null) => Promise<string | null>;
  handleUpdateEventName: (eventId: string, newName: string) => void;
  handleResetData: () => void;
  handleTriggerLiveScan: () => void;

  handleCreateTier: (tier: Omit<TicketTier, "id">) => void;
  handleUpdateTier: (id: string, updated: Partial<TicketTier>) => void;
  handleDeleteTier: (id: string) => void;

  handleAddDevice: (device: ScannerDevice) => void;
  handleUpdateDevice: (id: string, updated: Partial<ScannerDevice>) => void;
  handleDeleteDevice: (id: string) => void;
  handleLogActivity: (log: { device: string; staff: string; gate: string; type: "scan_success" | "scan_failed"; message: string }) => void;
  handleIncrementScan: (deviceId: string, gateName: string) => void;

  handleAddStaff: (staff: Staff) => void;
  handleDeleteStaff: (id: string) => void;
}

const OrganizerDataContext = createContext<OrganizerDataValue | null>(null);

export function OrganizerDataProvider({ children }: { children: React.ReactNode }) {
  const [adminName, setAdminName] = useState('Alex Rivera');
  const [adminRole, setAdminRole] = useState('Event Admin');

  const [events, setEvents] = useState<EventItem[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    const [eventsRes, dashRes] = await Promise.all([
      listOrganizerEvents(),
      getDashboardData(),
    ]);

    if (eventsRes.success && eventsRes.data) {
      const mappedEvents: EventItem[] = eventsRes.data.map(e => ({
        id: e.id,
        name: e.name,
        category: e.category,
        description: e.description,
        date: e.date,
        startDate: e.startDate,
        startTime: e.startTime,
        endDate: e.endDate,
        endTime: e.endTime,
        venueId: e.venueId,
        location: e.location,
        locationAddress: e.locationAddress,
        venueName: e.venueName,
        venueCity: e.venueCity,
        capacity: e.capacity,
        sold: e.sold,
        revenue: e.revenue,
        status: e.status as "Live" | "Scheduled" | "Draft",
        image: e.image,
      }));
      setEvents(mappedEvents);
    }

    if (dashRes.success && dashRes.data) {
      setDashboardData(dashRes.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>(() => {
    if (typeof window === "undefined") return INITIAL_TICKET_TIERS;
    const saved = localStorage.getItem("cf_ticket_tiers");
    return saved ? JSON.parse(saved) : INITIAL_TICKET_TIERS;
  });
  const [gates, setGates] = useState<Gate[]>(() => {
    if (typeof window === "undefined") return INITIAL_GATES;
    const saved = localStorage.getItem("cf_gates");
    return saved ? JSON.parse(saved) : INITIAL_GATES;
  });
  const [devices, setDevices] = useState<ScannerDevice[]>(() => {
    if (typeof window === "undefined") return INITIAL_DEVICES;
    const saved = localStorage.getItem("cf_devices");
    return saved ? JSON.parse(saved) : INITIAL_DEVICES;
  });
  const [staffList, setStaffList] = useState<Staff[]>(() => {
    if (typeof window === "undefined") return STAFF_MEMBERS;
    const saved = localStorage.getItem("cf_staff");
    return saved ? JSON.parse(saved) : STAFF_MEMBERS;
  });
  const [venueSections, setVenueSections] = useState<VenueSection[]>(() => {
    if (typeof window === "undefined") return INITIAL_VENUE_SECTIONS;
    const saved = localStorage.getItem("cf_venue");
    return saved ? JSON.parse(saved) : INITIAL_VENUE_SECTIONS;
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (typeof window === "undefined") return RECENT_TRANSACTIONS;
    const saved = localStorage.getItem("cf_transactions");
    return saved ? JSON.parse(saved) : RECENT_TRANSACTIONS;
  });
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    if (typeof window === "undefined") return ACTIVITY_LOGS;
    const saved = localStorage.getItem("cf_logs");
    return saved ? JSON.parse(saved) : ACTIVITY_LOGS;
  });

  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cf_ticket_tiers", JSON.stringify(ticketTiers));
      localStorage.setItem("cf_gates", JSON.stringify(gates));
      localStorage.setItem("cf_devices", JSON.stringify(devices));
      localStorage.setItem("cf_staff", JSON.stringify(staffList));
      localStorage.setItem("cf_venue", JSON.stringify(venueSections));
      localStorage.setItem("cf_transactions", JSON.stringify(transactions));
      localStorage.setItem("cf_logs", JSON.stringify(logs));
    }
  }, [ticketTiers, gates, devices, staffList, venueSections, transactions, logs]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const pushToast = (message: string, type: Toast['type'] = 'info') => setToast({ message, type });

  // No venue here on purpose: a draft is created without one and the organizer
  // picks it in the workspace's Venue tab. Publishing is gated on it being set.
  // coverFile is uploaded AFTER the event row exists, because the upload
  // endpoint is scoped to an event id. A failed upload does not fail the
  // creation: the draft is already saved, so stranding the organizer on the
  // wizard would be worse than landing them in the workspace where the Settings
  // tab can set the cover.
  const handleCreateEvent = async (
    wizardEvent: CreateEventDraft,
    coverFile?: File | null
  ): Promise<string | null> => {
    const res = await createOrganizerEvent({
      name: wizardEvent.name,
      category: wizardEvent.category,
      description: wizardEvent.description,
      date: wizardEvent.date,
      startDate: wizardEvent.startDate,
      startTime: wizardEvent.startTime,
      endDate: wizardEvent.endDate,
      endTime: wizardEvent.endTime,
      capacity: wizardEvent.capacity,
      status: wizardEvent.status,
      image: wizardEvent.image,
    });

    if (res.success && res.data) {
      pushToast(`Successfully deployed event: ${wizardEvent.name}`, 'success');

      // Before any publish: an event submitted for review should carry the
      // cover the organizer picked, not go up without one.
      if (coverFile) {
        const cover = await uploadEventCover(Number(res.data.id), coverFile);
        if (!cover.success) {
          pushToast(
            `Event saved, but the cover image failed to upload: ${cover.error?.message ?? "Unknown error"}. You can add it from the Settings tab.`,
            'warning'
          );
        }
      }

      if (wizardEvent.status === "Scheduled") {
        await publishOrganizerEvent(Number(res.data.id));
      }
      await fetchData();
      return String(res.data.id);
    } else {
      pushToast(`Failed to deploy event: ${res.error?.message || "Unknown error"}`, 'warning');
      return null;
    }
  };

  const handleUpdateEventName = async (eventId: string, newName: string) => {
    const idNum = Number(eventId);
    if (!isNaN(idNum)) {
      const res = await updateOrganizerEvent(idNum, { name: newName });
      if (res.success) {
        pushToast("Event name updated successfully", "success");
        await fetchData();
      } else {
        pushToast(`Failed to update event name: ${res.error?.message || "Unknown error"}`, "warning");
      }
    } else {
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, name: newName } : e));
    }
  };

  const handleResetData = () => {
    localStorage.clear();
    setEvents(INITIAL_EVENTS);
    setTicketTiers(INITIAL_TICKET_TIERS);
    setGates(INITIAL_GATES);
    setDevices(INITIAL_DEVICES);
    setStaffList(STAFF_MEMBERS);
    setVenueSections(INITIAL_VENUE_SECTIONS);
    setTransactions(RECENT_TRANSACTIONS);
    setLogs(ACTIVITY_LOGS);
    pushToast("Workspace data reset to default presets.", "info");
  };

  const handleTriggerLiveScan = () => {
    const onlineDevs = devices.filter(d => d.status === "online");
    if (onlineDevs.length === 0) {
      pushToast("No active scanner device deployed at the doors.", "warning");
      return;
    }
    const dev = onlineDevs[Math.floor(Math.random() * onlineDevs.length)];
    const timeStr = new Date().toLocaleTimeString("en-US", { hour12: false });
    const randId = `log-${Date.now()}`;

    setDevices(prev => prev.map(d => d.id === dev.id ? { ...d, scans: d.scans + 1 } : d));
    setGates(prev => prev.map(g => g.name === dev.gate ? { ...g, scans: g.scans + 1 } : g));
    setLogs(prev => [{ id: randId, timestamp: timeStr, device: dev.name, staff: dev.staff, gate: dev.gate, type: "scan_success", message: `Ticket verified. Checked in attendee at ${dev.gate}` }, ...prev]);
    pushToast(`Checked-in attendee at ${dev.gate}!`, "success");
  };

  const handleCreateTier = (tier: Omit<TicketTier, "id">) => {
    setTicketTiers(prev => [...prev, { ...tier, id: `ticket-${Date.now()}` }]);
  };

  const handleUpdateTier = (id: string, updated: Partial<TicketTier>) => {
    setTicketTiers(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
  };

  const handleDeleteTier = (id: string) => {
    setTicketTiers(prev => prev.filter(t => t.id !== id));
  };

  const handleAddDevice = (device: ScannerDevice) => {
    setDevices(prev => [device, ...prev]);
  };

  const handleUpdateDevice = (id: string, updated: Partial<ScannerDevice>) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, ...updated } : d));
  };

  const handleDeleteDevice = (id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
  };

  const handleLogActivity = (log: { device: string; staff: string; gate: string; type: "scan_success" | "scan_failed"; message: string }) => {
    setLogs(prev => [{ id: `log-${Date.now()}`, timestamp: new Date().toLocaleTimeString(), ...log }, ...prev]);
  };

  const handleIncrementScan = (deviceId: string, gateName: string) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, scans: d.scans + 1 } : d));
    setGates(prev => prev.map(g => g.name === gateName ? { ...g, scans: g.scans + 1 } : g));
  };

  const handleAddStaff = (staff: Staff) => {
    setStaffList(prev => [staff, ...prev]);
  };

  const handleDeleteStaff = (id: string) => {
    setStaffList(prev => prev.filter(s => s.id !== id));
  };

  const value: OrganizerDataValue = {
    events, dashboardData, isLoading, fetchData, ticketTiers, gates, devices, staffList, venueSections, transactions, logs,
    adminName, setAdminName, adminRole, setAdminRole,
    toast, pushToast,
    handleCreateEvent, handleUpdateEventName, handleResetData, handleTriggerLiveScan,
    handleCreateTier, handleUpdateTier, handleDeleteTier,
    handleAddDevice, handleUpdateDevice, handleDeleteDevice, handleLogActivity, handleIncrementScan,
    handleAddStaff, handleDeleteStaff,
  };

  return <OrganizerDataContext.Provider value={value}>{children}</OrganizerDataContext.Provider>;
}

export function useOrganizerData(): OrganizerDataValue {
  const ctx = useContext(OrganizerDataContext);
  if (!ctx) throw new Error("useOrganizerData must be used within OrganizerDataProvider");
  return ctx;
}
