"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  initialScanners,
  initialSecurityAlerts,
} from '@/lib/mock/admin';
import { ApiResponse, Event, EventType, User, Scanner, Transaction, Payout, VerificationApplication, SecurityAlert, Activity, TicketTier, VenueSection } from '@/types/admin';
import {
  listUsers,
  toggleUserStatus,
  listVerifications,
  approveVerification,
  rejectVerification,
  grantUserRole,
  revokeUserRole,
} from '@/lib/api/admin/userService';
import {
  listEvents,
  listEventTypes,
  getTicketTiers,
  updateTicketTiers,
  deleteTicketTier,
  approveEvent,
  rejectEvent,
  setEventStatus,
} from '@/lib/api/admin/eventService';
import {
  listTransactions,
  listPayouts,
  processPayout,
  rejectPayout,
  updateTransactionStatus,
} from '@/lib/api/admin/financeService';
import { listSystemActivities } from '@/lib/api/admin/dashboardService';

// The admin console assigns display colours client-side by cycling a palette,
// rather than rendering rows with no colour at all. (ticket_tiers does now have
// a color column, used by the buyer seat map; this palette is the admin list's
// own fallback and is independent of it.)
const TIER_COLORS = [
  'border-pink-500 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20',
  'border-cyan-500 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20',
  'border-indigo-500 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20',
  'border-amber-500 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
];
const SECTION_COLORS = ['bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-purple-500', 'bg-amber-500'];

// Page sizes mirror each endpoint's backend default (see the 2026-07-13
// pagination audit) - offset = page * size.
const EVENTS_PAGE_SIZE = 20;
const USERS_PAGE_SIZE = 50;
const TRANSACTIONS_PAGE_SIZE = 50;
const PAYOUTS_PAGE_SIZE = 50;

interface AdminDataValue {
  // Events
  events: Event[];
  eventsLoading: boolean;
  eventsError: string | null;
  eventsPage: number;
  setEventsPage: React.Dispatch<React.SetStateAction<number>>;
  eventsHasNext: boolean;
  eventTypes: EventType[];
  refreshEvents: () => Promise<void>;

  // Users + verifications
  users: User[];
  verifications: VerificationApplication[];
  usersLoading: boolean;
  usersError: string | null;
  usersPage: number;
  setUsersPage: React.Dispatch<React.SetStateAction<number>>;
  usersHasNext: boolean;
  pendingVerificationsCount: number;

  // Finance
  transactions: Transaction[];
  transactionsLoading: boolean;
  transactionsError: string | null;
  transactionsPage: number;
  setTransactionsPage: React.Dispatch<React.SetStateAction<number>>;
  transactionsHasNext: boolean;
  payouts: Payout[];
  payoutsLoading: boolean;
  payoutsError: string | null;
  payoutsPage: number;
  setPayoutsPage: React.Dispatch<React.SetStateAction<number>>;
  payoutsHasNext: boolean;

  // Activities + alerts + scanners
  activities: Activity[];
  securityAlerts: SecurityAlert[];
  clearAlert: (id: string) => void;
  scanners: Scanner[];
  setScanners: React.Dispatch<React.SetStateAction<Scanner[]>>;

  // Workspace (per-event tiers/sections)
  selectedEventId: string | null;
  openWorkspace: (eventId: string) => void;
  ticketTiers: TicketTier[];
  venueSections: VenueSection[];
  setVenueSections: React.Dispatch<React.SetStateAction<VenueSection[]>>;
  workspaceLoading: boolean;
  workspaceError: string | null;

  // Mutations
  handleApproveVerification: (appId: string) => Promise<void>;
  handleRejectVerification: (appId: string) => Promise<void>;
  handleApproveEvent: (eventId: string) => Promise<void>;
  handleRejectEvent: (eventId: string, notes: string) => Promise<void>;
  handleSetEventDraft: (eventId: string) => Promise<void>;
  handleSetEventPendingReview: (eventId: string) => Promise<void>;
  handleToggleUserStatus: (userId: string, newStatus: 'Verified' | 'Suspended') => Promise<void>;
  handleGrantRole: (userId: string, roleId: number, eventId: number | null) => Promise<ApiResponse<void>>;
  handleRevokeRole: (userId: string, roleId: number, eventId: number | null) => Promise<ApiResponse<void>>;
  handleProcessPayout: (payoutId: string) => Promise<void>;
  handleRejectPayout: (payoutId: string) => Promise<void>;
  handleUpdateTransactionStatus: (txId: string, newStatus: 'Success' | 'Refunded') => Promise<void>;
  handleUpdateTiers: (updatedTiers: TicketTier[]) => Promise<void>;
  handleDeleteTier: (tierId: string) => Promise<void>;
  handleAddScanner: (newScanner: Scanner) => void;
  handleDeleteScanner: (id: string) => void;
  refreshEventDetails: () => Promise<void>;
}

