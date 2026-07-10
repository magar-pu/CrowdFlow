import React from 'react';
import { AppView } from '../types';
import { LayoutDashboard, Calendar, Receipt, Users, DollarSign, BarChart3, Settings, Plus, Workflow, X } from 'lucide-react';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: AppView;
  setView: (view: AppView) => void;
  onCreateEventClick?: () => void;
}

const NAV_ITEMS = [
  { view: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { view: 'events' as const, label: 'Events', icon: Calendar },
  { view: 'orders' as const, label: 'Orders', icon: Receipt },
  { view: 'attendees' as const, label: 'Attendees', icon: Users },
  { view: 'finance' as const, label: 'Finance', icon: DollarSign },
  { view: 'reports' as const, label: 'Reports', icon: BarChart3 },
  { view: 'settings' as const, label: 'Settings', icon: Settings },
];

export default function MobileNavDrawer({ isOpen, onClose, currentView, setView, onCreateEventClick }: MobileNavDrawerProps) {
  const isWorkspace = currentView === 'workspace';

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
              <Workflow className="h-5 w-5 text-on-primary" />
            </div>
            <div className="text-left">
              <span className="text-lg font-bold tracking-normal text-text-primary">CrowdFlow</span>
              <div className="text-xs font-medium text-text-secondary">Organizer Portal</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary cursor-pointer" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.view || (item.view === 'events' && isWorkspace);
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                onClick={() => { setView(item.view); onClose(); }}
                className={`w-full flex items-center gap-3 rounded-lg font-sans text-sm font-medium justify-start py-2.5 px-4 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'text-text-secondary hover:bg-surface-container-low hover:text-text-primary'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border-subtle p-4">
          <button
            onClick={() => { onClose(); (onCreateEventClick ?? (() => setView('create-event')))(); }}
            className="w-full bg-primary hover:bg-primary-container text-on-primary py-2.5 px-4 rounded-lg font-sans text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        </div>
      </aside>
    </>
  );
}
