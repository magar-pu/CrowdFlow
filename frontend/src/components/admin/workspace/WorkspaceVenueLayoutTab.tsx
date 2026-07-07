"use client";

import React, { useState } from 'react';
import { Cpu } from 'lucide-react';
import { VenueSection } from '@/types/admin';

interface WorkspaceVenueLayoutTabProps {
  venueSections: VenueSection[];
  onUpdateSections: (updatedSections: VenueSection[]) => void;
}

export default function WorkspaceVenueLayoutTab({ venueSections, onUpdateSections }: WorkspaceVenueLayoutTabProps) {
  const [selectedSection, setSelectedSection] = useState<VenueSection | null>(venueSections[0] || null);

  const handleToggleSectionClosure = (secId: string) => {
    const updated = venueSections.map(sec => {
      if (sec.id === secId) {
        const isClosed = sec.occupied === -1;
        return {
          ...sec,
          occupied: isClosed ? Math.floor(sec.capacity * 0.5) : -1 // -1 means CLOSED / LOCKED
        };
      }
      return sec;
    });
    onUpdateSections(updated);
    
    // Maintain focused section sync
    const matched = updated.find(s => s.id === secId);
    if (matched) setSelectedSection(matched);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Seating interactive section block map */}
        <div className="rounded-2xl border border-border-subtle bg-surface-white p-4 sm:p-5 lg:col-span-2">
          <div className="flex flex-col gap-2 border-b border-border-subtle pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Live Venue Seating Plan</h3>
              <p className="text-[11px] text-text-muted">Select any physical section block below to coordinate section capacity and status.</p>
            </div>
            <span className="text-[10px] font-mono uppercase text-text-muted">Interactive Layout Plan</span>
          </div>

          {/* Seating Layout Visual Representation */}
          <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-border-subtle bg-surface-soft p-4 sm:p-6">
            {/* Physical STAGE visual banner */}
            <div className="flex min-h-11 w-full max-w-xl items-center justify-center rounded-xl bg-primary text-center shadow-sm sm:w-4/5">
              <span className="flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white sm:text-xs">
                <Cpu className="h-4 w-4 text-white animate-pulse" />
                <span>PERFORMANCE MAIN STAGE</span>
              </span>
            </div>

            {/* Section Blocks Grid */}
            <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4">
              {venueSections.map((sec) => {
                const isSelected = selectedSection?.id === sec.id;
                const isClosed = sec.occupied === -1;
                const occupancyPct = isClosed ? 0 : Math.round((sec.occupied / sec.capacity) * 100);

                return (
                  <div
                    key={sec.id}
                    onClick={() => setSelectedSection(sec)}
                    className={`rounded-2xl border p-4 text-center cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02] shadow-lg shadow-indigo-500/5' 
                        : isClosed 
                        ? 'border-slate-900 bg-slate-900/30 opacity-40'
                        : 'border-border-subtle bg-surface-white hover:border-border-medium'
                    }`}
                  >
                    <h4 className="text-xs font-bold text-slate-200">{sec.name.split(' ')[0]}</h4>
                    <p className="mt-1 font-mono text-[9px] text-slate-500 uppercase tracking-wider">{sec.id}</p>
                    
                    <div className="mt-4 flex flex-col items-center justify-center">
                      {isClosed ? (
                        <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[9px] font-bold text-rose-400">
                          BLOCKED
                        </span>
                      ) : (
                        <>
                          <span className="text-base font-extrabold text-text-primary">{occupancyPct}%</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">Capacity occupancy</span>
                          <div className="mt-2.5 h-1 w-full bg-slate-900 overflow-hidden rounded-full">
                            <div className={`h-full ${sec.color}`} style={{ width: `${occupancyPct}%` }} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Section Controls panel */}
        <div className="rounded-2xl border border-border-subtle bg-surface-white p-4 sm:p-5">
          <h3 className="border-b border-border-subtle pb-3 text-sm font-bold text-text-primary">Section Control Desk</h3>
          
          {selectedSection ? (
            <div className="mt-4 space-y-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Active Section Focus</span>
                <h4 className="mt-1 text-sm font-bold text-text-primary">{selectedSection.name}</h4>
                <p className="mt-0.5 text-xs font-mono text-primary">Section Key: {selectedSection.id}</p>
              </div>

              <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-soft p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-secondary">Physical Capacity limit</span>
                  <span className="font-mono font-bold text-text-primary">{selectedSection.capacity} seats</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-secondary">Checked-in Attendee Count</span>
                  <span className="font-mono font-bold text-text-primary">
                    {selectedSection.occupied === -1 ? 'Blocked' : `${selectedSection.occupied} occupied`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-secondary">Occupancy status</span>
                  <span className="font-bold">
                    {selectedSection.occupied === -1 ? (
                      <span className="text-rose-400 uppercase text-[10px]">LOCKED</span>
                    ) : selectedSection.occupied >= selectedSection.capacity ? (
                      <span className="text-pink-400 uppercase text-[10px]">FULL AT CAPACITY</span>
                    ) : (
                      <span className="text-emerald-400 uppercase text-[10px]">OPEN & SECURE</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Section Toggles */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleToggleSectionClosure(selectedSection.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
                    selectedSection.occupied === -1 
                      ? 'bg-emerald-600/15 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white' 
                      : 'bg-rose-600/15 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white'
                  }`}
                >
                  {selectedSection.occupied === -1 ? 'Open & Unlock Section Block' : 'Block & Lock Section Gate'}
                </button>
                
                <button
                  disabled={selectedSection.occupied === -1}
                  onClick={() => {
                    const updated = venueSections.map(sec => {
                      if (sec.id === selectedSection.id && sec.occupied !== -1) {
                        return { ...sec, occupied: Math.min(sec.capacity, sec.occupied + 10) };
                      }
                      return sec;
                    });
                    onUpdateSections(updated);
                    const matched = updated.find(s => s.id === selectedSection.id);
                    if (matched) setSelectedSection(matched);
                  }}
                  className="w-full rounded-xl border border-border-subtle bg-surface-soft py-2.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Simulate 10 Attendee Entries
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-500 text-center py-10">Select a section block on the map to interact.</p>
          )}
        </div>
      </div>
    </div>
  );
}
