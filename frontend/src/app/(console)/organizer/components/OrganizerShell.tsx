"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppView } from "../types";
import { OrganizerDataProvider, useOrganizerData } from "../OrganizerDataContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileNavDrawer from "./MobileNavDrawer";
import MobileBottomNav from "./MobileBottomNav";

function parseSegments(pathname: string): string[] {
  return pathname.replace(/^\/organizer\/?/, '').split('/').filter(Boolean);
}

function sidebarViewFromSegments(segments: string[]): AppView {
  const [section, sub] = segments;
  if (!section) return 'dashboard';
  if (section === 'events') {
    if (!sub) return 'events';
    if (sub === 'create') return 'create-event';
    return 'workspace';
  }
  if (section === 'orders' || section === 'attendees' || section === 'finance' || section === 'reports' || section === 'settings') {
    return section as AppView;
  }
  return 'dashboard';
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { adminName, adminRole, toast, handleResetData, handleTriggerLiveScan, events, logs } = useOrganizerData();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const segments = parseSegments(pathname);
  const currentView = sidebarViewFromSegments(segments);
  const isWorkspace = currentView === 'workspace';
  const workspaceEvent = isWorkspace ? events.find(e => e.id === segments[1]) : undefined;
  const workspaceTab = isWorkspace ? (segments[2] ?? 'overview') : undefined;
  const currentTabName = isWorkspace ? (workspaceTab as string) : currentView;

  const setView = (view: AppView) => {
    setIsMobileMenuOpen(false);
    const map: Partial<Record<AppView, string>> = {
      dashboard: '/organizer',
      events: '/organizer/events',
      orders: '/organizer/orders',
      attendees: '/organizer/attendees',
      finance: '/organizer/finance',
      reports: '/organizer/reports',
      settings: '/organizer/settings',
      'create-event': '/organizer/events/create',
    };
    router.push(map[view] ?? '/organizer');
  };

  return (
    <div id="crowdflow-app" className="min-h-screen bg-surface text-text-primary flex font-sans select-none antialiased w-full">
      <Sidebar
        currentView={currentView}
        setView={setView}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onCreateEventClick={() => setView('create-event')}
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
          currentTabName={currentTabName}
          selectedEventName={workspaceEvent?.name}
          onResetData={handleResetData}
          onTriggerLiveScan={isWorkspace ? handleTriggerLiveScan : undefined}
          recentLogs={isWorkspace ? logs : undefined}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
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
          {children}
        </main>
      </div>
    </div>
  );
}

export default function OrganizerShell({ children }: { children: React.ReactNode }) {
  return (
    <OrganizerDataProvider>
      <ShellInner>{children}</ShellInner>
    </OrganizerDataProvider>
  );
}
