"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuditorView } from "../types";
import { AuditorDataProvider, useAuditorData } from "../AuditorDataContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileNavDrawer from "./MobileNavDrawer";
import MobileBottomNav from "./MobileBottomNav";

const SECTION_TITLES: Record<AuditorView, string> = {
  dashboard: 'Dashboard',
  reviews: 'Reviews',
  documents: 'Notifications',
  settings: 'Settings',
  'view-document': 'Document Verification',
  'view-review': 'Event Submission Audit',
  organizers: 'Organizer Verification',
  payouts: 'Payout Verification',
  'view-organizer': 'Organizer Audit',
  'view-payout': 'Payout Audit',
  'bank-verifications': 'Bank Verification',
  events: 'Master Event List',
};

const DETAIL_TITLES: Partial<Record<AuditorView, string>> = {
  reviews: 'Event Submission Audit',
  documents: 'Notification Center',
  organizers: 'Organizer Audit',
  payouts: 'Payout Audit',
};

function sectionFromPathname(pathname: string): AuditorView {
  const segment = pathname.replace(/^\/auditor\/?/, '').split('/')[0];
  if (segment === 'reviews' || segment === 'documents' || segment === 'organizers' || segment === 'payouts' || segment === 'settings' || segment === 'events' || segment === 'bank-verifications') {
    return segment as AuditorView;
  }
  return 'dashboard';
}

function hasDetailSegment(pathname: string): boolean {
  const parts = pathname.replace(/^\/auditor\/?/, '').split('/').filter(Boolean);
  return parts.length > 1;
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { pendingReviewsCount, pendingDocumentsCount, pendingOrganizersCount } = useAuditorData();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentView = sectionFromPathname(pathname);
  const title = hasDetailSegment(pathname) ? (DETAIL_TITLES[currentView] ?? SECTION_TITLES[currentView]) : SECTION_TITLES[currentView];

  const setView = (view: AuditorView) => {
    setIsMobileMenuOpen(false);
    router.push(view === 'dashboard' ? '/auditor' : `/auditor/${view}`);
  };

  return (
    <div id="crowdflow-auditor" className="min-h-screen bg-surface text-text-primary flex font-sans select-none antialiased w-full">
      <Sidebar
        currentView={currentView}
        setView={setView}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        pendingReviewsCount={pendingReviewsCount}
        pendingDocumentsCount={pendingDocumentsCount}
        pendingOrganizersCount={pendingOrganizersCount}
      />

      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentView={currentView}
        setView={setView}
        pendingReviewsCount={pendingReviewsCount}
        pendingDocumentsCount={pendingDocumentsCount}
        pendingOrganizersCount={pendingOrganizersCount}
      />

      <MobileBottomNav
        currentView={currentView}
        setView={setView}
        pendingReviewsCount={pendingReviewsCount}
        pendingOrganizersCount={pendingOrganizersCount}
      />

      <div
        className={`flex min-h-screen w-full flex-1 flex-col bg-surface transition-[padding] duration-300 ${
          isSidebarCollapsed ? 'lg:pl-[88px]' : 'lg:pl-[280px]'
        }`}
      >
        <Header
          title={title}
          subtitle="CROWDFLOW AUDITOR"
          onOpenMenu={() => setIsMobileMenuOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1440px] flex-1 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 md:p-8 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AuditorShell({ children }: { children: React.ReactNode }) {
  return (
    <AuditorDataProvider>
      <ShellInner>{children}</ShellInner>
    </AuditorDataProvider>
  );
}
