"use client";

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { TicketTier } from '../types';

interface WorkspaceTicketTiersTabProps {
  ticketTiers: TicketTier[];
  onUpdateTiers: (updatedTiers: TicketTier[]) => void;
}

export default function WorkspaceTicketTiersTab({ ticketTiers, onUpdateTiers }: WorkspaceTicketTiersTabProps) {
  const [showAddTier, setShowAddTier] = useState(false);
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState('');
  const [newTierCap, setNewTierCap] = useState('');
  const [newTierCapacity, setNewTierCapacity] = useState('');

  const handleAddTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTierName || !newTierPrice) return;

    const price = parseFloat(newTierPrice) || 100;
    const cap = parseFloat(newTierCap) || (price * 1.2);
    const capacity = parseInt(newTierCapacity) || 1000;

    const newTier: TicketTier = {
      id: `TIER-${Date.now().toString().slice(-3)}`,
      name: newTierName,
      price: price,
      priceCap: cap,
      capacity: capacity,
      sold: 0,
      color: 'border-emerald-500 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
    };

    onUpdateTiers([...ticketTiers, newTier]);
    setNewTierName('');
    setNewTierPrice('');
    setNewTierCap('');
    setNewTierCapacity('');
    setShowAddTier(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Event Ticket Tiers</h3>
          <p className="text-xs text-slate-400">Set maximum pricing ceilings, and monitor tier distribution capacities.</p>
        </div>
        <button
          onClick={() => setShowAddTier(true)}
          className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer flex items-center gap-1 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Ticket Tier</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {ticketTiers.map((tier) => {
          const tierSoldPercent = Math.round((tier.sold / tier.capacity) * 100) || 0;
          return (
            <div key={tier.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between min-h-[180px]">
              <div>
                <div className="flex items-start justify-between">
                  <span className={`rounded-md border px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider ${tier.color}`}>
                    {tier.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">{tier.id}</span>
                </div>
                <h4 className="mt-3 text-xs font-bold text-white">{tier.name}</h4>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-extrabold text-white">${tier.price}</span>
                  <span className="text-[10px] text-slate-400">Cap Ceiling: <span className="font-bold text-rose-400">${tier.priceCap}</span></span>
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Sold: {tier.sold} / {tier.capacity}</span>
                  <span>{tierSoldPercent}%</span>
                </div>
                <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${tierSoldPercent}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAddTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl relative">
            <button onClick={() => setShowAddTier(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-4">Add Event Ticket Tier</h3>
            <form onSubmit={handleAddTier} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tier Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Backstage Experience"
                  value={newTierName}
                  onChange={(e) => setNewTierName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Face Value ($)</label>
                  <input
                    type="number"
                    required
                    placeholder="150"
                    value={newTierPrice}
                    onChange={(e) => setNewTierPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Resale Cap ($)</label>
                  <input
                    type="number"
                    placeholder="180"
                    value={newTierCap}
                    onChange={(e) => setNewTierCap(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Allocated Capacity</label>
                  <input
                    type="number"
                    placeholder="1000"
                    value={newTierCapacity}
                    onChange={(e) => setNewTierCapacity(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2 border-t border-slate-900 pt-4">
                <button type="button" onClick={() => setShowAddTier(false)} className="rounded-xl border border-slate-800 px-4 py-2 text-xs text-slate-400 hover:bg-slate-900 cursor-pointer">Cancel</button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-xs text-white hover:bg-indigo-500 cursor-pointer">Inject Ticket Tier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