const AdminDataContext = createContext<AdminDataValue | null>(null);

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsPage, setEventsPage] = useState(0);
  const [eventsHasNext, setEventsHasNext] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [scanners, setScanners] = useState<Scanner[]>(initialScanners);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>(initialSecurityAlerts);

  // Transactions, payouts, and activities are backed by the real
  // /api/v1/admin/finance* and /api/v1/admin/dashboard/activities endpoints.
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [transactionsPage, setTransactionsPage] = useState(0);
  const [transactionsHasNext, setTransactionsHasNext] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [payoutsError, setPayoutsError] = useState<string | null>(null);
  const [payoutsPage, setPayoutsPage] = useState(0);
  const [payoutsHasNext, setPayoutsHasNext] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);

  const refreshTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    setTransactionsError(null);
    const result = await listTransactions(TRANSACTIONS_PAGE_SIZE, transactionsPage * TRANSACTIONS_PAGE_SIZE);
    if (result.success && result.data) {
      setTransactions(result.data);
      setTransactionsHasNext(result.data.length === TRANSACTIONS_PAGE_SIZE);
    } else {
      setTransactionsError(result.error?.message ?? 'Failed to load transactions');
    }
    setTransactionsLoading(false);
  }, [transactionsPage]);

  useEffect(() => {
    refreshTransactions();
  }, [refreshTransactions]);

  const refreshPayouts = useCallback(async () => {
    setPayoutsLoading(true);
    setPayoutsError(null);
    const result = await listPayouts(PAYOUTS_PAGE_SIZE, payoutsPage * PAYOUTS_PAGE_SIZE);
    if (result.success && result.data) {
      setPayouts(result.data);
      setPayoutsHasNext(result.data.length === PAYOUTS_PAGE_SIZE);
    } else {
      setPayoutsError(result.error?.message ?? 'Failed to load payouts');
    }
    setPayoutsLoading(false);
  }, [payoutsPage]);

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

  // Ticket tiers are backed by the real /api/v1/events/{id}/ticket-tiers
  // endpoint, fetched per event when its workspace is opened (see
  // refreshWorkspaceData below).
  //
  // venueSections is now LOCAL-ONLY demo state for the scanner simulator.
  // Venue sections were removed from the schema: a venue layout is an untiered
  // reusable template and tier grouping is per-seat and event-scoped, so there
  // is no /venue-sections endpoint to read any more.
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
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

    const tiersRes = await getTicketTiers(eventId);

    if (latestWorkspaceEventIdRef.current !== eventId) return;

    if (tiersRes.success && tiersRes.data) {
      setTicketTiers(tiersRes.data.map((t, i) => ({ ...t, color: TIER_COLORS[i % TIER_COLORS.length] })));
    } else {
      setWorkspaceError(tiersRes.error?.message ?? 'Failed to load ticket tiers');
    }

    setWorkspaceLoading(false);
  }, []);

  // Called by the workspace route on mount / param change: records which event
  // is open (so the tier mutations below target it) and loads its data.
  const openWorkspace = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
    refreshWorkspaceData(eventId);
  }, [refreshWorkspaceData]);

  // setVenueSections is a local-only setter feeding the scanner simulator's
  // block/simulate-entries demo. Only ticket tier edits are wired to a real
  // mutation below.
  const handleUpdateTiers = async (updatedTiers: TicketTier[]) => {
    if (!selectedEventId) return;
    const result = await updateTicketTiers(selectedEventId, updatedTiers);
    if (result.success) {
      await refreshWorkspaceData(selectedEventId);
    } else {
      alert(result.error?.message ?? 'Failed to save ticket tiers');
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!selectedEventId) return;
    const result = await deleteTicketTier(selectedEventId, tierId);
    if (result.success) {
      await refreshWorkspaceData(selectedEventId);
    } else {
      alert(result.error?.message ?? 'Failed to delete ticket tier');
    }
  };

  // Users + verifications are backed by the real /api/v1/admin/users* endpoints.
  const [users, setUsers] = useState<User[]>([]);
  const [verifications, setVerifications] = useState<VerificationApplication[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersPage, setUsersPage] = useState(0);
  const [usersHasNext, setUsersHasNext] = useState(false);

  const refreshUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);

    const [usersRes, verificationsRes] = await Promise.all([
      listUsers(USERS_PAGE_SIZE, usersPage * USERS_PAGE_SIZE),
      listVerifications(),
    ]);

    if (usersRes.success && usersRes.data) {
      setUsers(usersRes.data);
      setUsersHasNext(usersRes.data.length === USERS_PAGE_SIZE);
    } else {
      setUsersError(usersRes.error?.message ?? 'Failed to load users');
    }

    if (verificationsRes.success && verificationsRes.data) {
      setVerifications(verificationsRes.data);
    }

    setUsersLoading(false);
  }, [usersPage]);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  // Events are backed by the real GET /api/v1/events endpoint (Super Admin
  // only, returns every event regardless of status).
  const refreshEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);

    const result = await listEvents(EVENTS_PAGE_SIZE, eventsPage * EVENTS_PAGE_SIZE);
    if (result.success && result.data) {
      setEvents(result.data);
      setEventsHasNext(result.data.length === EVENTS_PAGE_SIZE);
    } else {
      setEventsError(result.error?.message ?? 'Failed to load events');
    }

    setEventsLoading(false);
  }, [eventsPage]);

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

  const handleApproveEvent = async (eventId: string) => {
    const result = await approveEvent(eventId);
    if (result.success) {
      await Promise.all([refreshEvents(), refreshActivities()]);
    } else {
      setEventsError(result.error?.message ?? 'Failed to approve event');
    }
  };

  const handleRejectEvent = async (eventId: string, notes: string) => {
    const result = await rejectEvent(eventId, notes);
    if (result.success) {
      await Promise.all([refreshEvents(), refreshActivities()]);
    } else {
      setEventsError(result.error?.message ?? 'Failed to reject event');
    }
  };

  const handleSetEventDraft = async (eventId: string) => {
    const result = await setEventStatus(eventId, 'draft');
    if (result.success) {
      await Promise.all([refreshEvents(), refreshActivities()]);
    } else {
      setEventsError(result.error?.message ?? 'Failed to set event to draft');
    }
  };

  const handleSetEventPendingReview = async (eventId: string) => {
    const result = await setEventStatus(eventId, 'pending_review');
    if (result.success) {
      await Promise.all([refreshEvents(), refreshActivities()]);
    } else {
      setEventsError(result.error?.message ?? 'Failed to set event to pending review');
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

  // Grant/revoke return the ApiResponse so the drawer can surface the specific
  // error (e.g. the separation-of-duties rejection) inline instead of only the
  // page-level banner, which sits behind the drawer overlay.
  const handleGrantRole = async (userId: string, roleId: number, eventId: number | null) => {
    const result = await grantUserRole(userId, roleId, eventId);
    if (result.success) {
      await Promise.all([refreshUsers(), refreshActivities()]);
    }
    return result;
  };

  const handleRevokeRole = async (userId: string, roleId: number, eventId: number | null) => {
    const result = await revokeUserRole(userId, roleId, eventId);
    if (result.success) {
      await Promise.all([refreshUsers(), refreshActivities()]);
    }
    return result;
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

  const clearAlert = (id: string) => setSecurityAlerts(prev => prev.filter(a => a.id !== id));

  const value: AdminDataValue = {
    events, eventsLoading, eventsError, eventsPage, setEventsPage, eventsHasNext, eventTypes, refreshEvents,
    users, verifications, usersLoading, usersError, usersPage, setUsersPage, usersHasNext,
    pendingVerificationsCount: verifications.filter(v => v.status === 'Pending').length,
    transactions, transactionsLoading, transactionsError, transactionsPage, setTransactionsPage, transactionsHasNext,
    payouts, payoutsLoading, payoutsError, payoutsPage, setPayoutsPage, payoutsHasNext,
    activities, securityAlerts, clearAlert, scanners, setScanners,
    selectedEventId, openWorkspace, ticketTiers, venueSections, setVenueSections, workspaceLoading, workspaceError,
    handleApproveVerification, handleRejectVerification,
    handleApproveEvent, handleRejectEvent, handleSetEventDraft, handleSetEventPendingReview,
    handleToggleUserStatus, handleGrantRole, handleRevokeRole,
    handleProcessPayout, handleRejectPayout, handleUpdateTransactionStatus,
    handleUpdateTiers, handleDeleteTier, handleAddScanner, handleDeleteScanner,
    refreshEventDetails: refreshEvents,
  };

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData(): AdminDataValue {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error("useAdminData must be used within AdminDataProvider");
  return ctx;
}
