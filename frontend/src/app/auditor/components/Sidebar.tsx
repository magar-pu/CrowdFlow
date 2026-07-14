import React from 'react';
import { AuditorView } from '../types';
import { LayoutDashboard, ClipboardCheck, FileCheck2, Settings, ShieldCheck, ChevronLeft, ChevronRight, Users2, DollarSign } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface SidebarProps {
  currentView: AuditorView;
  setView: (view: AuditorView) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  pendingReviewsCount: number;
  pendingDocumentsCount: number;
  pendingOrganizersCount?: number;
}

const NAV_ITEMS: { view: AuditorView; label: string; icon: LucideIcon }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'reviews', label: 'Reviews', icon: ClipboardCheck },
  { view: 'documents', label: 'Documents', icon: FileCheck2 },
  { view: 'organizers', label: 'Organizers', icon: Users2 },
  { view: 'payouts', label: 'Payouts', icon: DollarSign },
  { view: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({
  currentView,
  setView,
  isCollapsed,
  setIsCollapsed,
  pendingReviewsCount,
  pendingDocumentsCount,
  pendingOrganizersCount,
}: SidebarProps) {
  const badgeFor = (view: AuditorView) => {
    if (view === 'reviews') return pendingReviewsCount > 0 ? pendingReviewsCount : undefined;
    if (view === 'documents') return pendingDocumentsCount > 0 ? pendingDocumentsCount : undefined;
    if (view === 'organizers') return pendingOrganizersCount && pendingOrganizersCount > 0 ? pendingOrganizersCount : undefined;
    return undefined;
  };

  return (
    <aside
      id="sidebar"
      className={`fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-border-subtle bg-surface-white text-text-primary transition-all duration-300 lg:flex ${
        isCollapsed ? 'w-[88px]' : 'w-[280px]'
      }`}
    >
      <div className={`flex h-[72px] items-center border-b border-border-subtle ${isCollapsed ? 'justify-center px-4' : 'justify-between px-6'}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-sm shrink-0">
            <ShieldCheck className="h-5 w-5 text-on-primary" />
          </div>
          {!isCollapsed && (
            <div className="text-left">
              <span className="text-lg font-bold tracking-normal text-text-primary">CrowdFlow</span>
              <div className="text-xs font-medium text-text-secondary">Auditor Console</div>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary cursor-pointer"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mx-auto mt-4 rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary cursor-pointer"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <nav className={`flex-1 space-y-1.5 py-6 overflow-y-auto ${isCollapsed ? 'px-3' : 'px-4'}`}>
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.view;
          const Icon = item.icon;
          const badge = badgeFor(item.view);
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`w-full flex items-center rounded-lg font-sans text-sm font-medium transition-all duration-200 cursor-pointer ${
                isCollapsed ? 'justify-center px-0 py-3' : 'justify-between px-4 py-3'
              } ${
                isActive
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'text-text-secondary hover:bg-surface-container-low hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-on-primary' : 'text-text-secondary'}`} />
                {!isCollapsed && <span>{item.label}</span>}
              </div>
              {badge !== undefined && !isCollapsed && (
                <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  isActive ? 'bg-white text-primary' : 'border border-danger/20 bg-danger/5 text-danger'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
