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
    { day: 28, event: 'Tennis Tickets open', active: true, color: 'bg-indigo-600' },
    { day: 1, event: 'Elena Payout due', active: true, color: 'bg-amber-500' },
    { day: 15, event: 'Neon Nights Festival', active: true, color: 'bg-pink-500' },
    { day: 22, event: 'Tech Summit', active: true, color: 'bg-cyan-500' },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Security Alerts and System Threat Log */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-500" />
              <span>Security Alerts</span>
            </h2>
            <p className="text-xs text-slate-500">High severity flags & transaction threats.</p>
          </div>
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-2xs font-semibold text-rose-600 border border-rose-100">
            Active Focus
          </span>
        </div>

        <div className="mt-4 space-y-3.5 max-h-[240px] overflow-y-auto pr-1">
          {alerts.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">No active priority threats detected.</div>
          ) : (
            alerts.slice(0, 3).map((alert) => (
              <div 
                key={alert.id} 
                className={`rounded-xl border p-3.5 relative ${
                  alert.severity === 'high' 
                    ? 'border-rose-100 bg-rose-50/50' 
                    : 'border-amber-100 bg-amber-50/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${alert.severity === 'high' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  <h4 className="text-xs font-bold text-slate-800">{alert.title}</h4>
                </div>
                <p className="mt-1.5 text-2xs text-slate-600 leading-relaxed">{alert.description}</p>
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-mono text-slate-500">
                  <span>{alert.type}</span>
                  <span>{alert.timestamp}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Operations Calendar & Upcoming Deadlines */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="h-4.5 w-4.5 text-indigo-600" />
            <span>Operations Calendar</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">July 2026</span>
        </div>

        <div className="mt-4">
          {/* Grid calendar view representation */}
          <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-slate-400 font-bold uppercase mb-2">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-2xs text-slate-600">
            {/* Offset padding for July 1st starting on Wednesday */}
            <span className="p-1 text-slate-300">28</span>
            <span className="p-1 text-slate-300">29</span>
            <span className="p-1 text-slate-300">30</span>
            
            {Array.from({ length: 31 }).map((_, i) => {
              const day = i + 1;
              const match = calendarDates.find(d => d.day === day);
              return (
                <div 
                  key={day} 
                  className={`p-1 rounded flex flex-col items-center justify-center border relative transition-all duration-205 cursor-pointer ${
                    match 
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700 font-bold shadow-sm' 
                      : 'border-transparent hover:border-slate-200 hover:text-slate-800'
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
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Upcoming Schedules</span>
            {calendarDates.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-2xs text-slate-700">
                <span className={`h-1.5 w-1.5 rounded-full ${item.color}`} />
                <span className="font-mono text-slate-500">July {item.day}:</span>
                <span className="truncate">{item.event}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
