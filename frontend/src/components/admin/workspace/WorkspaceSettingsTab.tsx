"use client";

import React from 'react';

export default function WorkspaceSettingsTab() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-sm">
      <h3 className="text-base font-bold text-white border-b border-slate-900 pb-3">Event Operations Configurations</h3>
      
      <div className="mt-6 space-y-6">
        {/* Resale constraints */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-200">Anti-Scalp Price Cap Constraint</h4>
              <p className="text-[11px] text-slate-500 mt-1">Locks maximum price ceilings on secondary marketplaces to secure consumer interests.</p>
            </div>
            <div className="flex items-center gap-3">
              <select 
                id="event-settings-resale-limit"
                className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none"
                defaultValue="120"
                onChange={() => alert('Price cap constraint adjusted. Re-indexing resale databases...')}
              >
                <option value="110">110% of Face Value (Strict)</option>
                <option value="120">120% of Face Value (Standard)</option>
                <option value="150">150% of Face Value (Relaxed)</option>
                <option value="200">No Limit (Not recommended)</option>
              </select>
              <span className="text-[10px] text-emerald-400 font-semibold font-mono">Verified Security Profile</span>
            </div>
          </div>

          {/* Hardware security toggles */}
          <div className="space-y-4 border-l border-slate-900/50 pl-6">
            <div>
              <h4 className="text-xs font-bold text-slate-200">Hardware Fingerprinting</h4>
              <p className="text-[11px] text-slate-500 mt-1">Requires seller scanners to lock securely to local hardware MAC addresses to block virtual device emulation threats.</p>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                defaultChecked 
                className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-800 h-4.5 w-4.5" 
              />
              <span className="text-xs font-semibold text-slate-300">Enable Hardware Token Enforce</span>
            </div>
          </div>
        </div>

        {/* Webhooks configuration */}
        <div className="border-t border-slate-900 pt-6 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-200">Webhooks Endpoint Integration</h4>
            <p className="text-[11px] text-slate-500 mt-1">Get real-time event logs (ticket sold, check-in success, security breach) sent to your production server.</p>
          </div>
          <div className="flex items-center gap-3 max-w-xl">
            <input
              type="text"
              placeholder="https://api.yourdomain.com/crowdflow-callback"
              className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none"
              defaultValue="https://api.soundwave.net/hooks/crowdflow-ingress"
            />
            <button
              onClick={() => alert('Webhook callback endpoint stored. Safe handshake protocol completed.')}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
            >
              Save Route
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
