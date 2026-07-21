"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminDataProvider, useAdminData } from "@/app/(console)/admin/AdminDataContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileAdminBottomNav from "./MobileAdminBottomNav";

type AdminView =
  | "dashboard"
  | "analytics"
  | "events"
  | "users"
  | "finance"
  | "settings"
  | "workspace"
  | "create-event";

function parseSegments(pathname: string): string[] {
  return pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean);
}

// The sidebar/mobile nav highlight a top-level section; sub-routes of Events
// (create, workspace) resolve to their own view so the shell can still render
// the right Events highlight (both nav components treat 'workspace' as Events).
function viewFromSegments(segments: string[]): AdminView {
  const [section, sub] = segments;
  if (!section) return 'dashboard';
  if (section === 'events') {
    if (!sub) return 'events';
    if (sub === 'create') return 'create-event';
    return 'workspace';
  }
  if (section === 'analytics' || section === 'users' || section === 'finance' || section === 'settings') {
    return section as AdminView;
  }
  return 'dashboard';
}

const ROUTE_MAP: Record<AdminView, string> = {
  dashboard: '/admin',
  analytics: '/admin/analytics',
  events: '/admin/events',
  users: '/admin/users',
  finance: '/admin/finance',
  settings: '/admin/settings',
  'create-event': '/admin/events/create',
  workspace: '/admin/events',
};

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { pendingVerificationsCount, securityAlerts, clearAlert } = useAdminData();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const currentView = viewFromSegments(parseSegments(pathname));

  const setView = (view: AdminView) => {
    router.push(ROUTE_MAP[view] ?? '/admin');
  };

  return (
    <div id="crowdflow-admin-root" className="flex min-h-screen w-full bg-surface font-sans text-text-primary">
      {/* 1. Global Left Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={setView}
        pendingVerificationsCount={pendingVerificationsCount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
      />
      <MobileAdminBottomNav
        currentView={currentView}
        pendingVerificationsCount={pendingVerificationsCount}
        onViewChange={setView}
      />

      {/* 2. Main Right Operations Container */}
      <div
        className={`flex min-h-screen w-full flex-1 flex-col bg-surface transition-[padding] duration-300 ${
          isSidebarCollapsed ? "md:pl-[88px]" : "md:pl-[280px]"
        }`}
      >
        {/* Global Header Search & Alerts popover */}
        <Header alerts={securityAlerts} onClearAlert={clearAlert} />

        {/* Core dynamic content main frame */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 overflow-y-auto px-4 pb-28 pt-5 sm:px-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminDataProvider>
      <ShellInner>{children}</ShellInner>
    </AdminDataProvider>
  );
}
