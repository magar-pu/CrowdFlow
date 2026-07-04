"use client";

import React, { useState } from 'react';
import { Cpu } from 'lucide-react';
import { VenueSection } from '../types';

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
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-900 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Live Venue Seating Plan</h3>
              <p className="text-[11px] text-slate-400">Select any physical section block below to coordinate section capacity and status.</p>
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Interactive Layout Plan</span>
          </div>

          {/* Seating Layout Visual Representation */}
          <div className="mt-6 flex flex-col gap-4 items-center bg-slate-900/10 p-6 rounded-2xl border border-slate-900/50">
            {/* Physical STAGE visual banner */}
            <div className="w-4/5 h-10 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 flex items-center justify-center text-center shadow-lg shadow-pink-500/10">
              <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Cpu className="h-4 w-4 text-white animate-pulse" />
                <span>PERFORMANCE MAIN STAGE</span>
              </span>
            </div>

            {/* Section Blocks Grid */}
            <div className="mt-6 grid grid-cols-3 gap-4 w-full">
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
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
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
                          <span className="text-base font-extrabold text-white">{occupancyPct}%</span>
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
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <h3 className="text-sm font-bold text-white border-b border-slate-900 pb-3">Section Control Desk</h3>
          
          {selectedSection ? (
            <div className="mt-4 space-y-4">
              <div>
                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Active Section Focus</span>
                <h4 className="text-sm font-bold text-white mt-1">{selectedSection.name}</h4>
                <p className="text-xs font-mono text-indigo-400 mt-0.5">Section Key: {selectedSection.id}</p>
              </div>

              <div className="rounded-xl bg-slate-900/30 border border-slate-900 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Physical Capacity limit</span>
                  <span className="font-mono text-slate-200 font-bold">{selectedSection.capacity} seats</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Checked-in Attendee Count</span>
                  <span className="font-mono text-slate-200 font-bold">
                    {selectedSection.occupied === -1 ? 'Blocked' : `${selectedSection.occupied} occupied`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Occupancy status</span>
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
                  className="w-full bg-slate-900 border border-slate-800 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
