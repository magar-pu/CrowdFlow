"use client";

import React from 'react';
import { ShieldAlert, CalendarDays } from 'lucide-react';
import { SecurityAlert } from '@/types/admin';

interface DashboardAlertsAndCalendarProps {
  alerts: SecurityAlert[];
}

export default function DashboardAlertsAndCalendar({ alerts }: DashboardAlertsAndCalendarProps) {
  // Calendar events (Operations Calendar)
  const calendarDates = [
    { day: 28, event: 'Tennis tickets open', active: true, color: 'bg-secondary' },
    { day: 1, event: 'Organizer payout due', active: true, color: 'bg-warning' },
    { day: 15, event: 'Neon Nights Festival', active: true, color: 'bg-tertiary' },
    { day: 22, event: 'Tech Summit', active: true, color: 'bg-success' },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Security Alerts */}
      <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm lg:col-span-2">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-text-primary">
              <ShieldAlert className="h-4.5 w-4.5 text-danger" />
              <span>Security Alerts</span>
            </h2>
            <p className="text-xs text-text-secondary">Priority flags that need admin review.</p>
          </div>
          <span className="rounded-full border border-danger/20 bg-danger/5 px-2 py-0.5 text-[10px] font-semibold text-danger">
            Active Review
          </span>
        </div>

        <div className="mt-4 space-y-3.5 max-h-[240px] overflow-y-auto pr-1">
          {alerts.length === 0 ? (
            <div className="py-10 text-center text-xs text-text-secondary">No active priority alerts.</div>
          ) : (
            alerts.slice(0, 3).map((alert) => (
              <div 
                key={alert.id} 
                className={`relative rounded-lg border p-3.5 ${
                  alert.severity === 'high' 
                    ? 'border-danger/20 bg-danger/5' 
                    : 'border-warning/20 bg-warning/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${alert.severity === 'high' ? 'bg-danger' : 'bg-warning'}`} />
                  <h4 className="text-xs font-bold text-text-primary">{alert.title}</h4>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{alert.description}</p>
                <div className="mt-2.5 flex items-center justify-between border-t border-border-subtle pt-2 text-[10px] text-text-secondary">
                  <span>{alert.type}</span>
                  <span>{alert.timestamp}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Operations Calendar & Upcoming Deadlines */}
      <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-text-primary">
            <CalendarDays className="h-4.5 w-4.5 text-secondary" />
            <span>Operations Calendar</span>
          </h2>
          <span className="text-[10px] text-text-secondary">July 2026</span>
        </div>

        <div className="mt-4">
          {/* Grid calendar view representation */}
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase text-text-secondary">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-secondary">
            {/* Offset padding for July 1st starting on Wednesday */}
            <span className="p-1 text-outline">28</span>
            <span className="p-1 text-outline">29</span>
            <span className="p-1 text-outline">30</span>
            
            {Array.from({ length: 31 }).map((_, i) => {
              const day = i + 1;
              const match = calendarDates.find(d => d.day === day);
              return (
                <div 
                  key={day} 
                  className={`p-1 rounded flex flex-col items-center justify-center border relative transition-all duration-205 cursor-pointer ${
                    match 
                      ? 'border-secondary/20 bg-secondary/5 font-bold text-secondary shadow-sm' 
                      : 'border-transparent hover:border-border-subtle hover:text-text-primary'
                  }`}
                  title={match?.event}
                >
                  <span>{day}</span>
                  {match && (
                    <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${match.color}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Deadline Reminders */}
          <div className="mt-4 space-y-2 border-t border-border-subtle pt-4">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-text-secondary">Upcoming Schedules</span>
            {calendarDates.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-text-primary">
                <span className={`h-1.5 w-1.5 rounded-full ${item.color}`} />
                <span className="text-text-secondary">July {item.day}:</span>
                <span className="truncate">{item.event}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
