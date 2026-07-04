"use client";

import React, { useState } from 'react';
import { Smartphone, Plus, Database, Battery, Layers, QrCode, X } from 'lucide-react';
import { Scanner, VenueSection } from '../types';
import WorkspaceScannerSimulator from './WorkspaceScannerSimulator';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Smartphone className="h-4 w-4 text-indigo-400" />
            <span>Mobile Scanner Devices</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Turn any phone into a high-speed ticket scanner. Select a phone below to open its check-in simulation console.</p>
        </div>
        <button
          onClick={() => setShowAddScanner(true)}
          className="self-start rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer flex items-center gap-1.5 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Register Staff Mobile Device</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {scanners.map((scanner) => (
          <div key={scanner.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between min-h-[220px] hover:border-slate-700 transition-all duration-200 group">
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

              <h4 className="mt-3 text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{scanner.name}</h4>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                <Smartphone className="h-3 w-3 text-slate-600" />
                <span>{scanner.deviceName}</span>
              </p>
              
              <div className="mt-3.5 flex items-center gap-1.5 text-2xs text-slate-400 font-medium">
                <Layers className="h-3.5 w-3.5 text-slate-600" />
                <span>Assigned Section: <span className="text-slate-300 font-bold">{scanner.assignedSection}</span></span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-900/50 flex flex-col gap-3">
              <div className="flex items-center justify-between text-2xs">
                <div className="flex items-center gap-1 text-slate-400 font-medium">
                  <Database className="h-3.5 w-3.5 text-slate-600" />
                  <span>Scanned Passes: <span className="font-mono text-slate-200 font-bold">{scanner.scansCount}</span></span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 font-mono text-3xs">
                  <Battery className="h-3.5 w-3.5 text-slate-600" />
                  <span>{scanner.batteryLevel}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
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
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl relative">
            <button onClick={() => setShowAddScanner(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-sm font-black text-white mb-4">Register Staff Mobile Phone Scanner</h3>
            <form onSubmit={handleRegisterScanner} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Staff Gate / Entrance Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. West Wing Balcony Entrance 1"
                  value={newScannerName}
                  onChange={(e) => setNewScannerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Staff Smartphone Device Model</label>
                <select
                  value={newScannerDevice}
                  onChange={(e) => setNewScannerDevice(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="Apple iPhone 15 Pro">Apple iPhone 15 Pro</option>
                  <option value="Samsung Galaxy S24 Ultra">Samsung Galaxy S24 Ultra</option>
                  <option value="Google Pixel 8 Pro">Google Pixel 8 Pro</option>
                  <option value="Apple iPhone SE (Staff Edition)">Apple iPhone SE (Staff Edition)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Assigned Section Gate</label>
                <select
                  value={newScannerSection}
                  onChange={(e) => setNewScannerSection(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="General Admission">General Admission</option>
                  <option value="VIP Lounge">VIP Lounge</option>
                  <option value="Grandstands Balcony">Grandstands Balcony</option>
                </select>
              </div>
              <div className="mt-5 flex justify-end gap-2 border-t border-slate-900 pt-4">
                <button type="button" onClick={() => setShowAddScanner(false)} className="rounded-xl border border-slate-800 px-4 py-2 text-xs text-slate-400 hover:bg-slate-900 cursor-pointer">Cancel</button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-xs text-white hover:bg-indigo-500 cursor-pointer">Authorize Mobile Node</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
