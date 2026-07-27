import React from 'react';
import { EventItem } from '../types';
import { Calendar, Plus, CalendarDays, MapPin, ArrowRight, Undo2, Archive } from 'lucide-react';
import { formatIDR } from "@/lib/pricing";

interface EventsViewProps {
  events: EventItem[];
  /** Which list is on screen. Archived events never mix into the active view. */
  view: 'active' | 'archived';
  onViewChange: (next: 'active' | 'archived') => void;
  isLoadingArchived?: boolean;
  onRestoreEvent: (eventId: string) => void;
  onCreateEvent: () => void;
  onOpenWorkspace: (eventId: string) => void;
}

export default function EventsView({
  events,
  view,
  onViewChange,
  isLoadingArchived = false,
  onRestoreEvent,
  onCreateEvent,
  onOpenWorkspace,
}: EventsViewProps) {
  const isArchived = view === 'archived';
  return (
    <div className="space-y-8 pb-12 text-left animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold text-text-primary tracking-tight">Events Suite</h1>
          <p className="font-sans text-sm text-text-secondary font-normal mt-1">
            Manage and monitor all active deployments and historical archives.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white border border-border-subtle rounded-lg p-0.5 flex items-center shadow-sm">
            {(['active', 'archived'] as const).map((v) => (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                className={`px-3 py-1 rounded-md font-sans font-semibold text-xs transition-colors cursor-pointer ${
                  view === v
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-container-low'
                }`}
              >
                {v === 'active' ? 'Active' : 'Archived'}
              </button>
            ))}
          </div>
          <span className="bg-white border border-border-subtle rounded-lg px-3 py-1.5 flex items-center gap-2 text-text-primary font-sans font-semibold text-xs shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
            This Year
          </span>
          <button
            onClick={onCreateEvent}
            className="bg-primary text-on-primary hover:bg-primary/90 rounded-lg px-4 py-2 flex items-center gap-2 font-sans font-semibold text-xs shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            Create Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {events.map((event) => {
          const capPercent = event.capacity > 0 ? Math.round((event.sold / event.capacity) * 100) : 0;
          return (
            <div
              key={event.id}
              className="bg-white border border-border-subtle rounded-xl flex flex-col overflow-hidden soft-shadow group transition-all duration-300 hover:shadow-lg hover:border-outline"
            >
              <div
                className="h-44 w-full bg-cover bg-center relative bg-surface-container-low"
                style={event.image ? { backgroundImage: `url('${event.image}')` } : undefined}
              >
                <div className="absolute top-4 right-4">
                  <span className={`backdrop-blur-sm border px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm font-mono text-[9px] font-bold ${
                    event.status === 'Live' ? 'bg-success/90 text-white border-success' :
                    // Approved but not published — deliberately not green-filled,
                    // so it reads as "cleared" rather than "on sale".
                    event.status === 'Approved' ? 'bg-white/90 text-success border-success' :
                    event.status === 'Need Revision' ? 'bg-amber-500 text-white border-amber-600' :
                    event.status === 'Rejected' ? 'bg-rose-600 text-white border-rose-700' :
                    event.status === 'In Review' ? 'bg-blue-600 text-white border-blue-700' :
                    'bg-white/90 text-text-primary border-border-subtle'
                  }`}>
                    {event.status === 'Live' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    )}
                    {event.status}
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-sans text-base font-bold text-text-primary mb-1 truncate group-hover:text-secondary transition-colors">
                  {event.name}
                </h3>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 mt-1">
                  <div className="flex items-center gap-1.5 text-text-secondary font-mono text-[10px]">
                    <CalendarDays className="w-3.5 h-3.5 text-secondary" />
                    {event.date}
                  </div>
                  <div className="flex items-center gap-1.5 text-text-secondary font-mono text-[10px] truncate max-w-[150px]">
                    <MapPin className="w-3.5 h-3.5 text-secondary" />
                    {event.location || event.locationAddress || 'No venue set'}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 bg-surface-container-low p-3 rounded-lg border border-border-subtle">
                  <div>
                    <div className="font-mono text-[9px] text-on-surface-variant mb-0.5">Revenue</div>
                    <div className="font-sans text-xs font-bold text-text-primary">
                      {typeof event.revenue === 'number' ? formatIDR(event.revenue) : event.revenue}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] text-on-surface-variant mb-0.5">Sold</div>
                    <div className="font-sans text-xs font-bold text-text-primary">
                      {event.sold.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] text-on-surface-variant mb-0.5">Ratio</div>
                    <div className="font-sans text-xs font-bold text-secondary">
                      {event.status === 'Draft' ? '0%' : `${capPercent}%`}
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-border-subtle flex justify-between items-center gap-2">
                  {isArchived ? (
                    <button
                      onClick={() => onRestoreEvent(event.id)}
                      className="text-text-primary hover:text-primary font-sans text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      Restore
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={() => onOpenWorkspace(event.id)}
                    className="text-secondary hover:text-secondary/80 font-sans text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all cursor-pointer"
                  >
                    Open Workspace
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {isArchived && isLoadingArchived && (
          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[420px] animate-pulse rounded-xl border border-border-subtle bg-surface-container-low" />
            ))}
          </div>
        )}

        {isArchived && !isLoadingArchived && events.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-text-secondary border border-dashed border-border-subtle rounded-xl bg-white soft-shadow max-w-lg mx-auto w-full flex flex-col items-center justify-center">
            <Archive className="w-8 h-8 text-on-surface-variant mb-3" />
            <div className="font-bold text-text-primary mb-1 text-sm">Nothing Archived</div>
            <p className="text-xs text-on-surface-variant max-w-xs">
              Archiving a draft or rejected event moves it here, out of your active list, without deleting anything.
            </p>
          </div>
        )}

        {!isArchived && events.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-text-secondary border border-dashed border-border-subtle rounded-xl bg-white soft-shadow max-w-lg mx-auto w-full flex flex-col items-center justify-center">
            <CalendarDays className="w-8 h-8 text-on-surface-variant mb-3 animate-pulse" />
            <div className="font-bold text-text-primary mb-1 text-sm">No Deployments Registered</div>
            <p className="text-xs text-on-surface-variant max-w-xs mb-4">
              You haven&apos;t created any events yet. Deploy your first ticketed event to begin sales operations.
            </p>
            <button
              onClick={onCreateEvent}
              className="bg-primary text-on-primary hover:bg-primary/90 rounded-lg px-4 py-2 font-sans font-semibold text-xs shadow-md transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              Create First Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
