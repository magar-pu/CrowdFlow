import React from 'react';
import { EventItem } from '../types';
import { ArrowLeft, CalendarDays, MapPin, LayoutDashboard, Ticket, Map, Radio, TrendingUp, Settings2, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EventWorkspaceHeaderProps {
  event: EventItem;
  workspaceTab: string;
  setWorkspaceTab: (tab: string) => void;
  onBack: () => void;
}

const TABS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'revisions', label: 'Revisions', icon: AlertTriangle },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'venue', label: 'Venue', icon: Map },
  { id: 'scanner', label: 'Scanner', icon: Radio },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

export default function EventWorkspaceHeader({ event, workspaceTab, setWorkspaceTab, onBack }: EventWorkspaceHeaderProps) {
  const statusStyle =
    event.status === 'Live' ? 'bg-success/10 text-success border-success/20' :
    event.status === 'Need Revision' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30' :
    event.status === 'Rejected' ? 'bg-rose-500/10 text-rose-700 border-rose-500/30' :
    event.status === 'In Review' ? 'bg-blue-500/10 text-blue-700 border-blue-500/30' :
    event.status === 'Scheduled' ? 'bg-secondary/10 text-secondary border-secondary/20' :
    'bg-surface-container text-on-surface-variant border-border-subtle';

  return (
    <div className="bg-white border border-border-subtle rounded-xl soft-shadow overflow-hidden">
      <div className="p-5 space-y-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[10px] font-bold text-secondary hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Events
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-bold text-text-primary">{event.name}</h1>
          <span className={`px-2 py-0.5 rounded-full border font-mono text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 ${statusStyle}`}>
            {event.status === 'Live' && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>}
            {event.status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 shrink-0" /> {event.date}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {/* Drafts start with no venue — it's set in the Venue tab. */}
            {event.location || <span className="italic text-on-surface-variant">No venue set</span>}
          </span>
        </div>
      </div>

      <nav className="flex items-center gap-1 px-3 border-t border-border-subtle overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = workspaceTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setWorkspaceTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
