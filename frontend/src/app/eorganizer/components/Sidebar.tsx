import React from 'react';
import { AppView } from '../types';
import {
  LayoutDashboard,
  Calendar,
  Receipt,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  Plus,
  Workflow,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onCreateEventClick?: () => void;
}

export default function Sidebar({
  currentView,
  setView,
  isCollapsed,
  setIsCollapsed,
  onCreateEventClick,
}: SidebarProps) {
  const isWorkspace = currentView === 'workspace';

  const suiteItems = [
    { view: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { view: 'events' as const, label: 'Events', icon: Calendar },
    { view: 'orders' as const, label: 'Orders', icon: Receipt },
    { view: 'attendees' as const, label: 'Attendees', icon: Users },
    { view: 'finance' as const, label: 'Finance', icon: DollarSign },
    { view: 'reports' as const, label: 'Reports', icon: BarChart3 },
    { view: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      id="sidebar"
      className={`fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-border-subtle bg-surface-white text-text-primary transition-all duration-300 md:flex ${
        isCollapsed ? 'w-[88px]' : 'w-[280px]'
      }`}
    >
      <div className={`flex h-[72px] items-center border-b border-border-subtle ${isCollapsed ? 'justify-center px-4' : 'justify-between px-6'}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-sm shrink-0">
            <Workflow className="h-5 w-5 text-on-primary" />
          </div>
          {!isCollapsed && (
            <div className="text-left">
              <span className="text-lg font-bold tracking-normal text-text-primary">CrowdFlow</span>
              <div className="text-xs font-medium text-text-secondary">Organizer Portal</div>
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
        {suiteItems.map((item) => {
          const isActive = currentView === item.view || (item.view === 'events' && isWorkspace);
          const IconComponent = item.icon;
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`w-full flex items-center rounded-lg font-sans text-sm font-medium transition-all duration-200 cursor-pointer ${
                isCollapsed ? 'justify-center py-2.5 px-0' : 'justify-start py-2.5 px-4 gap-3 text-left'
              } ${
                isActive
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'text-text-secondary hover:bg-surface-container-low hover:text-text-primary'
              }`}
            >
              <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-on-primary' : 'text-text-secondary'}`} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className={`border-t border-border-subtle p-4 ${isCollapsed ? 'flex justify-center' : ''}`}>
        {isCollapsed ? (
          <button
            onClick={() => setView('create-event')}
            className="w-10 h-10 bg-primary hover:bg-primary-container text-on-primary rounded-lg flex items-center justify-center transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onCreateEventClick || (() => setView('create-event'))}
            className="w-full bg-primary hover:bg-primary-container text-on-primary py-2.5 px-4 rounded-lg font-sans text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        )}
      </div>
    </aside>
  );
}
