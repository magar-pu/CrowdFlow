"use client";

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { TicketTier } from '@/types/admin';

interface WorkspaceTicketTiersTabProps {
  ticketTiers: TicketTier[];
  onUpdateTiers: (updatedTiers: TicketTier[]) => void;
}

export default function WorkspaceTicketTiersTab({ ticketTiers, onUpdateTiers }: WorkspaceTicketTiersTabProps) {
  const [showAddTier, setShowAddTier] = useState(false);
  const [newTierName, setNewTierName] = useState('');
  const [newTierDescription, setNewTierDescription] = useState('');
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
      description: newTierDescription.trim(),
      price: price,
      priceCap: cap,
      capacity: capacity,
      sold: 0,
      color: 'border-emerald-500 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
    };

    onUpdateTiers([...ticketTiers, newTier]);
    setNewTierName('');
    setNewTierDescription('');
    setNewTierPrice('');
    setNewTierCap('');
    setNewTierCapacity('');
    setShowAddTier(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-text-primary">Event Ticket Tiers</h3>
          <p className="text-xs text-text-muted">Set maximum pricing ceilings, and monitor tier distribution capacities.</p>
        </div>
        <button
          onClick={() => setShowAddTier(true)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Ticket Tier</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ticketTiers.map((tier) => {
          const tierSoldPercent = Math.round((tier.sold / tier.capacity) * 100) || 0;
          return (
            <div key={tier.id} className="flex min-h-[180px] flex-col justify-between rounded-2xl border border-border-subtle bg-surface-white p-5">
              <div>
                <div className="flex items-start justify-between">
                  <span className={`rounded-md border px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider ${tier.color}`}>
                    {tier.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">{tier.id}</span>
                </div>
                <h4 className="mt-3 text-xs font-bold text-text-primary">{tier.name}</h4>
                {tier.description && (
                  <p className="mt-1 line-clamp-2 text-[10px] text-text-muted">{tier.description}</p>
                )}
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-extrabold text-text-primary">${tier.price}</span>
                  <span className="text-[10px] text-text-muted">Cap Ceiling: <span className="font-bold text-status-danger">${tier.priceCap}</span></span>
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
          <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border-subtle bg-surface-white p-5 shadow-2xl sm:p-6">
            <button onClick={() => setShowAddTier(false)} className="absolute right-4 top-4 text-text-muted hover:text-text-primary">
              <X className="h-5 w-5" />
            </button>
            <h3 className="mb-4 pr-8 text-base font-bold text-text-primary">Add Event Ticket Tier</h3>
            <form onSubmit={handleAddTier} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase text-text-muted">Tier Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Backstage Experience"
                  value={newTierName}
                  onChange={(e) => setNewTierName(e.target.value)}
                  className="w-full rounded-xl border border-border-subtle bg-surface-soft px-3.5 py-2.5 text-xs text-text-primary outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase text-text-muted">Description</label>
                <textarea
                  rows={3}
                  placeholder="What this tier includes - seating area, perks, access level..."
                  value={newTierDescription}
                  onChange={(e) => setNewTierDescription(e.target.value)}
                  className="w-full resize-none rounded-xl border border-border-subtle bg-surface-soft px-3.5 py-2.5 text-xs text-text-primary outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase text-text-muted">Face Value ($)</label>
                  <input
                    type="number"
                    required
                    placeholder="150"
                    value={newTierPrice}
                    onChange={(e) => setNewTierPrice(e.target.value)}
                    className="w-full rounded-xl border border-border-subtle bg-surface-soft px-3 py-2.5 text-xs text-text-primary outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase text-text-muted">Resale Cap ($)</label>
                  <input
                    type="number"
                    placeholder="180"
                    value={newTierCap}
                    onChange={(e) => setNewTierCap(e.target.value)}
                    className="w-full rounded-xl border border-border-subtle bg-surface-soft px-3 py-2.5 text-xs text-text-primary outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase text-text-muted">Allocated Capacity</label>
                  <input
                    type="number"
                    placeholder="1000"
                    value={newTierCapacity}
                    onChange={(e) => setNewTierCapacity(e.target.value)}
                    className="w-full rounded-xl border border-border-subtle bg-surface-soft px-3 py-2.5 text-xs text-text-primary outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border-subtle pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowAddTier(false)} className="min-h-11 rounded-xl border border-border-subtle px-4 py-2 text-xs text-text-secondary hover:bg-surface-soft">Cancel</button>
                <button type="submit" className="min-h-11 rounded-xl bg-primary px-4 py-2 text-xs text-white hover:bg-primary-hover">Inject Ticket Tier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
