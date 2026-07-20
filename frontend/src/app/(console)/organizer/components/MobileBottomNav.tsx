import React from 'react';
import { AppView } from '../types';
import { LayoutDashboard, BarChart3, Calendar, Users, DollarSign, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MobileBottomNavProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

const ITEMS: { view: AppView; label: string; icon: LucideIcon }[] = [
  { view: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { view: 'reports', label: 'Reports', icon: BarChart3 },
  { view: 'events', label: 'Events', icon: Calendar },
  { view: 'attendees', label: 'Attendees', icon: Users },
  { view: 'finance', label: 'Finance', icon: DollarSign },
  { view: 'settings', label: 'Settings', icon: Settings },
];

export default function MobileBottomNav({ currentView, setView }: MobileBottomNavProps) {
  const isWorkspace = currentView === 'workspace';

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface-white/95 px-1 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 shadow-overlay backdrop-blur-md md:hidden"
      aria-label="Organizer mobile navigation"
    >
      <div className="grid grid-cols-6 gap-0.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.view || (item.view === 'events' && isWorkspace);
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => setView(item.view)}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-lg px-1 text-[9px] font-semibold transition-colors cursor-pointer ${
                isActive
                  ? 'text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
