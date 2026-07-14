"use client";

import React, { useState, useEffect } from "react";
import { EventItem, TicketTier, Gate, ScannerDevice, Staff, VenueSection, Transaction, LogEntry, AppView } from "./types";
import { 
  INITIAL_EVENTS, 
  INITIAL_TICKET_TIERS, 
  INITIAL_GATES, 
  INITIAL_DEVICES, 
  STAFF_MEMBERS, 
  INITIAL_VENUE_SECTIONS, 
  RECENT_TRANSACTIONS, 
  ACTIVITY_LOGS 
} from "./data";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import EventWorkspaceHeader from "./components/EventWorkspaceHeader";
import MobileNavDrawer from "./components/MobileNavDrawer";
import MobileBottomNav from "./components/MobileBottomNav";
import DashboardView from "./components/DashboardView";
import EventsView from "./components/EventsView";
import OrdersView from "./components/OrdersView";
import AttendeesView from "./components/AttendeesView";
import FinanceView from "./components/FinanceView";
import ReportsView from "./components/ReportsView";
import SettingsView from "./components/SettingsView";
import CreateEventWizard from "./components/CreateEventWizard/CreateEventWizard";

// Workspace sub-tabs
import WorkspaceOverview from "./components/Workspace/WorkspaceOverview";
import WorkspaceTickets from "./components/Workspace/WorkspaceTickets";
import WorkspaceVenue from "./components/Workspace/WorkspaceVenue";
import WorkspaceScanner from "./components/Workspace/WorkspaceScanner";
import WorkspaceAnalytics from "./components/Workspace/WorkspaceAnalytics";
import WorkspaceSettings from "./components/Workspace/WorkspaceSettings";

