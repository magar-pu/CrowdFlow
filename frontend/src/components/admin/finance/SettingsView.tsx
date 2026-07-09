"use client";

import React from 'react';
import { ShieldCheck, Database, Sliders, Save } from 'lucide-react';

export default function SettingsView() {
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Admin settings saved successfully.');
  };

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-normal text-text-primary md:text-4xl">Global Settings</h1>
        <p className="mt-2 text-sm text-text-secondary">Manage platform configuration, security rules, and operational defaults.</p>
      </div>

      <form onSubmit={handleSave} className="grid gap-6 md:grid-cols-3">
        {/* Left main settings column */}
        <div className="md:col-span-2 space-y-6">
          {/* Cluster configuration */}
          <div className="space-y-4 rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 border-b border-border-subtle pb-3 text-sm font-bold text-text-primary">
              <Database className="h-4.5 w-4.5 text-secondary" />
              <span>Database Configuration</span>
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Primary Host</label>
                <input
                  type="text"
                  className="h-11 w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-secondary outline-none"
                  defaultValue="db-master.singapore.gcp.crowdflow.internal"
                  disabled
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Read Replicas</label>
                <input
                  type="text"
                  className="h-11 w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-secondary outline-none"
                  defaultValue="3 Active Replicas"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Security Protocols */}
          <div className="space-y-4 rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 border-b border-border-subtle pb-3 text-sm font-bold text-text-primary">
              <ShieldCheck className="h-4.5 w-4.5 text-tertiary" />
              <span>Identity & Fraud Protection Rules</span>
            </h3>

            <div className="space-y-4">
              <div className="flex items-start justify-between rounded-lg border border-border-subtle bg-surface p-4">
                <div className="max-w-md">
                  <h4 className="text-xs font-bold text-text-primary">Device Fingerprint Enforcement</h4>
                  <p className="mt-0.5 text-xs text-text-secondary">Require device checks for suspicious purchasing behavior.</p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border-subtle text-secondary focus:ring-secondary cursor-pointer" />
              </div>

              <div className="flex items-start justify-between rounded-lg border border-border-subtle bg-surface p-4">
                <div className="max-w-md">
                  <h4 className="text-xs font-bold text-text-primary">KYC Document Review</h4>
                  <p className="mt-0.5 text-xs text-text-secondary">Require document verification for organizer withdrawals above $10,000.</p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border-subtle text-secondary focus:ring-secondary cursor-pointer" />
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar info */}
        <div className="space-y-6">
          <div className="space-y-4 rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 border-b border-border-subtle pb-3 text-sm font-bold text-text-primary">
              <Sliders className="h-4.5 w-4.5 text-tertiary" />
              <span>Platform Mode Control</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">Current Load</span>
                <p className="mt-1 text-base font-extrabold text-text-primary">Normal (8% CPU)</p>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">Platform Status</span>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  <span>Online</span>
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-xs font-bold text-on-primary transition-colors hover:bg-primary-container cursor-pointer"
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
