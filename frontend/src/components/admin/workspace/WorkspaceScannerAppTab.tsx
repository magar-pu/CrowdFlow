"use client";

import React, { useState } from 'react';
import { Smartphone, Plus, Database, Battery, Layers, QrCode, X } from 'lucide-react';
import { Scanner, VenueSection } from '@/types/admin';
import WorkspaceScannerSimulator from './WorkspaceScannerSimulator';
import Select from '@/components/ui/Select';

interface WorkspaceScannerAppTabProps {
  scanners: Scanner[];
  venueSections: VenueSection[];
  onAddScanner: (newScanner: Scanner) => void;
  onDeleteScanner: (id: string) => void;
  onUpdateScanners: (updatedScanners: Scanner[]) => void;
  onUpdateSections: (updatedSections: VenueSection[]) => void;
}

export default function WorkspaceScannerAppTab({
  scanners,
  venueSections,
  onAddScanner,
  onDeleteScanner,
  onUpdateScanners,
  onUpdateSections
}: WorkspaceScannerAppTabProps) {
  const [selectedScannerForApp, setSelectedScannerForApp] = useState<Scanner | null>(null);
  const [showAddScanner, setShowAddScanner] = useState(false);
  const [newScannerName, setNewScannerName] = useState('');
  const [newScannerDevice, setNewScannerDevice] = useState('Apple iPhone 15 Pro');
  const [newScannerSection, setNewScannerSection] = useState('General Admission');

  const handleRegisterScanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScannerName) return;

    const newScanner: Scanner = {
      id: `SC-${Math.floor(800 + Math.random() * 99)}`,
      name: newScannerName,
      deviceName: newScannerDevice,
      status: 'Online',
      scansCount: 0,
      lastSync: 'Just registered',
      batteryLevel: 100,
      assignedSection: newScannerSection
    };

    onAddScanner(newScanner);
    setNewScannerName('');
    setShowAddScanner(false);
  };

  if (selectedScannerForApp) {
    return (
      <WorkspaceScannerSimulator
        selectedScannerForApp={selectedScannerForApp}
        onClose={() => setSelectedScannerForApp(null)}
        scanners={scanners}
        venueSections={venueSections}
        onUpdateScanners={onUpdateScanners}
        onUpdateSections={onUpdateSections}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
            <Smartphone className="h-4 w-4 text-primary" />
            <span>Mobile Scanner Devices</span>
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">Turn any phone into a high-speed ticket scanner. Select a phone below to open its check-in simulation console.</p>
        </div>
        <button
          onClick={() => setShowAddScanner(true)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Register Staff Mobile Device</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {scanners.map((scanner) => (
          <div key={scanner.id} className="group flex min-h-[220px] flex-col justify-between rounded-2xl border border-border-subtle bg-surface-white p-5 transition-all duration-200 hover:border-border-medium">
            <div>
              <div className="flex items-start justify-between">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                  scanner.status === 'Online' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : scanner.status === 'Scanning' 
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {(scanner.status === 'Scanning' || scanner.status === 'Online') && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />}
                  {scanner.status}
                </span>
                <span className="text-[9px] font-mono text-slate-500 font-bold">{scanner.id}</span>
              </div>

              <h4 className="mt-3 text-xs font-bold text-text-primary transition-colors">{scanner.name}</h4>
              <p className="mt-0.5 flex items-center gap-1 text-[10px] font-mono text-text-muted">
                <Smartphone className="h-3 w-3 text-slate-600" />
                <span>{scanner.deviceName}</span>
              </p>
              
              <div className="mt-3.5 flex items-center gap-1.5 text-2xs text-slate-400 font-medium">
                <Layers className="h-3.5 w-3.5 text-slate-600" />
                <span>Assigned Section: <span className="font-bold text-text-primary">{scanner.assignedSection}</span></span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-border-subtle pt-3">
              <div className="flex items-center justify-between text-2xs">
                <div className="flex items-center gap-1 text-slate-400 font-medium">
                  <Database className="h-3.5 w-3.5 text-slate-600" />
                  <span>Scanned Passes: <span className="font-mono font-bold text-text-primary">{scanner.scansCount}</span></span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 font-mono text-3xs">
                  <Battery className="h-3.5 w-3.5 text-slate-600" />
                  <span>{scanner.batteryLevel}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                <button
                  onClick={() => setSelectedScannerForApp(scanner)}
                  className="w-full text-center text-3xs rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 py-1.5 font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border border-indigo-500/10 hover:border-indigo-500/30"
                >
                  <QrCode className="h-3 w-3" />
                  <span>Open Scanner</span>
                </button>
                <button
                  onClick={() => onDeleteScanner(scanner.id)}
                  className="w-full text-center text-3xs rounded-lg bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 py-1.5 font-bold transition-all cursor-pointer border border-rose-500/5 hover:border-rose-500/20"
                >
                  Revoke Token
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border-subtle bg-surface-white p-5 shadow-2xl sm:p-6">
            <button onClick={() => setShowAddScanner(false)} className="absolute right-4 top-4 text-text-muted hover:text-text-primary">
              <X className="h-5 w-5" />
            </button>
            <h3 className="mb-4 pr-8 text-sm font-black text-text-primary">Register Staff Mobile Phone Scanner</h3>
            <form onSubmit={handleRegisterScanner} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase text-text-muted">Staff Gate / Entrance Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. West Wing Balcony Entrance 1"
                  value={newScannerName}
                  onChange={(e) => setNewScannerName(e.target.value)}
                  className="w-full rounded-xl border border-border-subtle bg-surface-soft px-3.5 py-2.5 text-xs text-text-primary outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase text-text-muted">Staff Smartphone Device Model</label>
                <Select
                  value={newScannerDevice}
                  onChange={(e) => setNewScannerDevice(e.target.value)}
                >
                  <option value="Apple iPhone 15 Pro">Apple iPhone 15 Pro</option>
                  <option value="Samsung Galaxy S24 Ultra">Samsung Galaxy S24 Ultra</option>
                  <option value="Google Pixel 8 Pro">Google Pixel 8 Pro</option>
                  <option value="Apple iPhone SE (Staff Edition)">Apple iPhone SE (Staff Edition)</option>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase text-text-muted">Assigned Section Gate</label>
                <Select
                  value={newScannerSection}
                  onChange={(e) => setNewScannerSection(e.target.value)}
                >
                  <option value="General Admission">General Admission</option>
                  <option value="VIP Lounge">VIP Lounge</option>
                  <option value="Grandstands Balcony">Grandstands Balcony</option>
                </Select>
              </div>
              <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border-subtle pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowAddScanner(false)} className="min-h-11 rounded-xl border border-border-subtle px-4 py-2 text-xs text-text-secondary hover:bg-surface-soft">Cancel</button>
                <button type="submit" className="min-h-11 rounded-xl bg-primary px-4 py-2 text-xs text-white hover:bg-primary-hover">Authorize Mobile Node</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