export default function Page() {
  const [currentView, setView] = useState<AppView>('dashboard');
  const [workspaceTab, setWorkspaceTab] = useState<string>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Profile
  const [adminName, setAdminName] = useState('Alex Rivera');
  const [adminRole, setAdminRole] = useState('Event Admin');

  // Master local storage datasets
  const [events, setEvents] = useState<EventItem[]>(() => {
    if (typeof window === "undefined") return INITIAL_EVENTS;
    const saved = localStorage.getItem("cf_events");
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });
  const [selectedEventId, setSelectedEventId] = useState<string>("EVT-101");
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

  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "info" } | null>(null);

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

  const selectedEvent = events.find(e => e.id === selectedEventId) || events[0];

  const handleOpenWorkspace = (eventId: string) => {
    setSelectedEventId(eventId);
    setWorkspaceTab('overview');
    setView('workspace');
  };

  const handleCreateEvent = (wizardEvent: Omit<EventItem, "id" | "sold" | "revenue">) => {
    const newId = `EVT-${Date.now()}`;
    const newEvent: EventItem = {
      ...wizardEvent,
      id: newId,
      sold: 0,
      revenue: 0,
    };
    setEvents([newEvent, ...events]);
    setToast({ message: `Successfully deployed event: ${newEvent.name}`, type: "success" });
    setView('events');
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
    setToast({ message: "Workspace data reset to default presets.", type: "info" });
  };

  const handleTriggerLiveScan = () => {
    const onlineDevs = devices.filter(d => d.status === "online");
    if (onlineDevs.length === 0) {
      setToast({ message: "No active scanner device deployed at the doors.", type: "warning" });
      return;
    }
    const dev = onlineDevs[Math.floor(Math.random() * onlineDevs.length)];
    const timeStr = new Date().toLocaleTimeString("en-US", { hour12: false });
    const randId = `log-${Date.now()}`;

    setDevices(devices.map(d => d.id === dev.id ? { ...d, scans: d.scans + 1 } : d));
    setGates(gates.map(g => g.name === dev.gate ? { ...g, scans: g.scans + 1 } : g));
    setLogs([{ id: randId, timestamp: timeStr, device: dev.name, staff: dev.staff, gate: dev.gate, type: "scan_success", message: `Ticket verified. Checked in attendee at ${dev.gate}` }, ...logs]);
    setToast({ message: `Checked-in attendee at ${dev.gate}!`, type: "success" });
  };

  return (
    <div id="crowdflow-app" className="min-h-screen bg-surface text-text-primary flex font-sans select-none antialiased w-full">
      <Sidebar
        currentView={currentView}
        setView={setView}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentView={currentView}
        setView={setView}
        onCreateEventClick={() => setView('create-event')}
      />

      <MobileBottomNav currentView={currentView} setView={setView} />

      <div
        className={`flex min-h-screen w-full flex-1 flex-col bg-surface transition-[padding] duration-300 ${
          isSidebarCollapsed ? 'lg:pl-[88px]' : 'lg:pl-[280px]'
        }`}
      >
        <Header
          currentTabName={currentView === 'workspace' ? workspaceTab : currentView}
          selectedEventName={currentView === 'workspace' ? selectedEvent?.name : undefined}
          onResetData={handleResetData}
          onTriggerLiveScan={currentView === 'workspace' ? handleTriggerLiveScan : undefined}
          recentLogs={logs}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
          user={{ name: adminName, role: adminRole, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop' }}
        />

        <main className="mx-auto w-full max-w-[1440px] flex-1 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 md:p-8 space-y-6">
          {toast && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl border bg-white border-secondary text-text-primary animate-fade-in">
              <span className={`w-2.5 h-2.5 rounded-full ${toast.type === "success" ? "bg-success" : toast.type === "warning" ? "bg-danger" : "bg-secondary/100"}`}></span>
              <span>{toast.message}</span>
            </div>
          )}

          {currentView === 'dashboard' && <DashboardView onCreateEvent={() => setView('create-event')} onNavigateToView={(v) => setView(v)} />}
          {currentView === 'events' && <EventsView events={events} onCreateEvent={() => setView('create-event')} onOpenWorkspace={handleOpenWorkspace} />}
          {currentView === 'orders' && <OrdersView />}
          {currentView === 'attendees' && <AttendeesView />}
          {currentView === 'finance' && <FinanceView />}
          {currentView === 'reports' && <ReportsView />}
          {currentView === 'settings' && <SettingsView adminName={adminName} setAdminName={setAdminName} adminRole={adminRole} setAdminRole={setAdminRole} />}
          {currentView === 'create-event' && <CreateEventWizard onCancel={() => setView('events')} onSubmitSuccess={handleCreateEvent} />}

          {currentView === 'workspace' && (
            <>
              <EventWorkspaceHeader
                event={selectedEvent}
                workspaceTab={workspaceTab}
                setWorkspaceTab={setWorkspaceTab}
                onBack={() => setView('events')}
              />
              {workspaceTab === 'overview' && <WorkspaceOverview event={selectedEvent} ticketTiers={ticketTiers} devices={devices} transactions={transactions} logs={logs} onSwitchTab={setWorkspaceTab} />}
              {workspaceTab === 'tickets' && <WorkspaceTickets ticketTiers={ticketTiers} onCreateTier={(t) => setTicketTiers([...ticketTiers, { ...t, id: `ticket-${Date.now()}` }])} onUpdateTier={(id, upd) => setTicketTiers(ticketTiers.map(t => t.id === id ? { ...t, ...upd } : t))} onDeleteTier={(id) => setTicketTiers(ticketTiers.filter(t => t.id !== id))} />}
              {workspaceTab === 'venue' && <WorkspaceVenue sections={venueSections} />}
              {workspaceTab === 'scanner' && <WorkspaceScanner devices={devices} gates={gates} staffList={staffList} onAddDevice={(d) => setDevices([d, ...devices])} onUpdateDevice={(id, upd) => setDevices(devices.map(d => d.id === id ? { ...d, ...upd } : d))} onDeleteDevice={(id) => setDevices(devices.filter(d => d.id !== id))} onLogActivity={(l) => setLogs([{ id: `log-${Date.now()}`, timestamp: new Date().toLocaleTimeString(), ...l }, ...logs])} onIncrementScan={(id, gt) => { setDevices(devices.map(d => d.id === id ? { ...d, scans: d.scans + 1 } : d)); setGates(gates.map(g => g.name === gt ? { ...g, scans: g.scans + 1 } : g)); }} />}
              {workspaceTab === 'analytics' && <WorkspaceAnalytics />}
              {workspaceTab === 'settings' && <WorkspaceSettings eventName={selectedEvent.name} onUpdateEventName={(n) => setEvents(events.map(e => e.id === selectedEventId ? { ...e, name: n } : e))} staffList={staffList} onAddStaff={(s) => setStaffList([s, ...staffList])} onDeleteStaff={(id) => setStaffList(staffList.filter(s => s.id !== id))} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
