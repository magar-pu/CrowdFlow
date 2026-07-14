import React from 'react';
import { AuditorView } from '../types';
import { LayoutDashboard, ClipboardCheck, FileCheck2, Settings, ShieldCheck, X, Users2, DollarSign } from 'lucide-react';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: AuditorView;
  setView: (view: AuditorView) => void;
  pendingReviewsCount: number;
  pendingDocumentsCount: number;
  pendingOrganizersCount?: number;
}

const NAV_ITEMS = [
  { view: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { view: 'reviews' as const, label: 'Reviews', icon: ClipboardCheck },
  { view: 'documents' as const, label: 'Documents', icon: FileCheck2 },
  { view: 'organizers' as const, label: 'Organizers', icon: Users2 },
  { view: 'payouts' as const, label: 'Payouts', icon: DollarSign },
  { view: 'settings' as const, label: 'Settings', icon: Settings },
];

export default function MobileNavDrawer({ isOpen, onClose, currentView, setView, pendingReviewsCount, pendingDocumentsCount, pendingOrganizersCount }: MobileNavDrawerProps) {
  const badgeFor = (view: AuditorView) => {
    if (view === 'reviews') return pendingReviewsCount > 0 ? pendingReviewsCount : undefined;
    if (view === 'documents') return pendingDocumentsCount > 0 ? pendingDocumentsCount : undefined;
    if (view === 'organizers') return pendingOrganizersCount && pendingOrganizersCount > 0 ? pendingOrganizersCount : undefined;
    return undefined;
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-surface-white border-r border-border-subtle shadow-2xl transition-transform duration-300 lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-border-subtle px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-sm shrink-0">
              <ShieldCheck className="h-5 w-5 text-on-primary" />
            </div>
            <div className="text-left">
              <span className="text-lg font-bold tracking-normal text-text-primary">CrowdFlow</span>
              <div className="text-xs font-medium text-text-secondary">Auditor Console</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary cursor-pointer" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.view;
            const Icon = item.icon;
            const badge = badgeFor(item.view);
            return (
              <button
                key={item.view}
                onClick={() => { setView(item.view); onClose(); }}
                className={`w-full flex items-center justify-between rounded-lg font-sans text-sm font-medium py-2.5 px-4 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'text-text-secondary hover:bg-surface-container-low hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {badge !== undefined && (
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
    </>
  );
}
