"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  initialScanners,
  initialSecurityAlerts,
} from '@/lib/mock/admin';
import { Event, EventType, User, Scanner, Transaction, Payout, VerificationApplication, SecurityAlert, Activity, TicketTier, VenueSection } from '@/types/admin';
import {
  listUsers,
  toggleUserStatus,
  listVerifications,
  approveVerification,
  rejectVerification,
} from '@/lib/api/admin/userService';
import {
  listEvents,
  listEventTypes,
  getTicketTiers,
  updateTicketTiers,
  getVenueSections,
} from '@/lib/api/admin/eventService';
import {
  listTransactions,
  listPayouts,
  processPayout,
  rejectPayout,
  updateTransactionStatus,
} from '@/lib/api/admin/financeService';
import { listSystemActivities } from '@/lib/api/admin/dashboardService';

import Sidebar from '@/components/admin/layout/Sidebar';
import Header from '@/components/admin/layout/Header';
import MobileAdminBottomNav from '@/components/admin/layout/MobileAdminBottomNav';
import DashboardView from '@/components/admin/dashboard/DashboardView';
import AnalyticsView from '@/components/admin/analytics/AnalyticsView';
import EventManagementView from '@/components/admin/events/EventManagementView';
import CreateEventView from '@/components/admin/events/CreateEventView';
import EventWorkspaceView from '@/components/admin/workspace/EventWorkspaceView';
import UserManagementView from '@/components/admin/users/UserManagementView';
import FinanceView from '@/components/admin/finance/FinanceView';
import SettingsView from '@/components/admin/finance/SettingsView';

// Backend ticket_tiers/venue_sections rows don't carry a display color (it's
// UI-only, never persisted - see repository.go), so real fetched rows are
// assigned one client-side by cycling through the same palette the old mock
// data used, rather than rendering with no color at all.
const TIER_COLORS = [
  'border-pink-500 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20',
  'border-cyan-500 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20',
  'border-indigo-500 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20',
  'border-amber-500 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
];
const SECTION_COLORS = ['bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-purple-500', 'bg-amber-500'];

