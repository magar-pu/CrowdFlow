"use client";

import React from 'react';
import { ShieldCheck, Database, Sliders, Save } from 'lucide-react';

export default function SettingsView() {
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Global Super Admin settings saved successfully. Broadcasted configuration update across all cluster nodes.');
  };

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Global System Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Control core API cluster parameters, security rate limiting, and main ledger maintenance protocols.</p>
      </div>

      <form onSubmit={handleSave} className="grid gap-6 md:grid-cols-3">
        {/* Left main settings column */}
        <div className="md:col-span-2 space-y-6">
          {/* Cluster configuration */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
              <Database className="h-4.5 w-4.5 text-indigo-400" />
              <span>Database Cluster Nodes</span>
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-3xs font-bold text-slate-500 uppercase mb-1.5">Master Cluster Primary Host</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-300 outline-none"
                  defaultValue="db-master.singapore.gcp.crowdflow.internal"
                  disabled
                />
              </div>
              <div>
                <label className="block text-3xs font-bold text-slate-500 uppercase mb-1.5">Read Replica Nodes Allocation</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-300 outline-none"
                  defaultValue="3 Active Replicas"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Security Protocols */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
              <ShieldCheck className="h-4.5 w-4.5 text-pink-400" />
              <span>Identity & Fraud Protection Rules</span>
            </h3>

            <div className="space-y-4">
              <div className="flex items-start justify-between rounded-xl bg-slate-900/30 border border-slate-900 p-3.5">
                <div className="max-w-md">
                  <h4 className="text-xs font-bold text-slate-200">Device Fingerprint Enforce</h4>
                  <p className="text-3xs text-slate-500 mt-0.5">Enforce browser and device hardware fingerprint checks to detect bulk reseller botnets.</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 bg-slate-900 border-slate-800 cursor-pointer" />
              </div>

              <div className="flex items-start justify-between rounded-xl bg-slate-900/30 border border-slate-900 p-3.5">
                <div className="max-w-md">
                  <h4 className="text-xs font-bold text-slate-200">KYC/Document Checklist Trigger</h4>
                  <p className="text-3xs text-slate-500 mt-0.5">Require instant document verification files for organizer withdrawal payouts above $10,000.</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 bg-slate-900 border-slate-800 cursor-pointer" />
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar info */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
              <Sliders className="h-4.5 w-4.5 text-cyan-400" />
              <span>Platform Mode Control</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-3xs font-bold text-slate-500 uppercase">Current cluster load</span>
                <p className="text-base font-extrabold text-white mt-1">Normal (8% CPU)</p>
              </div>

              <div>
                <span className="text-3xs font-bold text-slate-500 uppercase">Platform Status</span>
                <p className="text-xs text-emerald-400 font-bold mt-1 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ONLINE & SECURE</span>
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Save configurations</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
