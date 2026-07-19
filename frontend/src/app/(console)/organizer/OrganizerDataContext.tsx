"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  EventItem, TicketTier, Gate, ScannerDevice, Staff, VenueSection, Transaction, LogEntry,
} from "./types";
import {
  INITIAL_EVENTS, INITIAL_TICKET_TIERS, INITIAL_GATES, INITIAL_DEVICES,
  STAFF_MEMBERS, INITIAL_VENUE_SECTIONS, RECENT_TRANSACTIONS, ACTIVITY_LOGS,
} from "./data";

interface Toast {
  message: string;
  type: "success" | "warning" | "info";
}

interface OrganizerDataValue {
  events: EventItem[];
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

  handleCreateEvent: (wizardEvent: Omit<EventItem, "id" | "sold" | "revenue">) => void;
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

  const [events, setEvents] = useState<EventItem[]>(() => {
    if (typeof window === "undefined") return INITIAL_EVENTS;
    const saved = localStorage.getItem("cf_events");
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });
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
      localStorage.setItem("cf_events", JSON.stringify(events));
      localStorage.setItem("cf_ticket_tiers", JSON.stringify(ticketTiers));
      localStorage.setItem("cf_gates", JSON.stringify(gates));
      localStorage.setItem("cf_devices", JSON.stringify(devices));
      localStorage.setItem("cf_staff", JSON.stringify(staffList));
      localStorage.setItem("cf_venue", JSON.stringify(venueSections));
      localStorage.setItem("cf_transactions", JSON.stringify(transactions));
      localStorage.setItem("cf_logs", JSON.stringify(logs));
    }
  }, [events, ticketTiers, gates, devices, staffList, venueSections, transactions, logs]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const pushToast = (message: string, type: Toast['type'] = 'info') => setToast({ message, type });

  const handleCreateEvent = (wizardEvent: Omit<EventItem, "id" | "sold" | "revenue">) => {
    const newId = `EVT-${Date.now()}`;
    const newEvent: EventItem = { ...wizardEvent, id: newId, sold: 0, revenue: 0 };
    setEvents(prev => [newEvent, ...prev]);
    pushToast(`Successfully deployed event: ${newEvent.name}`, 'success');
  };

  const handleUpdateEventName = (eventId: string, newName: string) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, name: newName } : e));
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
    events, ticketTiers, gates, devices, staffList, venueSections, transactions, logs,
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