export default function AdminPage() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'analytics' | 'events' | 'users' | 'finance' | 'settings' | 'workspace' | 'create-event'>('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [scanners, setScanners] = useState<Scanner[]>(initialScanners);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>(initialSecurityAlerts);

  // Transactions, payouts, and activities are backed by the real
  // /api/v1/finance* and /api/v1/dashboard/activities endpoints.
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [payoutsError, setPayoutsError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  const refreshTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    setTransactionsError(null);
    const result = await listTransactions();
    if (result.success && result.data) {
      setTransactions(result.data);
    } else {
      setTransactionsError(result.error?.message ?? 'Failed to load transactions');
    }
    setTransactionsLoading(false);
  }, []);

  useEffect(() => {
    refreshTransactions();
  }, [refreshTransactions]);

  const refreshPayouts = useCallback(async () => {
    setPayoutsLoading(true);
    setPayoutsError(null);
    const result = await listPayouts();
    if (result.success && result.data) {
      setPayouts(result.data);
    } else {
      setPayoutsError(result.error?.message ?? 'Failed to load payouts');
    }
    setPayoutsLoading(false);
  }, []);

  useEffect(() => {
    refreshPayouts();
  }, [refreshPayouts]);

  const refreshActivities = useCallback(async () => {
    const result = await listSystemActivities();
    if (result.success && result.data) {
      setActivities(result.data);
    }
  }, []);

  useEffect(() => {
    refreshActivities();
  }, [refreshActivities]);

  // Ticket tiers and venue sections are backed by the real
  // /api/v1/events/{id}/ticket-tiers and /venue-sections endpoints, fetched
  // per event when its workspace is opened (see refreshWorkspaceData below).
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([]);
  const [venueSections, setVenueSections] = useState<VenueSection[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // Tracks which event's data was most recently requested, so a slow
  // response for an event the user has since navigated away from can't land
  // late and overwrite the currently-open event's tiers/sections (network
  // responses aren't guaranteed to resolve in request order).
  const latestWorkspaceEventIdRef = useRef<string | null>(null);

  const refreshWorkspaceData = useCallback(async (eventId: string) => {
    latestWorkspaceEventIdRef.current = eventId;
    setWorkspaceLoading(true);
    setWorkspaceError(null);

    const [tiersRes, sectionsRes] = await Promise.all([getTicketTiers(eventId), getVenueSections(eventId)]);

    if (latestWorkspaceEventIdRef.current !== eventId) return;

    if (tiersRes.success && tiersRes.data) {
      setTicketTiers(tiersRes.data.map((t, i) => ({ ...t, color: TIER_COLORS[i % TIER_COLORS.length] })));
    } else {
      setWorkspaceError(tiersRes.error?.message ?? 'Failed to load ticket tiers');
    }

    if (sectionsRes.success && sectionsRes.data) {
      setVenueSections(sectionsRes.data.map((s, i) => ({ ...s, color: SECTION_COLORS[i % SECTION_COLORS.length] })));
    } else {
      setWorkspaceError((prev) => prev ?? sectionsRes.error?.message ?? 'Failed to load venue sections');
    }

    setWorkspaceLoading(false);
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      refreshWorkspaceData(selectedEventId);
    }
  }, [selectedEventId, refreshWorkspaceData]);

  // Venue sections have no editable field in the current UI - "occupied" is
  // an interactive block/simulate-entries demo, not a persisted column (see
  // repository.go: VenueSection.Occupied is always 0 from the backend). So
  // onUpdateSections stays a local-only setter; only ticket tier edits are
  // wired to a real mutation below.
  const handleUpdateTiers = async (updatedTiers: TicketTier[]) => {
    if (!selectedEventId) return;
    const result = await updateTicketTiers(selectedEventId, updatedTiers);
    if (result.success) {
      await refreshWorkspaceData(selectedEventId);
    } else {
      alert(result.error?.message ?? 'Failed to save ticket tiers');
    }
  };

  // Users + verifications are backed by the real /api/v1/users* endpoints.
  const [users, setUsers] = useState<User[]>([]);
  const [verifications, setVerifications] = useState<VerificationApplication[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const refreshUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);

    const [usersRes, verificationsRes] = await Promise.all([listUsers(), listVerifications()]);

    if (usersRes.success && usersRes.data) {
      setUsers(usersRes.data);
    } else {
      setUsersError(usersRes.error?.message ?? 'Failed to load users');
    }

    if (verificationsRes.success && verificationsRes.data) {
      setVerifications(verificationsRes.data);
    }

    setUsersLoading(false);
  }, []);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  // Events are backed by the real GET /api/v1/events endpoint (Super Admin
  // only, returns every event regardless of status).
  const refreshEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);

    const result = await listEvents();
    if (result.success && result.data) {
      setEvents(result.data);
    } else {
      setEventsError(result.error?.message ?? 'Failed to load events');
    }

    setEventsLoading(false);
  }, []);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  // Event types back the category filter/picker — fetched once, rarely changes.
  useEffect(() => {
    (async () => {
      const result = await listEventTypes();
      if (result.success && result.data) {
        setEventTypes(result.data);
      }
    })();
  }, []);

  const handleApproveVerification = async (appId: string) => {
    const result = await approveVerification(appId);
    if (result.success) {
      await refreshUsers();
    } else {
      setUsersError(result.error?.message ?? 'Failed to approve verification');
    }
  };

  const handleRejectVerification = async (appId: string) => {
    const result = await rejectVerification(appId);
    if (result.success) {
      await refreshUsers();
    } else {
      setUsersError(result.error?.message ?? 'Failed to reject verification');
    }
  };

  const handleToggleUserStatus = async (userId: string, newStatus: 'Verified' | 'Suspended') => {
    const result = await toggleUserStatus(userId, newStatus);
    if (result.success) {
      await refreshUsers();
    } else {
      setUsersError(result.error?.message ?? 'Failed to update user status');
    }
  };

  const handleProcessPayout = async (payoutId: string) => {
    const result = await processPayout(payoutId);
    if (result.success) {
      await Promise.all([refreshPayouts(), refreshActivities(), refreshEvents()]);
    } else {
      alert(result.error?.message ?? 'Failed to process payout');
    }
  };

  const handleRejectPayout = async (payoutId: string) => {
    const result = await rejectPayout(payoutId);
    if (result.success) {
      await Promise.all([refreshPayouts(), refreshActivities()]);
    } else {
      alert(result.error?.message ?? 'Failed to reject payout');
    }
  };

  const handleUpdateTransactionStatus = async (txId: string, newStatus: 'Success' | 'Refunded') => {
    const result = await updateTransactionStatus(txId, newStatus);
    if (result.success) {
      await Promise.all([refreshTransactions(), refreshActivities(), refreshEvents()]);
    } else {
      alert(result.error?.message ?? 'Failed to update transaction status');
    }
  };

  const handleAddScanner = (newScanner: Scanner) => {
    setScanners(prev => [...prev, newScanner]);
    alert(`Scanner ${newScanner.id} has been registered.`);
  };

  const handleDeleteScanner = (id: string) => {
    setScanners(prev => prev.filter(s => s.id !== id));
    alert(`Scanner access has been revoked.`);
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div id="crowdflow-admin-root" className="flex min-h-screen w-full bg-surface font-sans text-text-primary">
      {/* 1. Global Left Navigation Sidebar */}
      <Sidebar 
        currentView={currentView} 
        onViewChange={(view) => {
          setCurrentView(view);
          setSelectedEventId(null);
        }} 
        pendingVerificationsCount={verifications.filter(v => v.status === 'Pending').length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
      />
      <MobileAdminBottomNav
        currentView={currentView}
        pendingVerificationsCount={verifications.filter(v => v.status === 'Pending').length}
        onViewChange={(view) => {
          setCurrentView(view);
          setSelectedEventId(null);
        }}
      />

      {/* 2. Main Right Operations Container */}
      <div
        className={`flex min-h-screen w-full flex-1 flex-col bg-surface transition-[padding] duration-300 ${
          isSidebarCollapsed ? "md:pl-[88px]" : "md:pl-[280px]"
        }`}
      >
        {/* Global Header Search & Alerts popover */}
        <Header 
          alerts={securityAlerts} 
          onClearAlert={(id) => setSecurityAlerts(prev => prev.filter(a => a.id !== id))}
        />

        {/* Core dynamic content main frame */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 overflow-y-auto px-4 pb-28 pt-5 sm:px-6 md:p-8">
          {currentView === 'dashboard' && (
            <DashboardView 
              events={events}
              users={users}
              transactions={transactions}
              verifications={verifications}
              alerts={securityAlerts}
              activities={activities}
              onApproveVerification={handleApproveVerification}
              onRejectVerification={handleRejectVerification}
              onViewChange={(view) => {
                setCurrentView(view);
                setSelectedEventId(null);
              }}
            />
          )}

          {currentView === 'analytics' && (
            <AnalyticsView 
              events={events}
              users={users}
              transactions={transactions}
            />
          )}

          {currentView === 'events' && (
            <div className="space-y-4">
              {eventsError && (
                <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-xs font-semibold text-danger">
                  {eventsError}
                </div>
              )}
              {eventsLoading ? (
                <div className="py-24 text-center text-sm text-text-secondary">Loading events...</div>
              ) : (
                <EventManagementView
                  events={events}
                  eventTypes={eventTypes}
                  onCreateEvent={() => setCurrentView('create-event')}
                  onSelectEvent={(id) => {
                    setSelectedEventId(id);
                    setCurrentView('workspace');
                  }}
                />
              )}
            </div>
          )}

          {currentView === 'create-event' && (
            <CreateEventView
              onBack={() => setCurrentView('events')}
              onCreated={async () => {
                await refreshEvents();
                setCurrentView('events');
              }}
            />
          )}

          {currentView === 'workspace' && selectedEvent && (
            <div className="space-y-4">
              {workspaceError && (
                <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-xs font-semibold text-danger">
                  {workspaceError}
                </div>
              )}
              {workspaceLoading ? (
                <div className="py-24 text-center text-sm text-text-secondary">Loading event workspace...</div>
              ) : (
                <EventWorkspaceView
                  event={selectedEvent}
                  scanners={scanners}
                  ticketTiers={ticketTiers}
                  venueSections={venueSections}
                  transactions={transactions}
                  onBack={() => {
                    setCurrentView('events');
                    setSelectedEventId(null);
                  }}
                  onAddScanner={handleAddScanner}
                  onDeleteScanner={handleDeleteScanner}
                  onUpdateSections={setVenueSections}
                  onUpdateTiers={handleUpdateTiers}
                  onUpdateScanners={setScanners}
                />
              )}
            </div>
          )}

          {currentView === 'users' && (
            <div className="space-y-4">
              {usersError && (
                <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-xs font-semibold text-danger">
                  {usersError}
                </div>
              )}
              {usersLoading ? (
                <div className="py-24 text-center text-sm text-text-secondary">Loading users...</div>
              ) : (
                <UserManagementView
                  users={users}
                  verifications={verifications}
                  onApproveVerification={handleApproveVerification}
                  onRejectVerification={handleRejectVerification}
                  onToggleUserStatus={handleToggleUserStatus}
                />
              )}
            </div>
          )}

          {currentView === 'finance' && (
            <div className="space-y-4">
              {(transactionsError || payoutsError) && (
                <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-xs font-semibold text-danger">
                  {transactionsError ?? payoutsError}
                </div>
              )}
              {transactionsLoading || payoutsLoading ? (
                <div className="py-24 text-center text-sm text-text-secondary">Loading finance data...</div>
              ) : (
                <FinanceView
                  transactions={transactions}
                  payouts={payouts}
                  onProcessPayout={handleProcessPayout}
                  onRejectPayout={handleRejectPayout}
                  onUpdateTransactionStatus={handleUpdateTransactionStatus}
                />
              )}
            </div>
          )}

          {currentView === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>
    </div>
  );
}
