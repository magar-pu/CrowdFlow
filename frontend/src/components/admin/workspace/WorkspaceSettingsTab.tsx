"use client";

import React from 'react';

export default function WorkspaceSettingsTab() {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-white p-4 shadow-sm sm:p-6">
      <h3 className="border-b border-border-subtle pb-3 text-base font-bold text-text-primary">Event Operations Configurations</h3>
      
      <div className="mt-6 space-y-6">
        {/* Resale constraints */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-text-primary">Anti-Scalp Price Cap Constraint</h4>
              <p className="mt-1 text-[11px] text-text-muted">Locks maximum price ceilings on secondary marketplaces to secure consumer interests.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select 
                id="event-settings-resale-limit"
                className="min-h-11 w-full rounded-xl border border-border-subtle bg-surface-soft px-3.5 py-2 text-xs text-text-primary outline-none focus:border-primary sm:w-auto"
                defaultValue="120"
                onChange={() => alert('Price cap constraint adjusted. Re-indexing resale databases...')}
              >
                <option value="110">110% of Face Value (Strict)</option>
                <option value="120">120% of Face Value (Standard)</option>
                <option value="150">150% of Face Value (Relaxed)</option>
                <option value="200">No Limit (Not recommended)</option>
              </select>
              <span className="text-[10px] font-mono font-semibold text-status-success">Verified Security Profile</span>
            </div>
          </div>

          {/* Hardware security toggles */}
          <div className="space-y-4 border-border-subtle md:border-l md:pl-6">
            <div>
              <h4 className="text-xs font-bold text-text-primary">Hardware Fingerprinting</h4>
              <p className="mt-1 text-[11px] text-text-muted">Requires seller scanners to lock securely to local hardware MAC addresses to block virtual device emulation threats.</p>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                defaultChecked 
                className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-800 h-4.5 w-4.5" 
              />
              <span className="text-xs font-semibold text-text-secondary">Enable Hardware Token Enforce</span>
            </div>
          </div>
        </div>

        {/* Webhooks configuration */}
        <div className="space-y-4 border-t border-border-subtle pt-6">
          <div>
            <h4 className="text-xs font-bold text-text-primary">Webhooks Endpoint Integration</h4>
            <p className="mt-1 text-[11px] text-text-muted">Get real-time event logs (ticket sold, check-in success, security breach) sent to your production server.</p>
          </div>
          <div className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              placeholder="https://api.yourdomain.com/crowdflow-callback"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-border-subtle bg-surface-soft px-3.5 py-2.5 text-xs text-text-primary outline-none focus:border-primary"
              defaultValue="https://api.soundwave.net/hooks/crowdflow-ingress"
            />
            <button
              onClick={() => alert('Webhook callback endpoint stored. Safe handshake protocol completed.')}
              className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary-hover"
            >
              Save Route
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
