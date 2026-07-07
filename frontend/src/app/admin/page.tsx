"use client";

import React, { useState } from 'react';
import { 
  initialEvents, 
  initialUsers, 
  initialScanners, 
  initialTransactions, 
  initialPayouts, 
  initialVerificationApplications, 
  initialSecurityAlerts, 
  initialActivities,
  initialTicketTiers,
  initialVenueSections
} from '@/lib/mock/admin';
import { Event, User, Scanner, Transaction, Payout, VerificationApplication, SecurityAlert, Activity, TicketTier, VenueSection } from '@/types/admin';

import Sidebar from '@/components/admin/layout/Sidebar';
import Header from '@/components/admin/layout/Header';
import MobileAdminBottomNav from '@/components/admin/layout/MobileAdminBottomNav';
import DashboardView from '@/components/admin/dashboard/DashboardView';
import AnalyticsView from '@/components/admin/analytics/AnalyticsView';
import EventManagementView from '@/components/admin/events/EventManagementView';
import EventWorkspaceView from '@/components/admin/workspace/EventWorkspaceView';
import UserManagementView from '@/components/admin/users/UserManagementView';
import FinanceView from '@/components/admin/finance/FinanceView';
import SettingsView from '@/components/admin/finance/SettingsView';

export default function AdminPage() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'analytics' | 'events' | 'users' | 'finance' | 'settings' | 'workspace'>('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [scanners, setScanners] = useState<Scanner[]>(initialScanners);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [payouts, setPayouts] = useState<Payout[]>(initialPayouts);
  const [verifications, setVerifications] = useState<VerificationApplication[]>(initialVerificationApplications);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>(initialSecurityAlerts);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);

  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>(initialTicketTiers);
  const [venueSections, setVenueSections] = useState<VenueSection[]>(initialVenueSections);

  const handleApproveVerification = (appId: string) => {
    const targetApp = verifications.find(v => v.id === appId);
    if (!targetApp) return;

    setVerifications(prev => prev.map(v => v.id === appId ? { ...v, status: 'Approved' } : v));
    setUsers(prev => prev.map(u => u.name === targetApp.name ? { ...u, status: 'Verified' } : u));

    const newActivity: Activity = {
      id: `ACT-${Math.floor(900 + Math.random() * 99)}`,
      userName: 'Richie M.',
      action: 'Verified Organization',
      detail: `Approved ${targetApp.name} live operations verification.`,
      timestamp: 'Just now'
    };
    setActivities(prev => [newActivity, ...prev]);
    alert(`Verification approved for ${targetApp.name}.`);
  };

  const handleRejectVerification = (appId: string) => {
    const targetApp = verifications.find(v => v.id === appId);
    if (!targetApp) return;

    setVerifications(prev => prev.map(v => v.id === appId ? { ...v, status: 'Rejected' } : v));

    const newActivity: Activity = {
      id: `ACT-${Math.floor(900 + Math.random() * 99)}`,
      userName: 'Richie M.',
      action: 'Verification Rejected',
      detail: `Rejected ${targetApp.name} credentials. Requested resubmission.`,
      timestamp: 'Just now'
    };
    setActivities(prev => [newActivity, ...prev]);
    alert(`Rejected credentials application for: ${targetApp.name}. Files flagged for resubmission.`);
  };

  const handleToggleUserStatus = (userId: string, newStatus: 'Verified' | 'Suspended') => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));

    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const newActivity: Activity = {
      id: `ACT-${Math.floor(900 + Math.random() * 99)}`,
      userName: 'Richie M.',
      action: newStatus === 'Suspended' ? 'Issued Suspension' : 'Verified User',
      detail: `${newStatus === 'Suspended' ? 'Restricted' : 'Restored'} account access for ${targetUser.name}.`,
      timestamp: 'Just now'
    };
    setActivities(prev => [newActivity, ...prev]);
    alert(`User status for ${targetUser.name} changed to ${newStatus}.`);
  };

  const handleProcessPayout = (payoutId: string) => {
    const targetPayout = payouts.find(p => p.id === payoutId);
    if (!targetPayout) return;

    setPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, status: 'Processed' } : p));
    setEvents(prev => prev.map(e => e.name === targetPayout.eventName ? {
      ...e,
      totalRevenue: Math.max(0, e.totalRevenue - targetPayout.amount)
    } : e));

    const newActivity: Activity = {
      id: `ACT-${Math.floor(900 + Math.random() * 99)}`,
      userName: 'Finance System',
      action: 'Settled Payout',
      detail: `Disbursed payout balance of $${targetPayout.amount.toLocaleString()} to ${targetPayout.organizerName}.`,
      timestamp: 'Just now'
    };
    setActivities(prev => [newActivity, ...prev]);
    alert(`Payout wire dispatched successfully to: ${targetPayout.organizerName}.`);
  };

  const handleRejectPayout = (payoutId: string) => {
    setPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, status: 'Failed' } : p));
    alert('Wire payout flagged and locked in escrow pending audit review.');
  };

  const handleUpdateTransactionStatus = (txId: string, newStatus: 'Success' | 'Refunded') => {
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: newStatus } : t));

    const targetTx = transactions.find(t => t.id === txId);
    if (!targetTx) return;

    if (newStatus === 'Refunded') {
      setEvents(prev => prev.map(e => e.name === targetTx.eventName ? {
        ...e,
        ticketsSold: Math.max(0, e.ticketsSold - 1),
        totalRevenue: Math.max(0, e.totalRevenue - targetTx.amount)
      } : e));
    }

    const newActivity: Activity = {
      id: `ACT-${Math.floor(900 + Math.random() * 99)}`,
      userName: 'Refund Desk',
      action: newStatus === 'Refunded' ? 'Issued Refund' : 'Re-instated Success',
      detail: `Refund process ${newStatus === 'Refunded' ? 'completed' : 'rejected'} for transaction: ${txId}.`,
      timestamp: 'Just now'
    };
    setActivities(prev => [newActivity, ...prev]);
    alert(`Transaction status for ${txId} has been resolved: ${newStatus.toUpperCase()}.`);
  };

  const handleAddEvent = (newEvent: Event) => {
    setEvents(prev => [newEvent, ...prev]);

    const newActivity: Activity = {
      id: `ACT-${Math.floor(900 + Math.random() * 99)}`,
      userName: 'Richie M.',
      action: 'Created Event',
      detail: `Initiated active ticket contract for: ${newEvent.name}.`,
      timestamp: 'Just now'
    };
    setActivities(prev => [newActivity, ...prev]);
    alert(`Event "${newEvent.name}" has been added.`);
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
            <EventManagementView 
              events={events}
              onAddEvent={handleAddEvent}
              onSelectEvent={(id) => {
                setSelectedEventId(id);
                setCurrentView('workspace');
              }}
            />
          )}

          {currentView === 'workspace' && selectedEvent && (
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
              onUpdateTiers={setTicketTiers}
              onUpdateScanners={setScanners}
            />
          )}

          {currentView === 'users' && (
            <UserManagementView 
              users={users}
              verifications={verifications}
              onApproveVerification={handleApproveVerification}
              onRejectVerification={handleRejectVerification}
              onToggleUserStatus={handleToggleUserStatus}
            />
          )}

          {currentView === 'finance' && (
            <FinanceView 
              transactions={transactions}
              payouts={payouts}
              onProcessPayout={handleProcessPayout}
              onRejectPayout={handleRejectPayout}
              onUpdateTransactionStatus={handleUpdateTransactionStatus}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>
    </div>
  );
}
