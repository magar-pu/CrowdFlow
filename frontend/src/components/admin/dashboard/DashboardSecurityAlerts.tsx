"use client";

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { SecurityAlert } from '@/types/admin';

// Was DashboardAlertsAndCalendar. The Operations Calendar half was deleted: it
// rendered four invented entries ("Tennis tickets open", "Organizer payout
// due") over a grid whose day offsets were hardcoded to July 2026, so it would
// have been wrong in every other month even if the events had been real. No
// schedule/deadline table exists to drive it.
interface DashboardSecurityAlertsProps {
  alerts: SecurityAlert[];
}

export default function DashboardSecurityAlerts({ alerts }: DashboardSecurityAlertsProps) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-text-primary">
            <ShieldAlert className="h-4.5 w-4.5 text-danger" />
            <span>Security Alerts</span>
          </h2>
          <p className="text-xs text-text-secondary">Priority flags that need admin review.</p>
        </div>
        {alerts.length > 0 && (
          <span className="rounded-full border border-danger/20 bg-danger/5 px-2 py-0.5 text-[10px] font-semibold text-danger">
            Active Review
          </span>
        )}
      </div>

      <div className="mt-4 max-h-[240px] space-y-3.5 overflow-y-auto pr-1">
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
  );
}
