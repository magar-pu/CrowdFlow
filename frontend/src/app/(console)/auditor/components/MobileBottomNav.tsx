import React from 'react';
import { AuditorView } from '../types';
import { LayoutDashboard, ClipboardCheck, Users2, DollarSign } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MobileBottomNavProps {
  currentView: AuditorView;
  setView: (view: AuditorView) => void;
  pendingReviewsCount: number;
  pendingOrganizersCount?: number;
}

const ITEMS: { view: AuditorView; label: string; icon: LucideIcon }[] = [
  { view: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { view: 'reviews', label: 'Reviews', icon: ClipboardCheck },
  { view: 'organizers', label: 'Organizers', icon: Users2 },
  { view: 'payouts', label: 'Payouts', icon: DollarSign },
];

export default function MobileBottomNav({ currentView, setView, pendingReviewsCount, pendingOrganizersCount }: MobileBottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface-white/95 px-1 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 shadow-overlay backdrop-blur-md md:hidden"
      aria-label="Auditor mobile navigation"
    >
      <div className="grid grid-cols-4 gap-0.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.view;
          const badge = item.view === 'reviews' && pendingReviewsCount > 0 ? pendingReviewsCount 
            : item.view === 'organizers' && pendingOrganizersCount && pendingOrganizersCount > 0 ? pendingOrganizersCount 
            : undefined;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => setView(item.view)}
              className={`relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-lg px-1 text-[9px] font-semibold transition-colors cursor-pointer ${
                isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate leading-none">{item.label}</span>
              {badge !== undefined && (
                <span className="absolute right-3 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-on-error">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
