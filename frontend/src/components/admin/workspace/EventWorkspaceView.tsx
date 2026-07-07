"use client";

import React, { useState } from 'react';
import { ArrowLeft, Check, ShieldAlert, X, Zap, Shield, Activity, Ticket, Map, Smartphone, Settings } from 'lucide-react';
import { Event, Scanner, TicketTier, VenueSection, Transaction } from '@/types/admin';
import WorkspaceLiveTrackerTab from './WorkspaceLiveTrackerTab';
import WorkspaceTicketTiersTab from './WorkspaceTicketTiersTab';
import WorkspaceVenueLayoutTab from './WorkspaceVenueLayoutTab';
import WorkspaceScannerAppTab from './WorkspaceScannerAppTab';
import WorkspaceSettingsTab from './WorkspaceSettingsTab';

interface EventWorkspaceViewProps {
  event: Event;
  scanners: Scanner[];
  ticketTiers: TicketTier[];
  venueSections: VenueSection[];
  transactions: Transaction[];
  onBack: () => void;
  onAddScanner: (newScanner: Scanner) => void;
  onDeleteScanner: (id: string) => void;
  onUpdateSections: (updatedSections: VenueSection[]) => void;
  onUpdateTiers: (updatedTiers: TicketTier[]) => void;
  onUpdateScanners: (updatedScanners: Scanner[]) => void;
}

export default function EventWorkspaceView({
  event,
  scanners,
  ticketTiers,
  venueSections,
  transactions,
  onBack,
  onAddScanner,
  onDeleteScanner,
  onUpdateSections,
  onUpdateTiers,
  onUpdateScanners
}: EventWorkspaceViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'venue' | 'scanners' | 'settings'>('overview');
  const [validationResult, setValidationResult] = useState<{
    show: boolean;
    success: boolean;
    message: string;
    holder?: string;
    tier?: string;
  } | null>(null);

  const triggerScanSimulation = (forceSuccess: boolean) => {
    setValidationResult({
      show: true,
      success: forceSuccess,
      message: forceSuccess ? "TICKET VERIFIED" : "DUPLICATE TICKET SIGNATURE",
      holder: forceSuccess ? "Sarah Jenkins" : "Unknown / Blacklisted Wallet",
      tier: forceSuccess ? "VIP All-Access Pass" : "GA Phase 2 (Copied)"
    });

    setTimeout(() => {
      setValidationResult(null);
    }, 4000);
  };

  return (
    <div className="space-y-6 relative">
      {/* Validation Animation Overlay Popups */}
      {validationResult && (
        <div className="fixed top-6 right-6 z-50 animate-bounce">
          <div className={`rounded-2xl border p-4 shadow-2xl flex items-start gap-3 w-80 backdrop-blur-md ${
            validationResult.success 
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' 
              : 'bg-rose-950/90 border-rose-500 text-rose-200'
          }`}>
            <div className={`rounded-xl p-2 ${validationResult.success ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
              {validationResult.success ? <Check className="h-5 w-5 text-emerald-400" /> : <ShieldAlert className="h-5 w-5 text-rose-400" />}
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-mono font-bold tracking-widest uppercase">{validationResult.message}</h4>
              <p className="mt-1 text-[11px] text-slate-300 font-semibold">Holder: {validationResult.holder}</p>
              <p className="text-3xs text-slate-400 font-mono">Tier: {validationResult.tier}</p>
              <div className="mt-2.5 h-1 w-full bg-slate-900 overflow-hidden rounded">
                <div className={`h-full animate-pulse ${validationResult.success ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: '100%' }} />
              </div>
            </div>
            <button onClick={() => setValidationResult(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header breadcrumb & info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-5">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {event.category} Workspace
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-500">Node ID: {event.id}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl mt-1">{event.name}</h1>
          </div>
        </div>

        {/* Workspace Quick Simulator Trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerScanSimulation(true)}
            className="rounded-xl bg-emerald-600/15 border border-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            title="Simulate a Valid Ticket Scanning"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Simulate Success Scan</span>
          </button>
          <button
            onClick={() => triggerScanSimulation(false)}
            className="rounded-xl bg-rose-600/15 border border-rose-500/20 px-3.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            title="Simulate an Anti-Counterfeit Failure"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Simulate Threat Scan</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation panel */}
      <div className="flex border-b border-slate-800 space-x-1 overflow-x-auto">
        {[
          { id: 'overview', name: 'Live Tracker', icon: Activity },
          { id: 'tickets', name: 'Ticket Tiers', icon: Ticket },
          { id: 'venue', name: 'Venue Layout', icon: Map },
          { id: 'scanners', name: 'Handheld Scanners', icon: Smartphone },
          { id: 'settings', name: 'Security Config', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'border-indigo-500 text-white bg-indigo-500/5' 
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/10'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Content tabs rendering */}
      {activeTab === 'overview' && (
        <WorkspaceLiveTrackerTab event={event} scanners={scanners} transactions={transactions} />
      )}
      {activeTab === 'tickets' && (
        <WorkspaceTicketTiersTab ticketTiers={ticketTiers} onUpdateTiers={onUpdateTiers} />
      )}
      {activeTab === 'venue' && (
        <WorkspaceVenueLayoutTab venueSections={venueSections} onUpdateSections={onUpdateSections} />
      )}
      {activeTab === 'scanners' && (
        <WorkspaceScannerAppTab 
          scanners={scanners} 
          venueSections={venueSections}
          onAddScanner={onAddScanner}
          onDeleteScanner={onDeleteScanner}
          onUpdateScanners={onUpdateScanners}
          onUpdateSections={onUpdateSections}
        />
      )}
      {activeTab === 'settings' && (
        <WorkspaceSettingsTab />
      )}
    </div>
  );
}
