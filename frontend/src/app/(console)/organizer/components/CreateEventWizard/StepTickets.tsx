import React, { useState } from 'react';
import { TicketTier, VenueElement } from '../../types';
import { Trash2, ChevronDown, ChevronUp, Layers, TrendingUp, Coins, MapPin } from 'lucide-react';

interface StepTicketsProps {
  tiers: TicketTier[];
  setTiers: (v: TicketTier[]) => void;
  zones: VenueElement[];
}

export default function StepTickets({ tiers, setTiers, zones }: StepTicketsProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(150);
  const [quantity, setQuantity] = useState(500);
  const [maxPerOrder, setMaxPerOrder] = useState(6);
  const [salesStart, setSalesStart] = useState('');
  const [salesEnd, setSalesEnd] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const zone = zones.find(z => z.id === zoneId);
    setTiers([...tiers, {
      id: `t-${Date.now()}`,
      name,
      price,
      sold: 0,
      capacity: quantity,
      maxPerOrder,
      salesStart,
      salesEnd,
      zoneId: zone?.id,
      zoneName: zone?.label,
    }]);
    setName('');
    setZoneId('');
  };

  const handleRemove = (id: string) => {
    setTiers(tiers.filter(t => t.id !== id));
  };

  const updateTier = (id: string, patch: Partial<TicketTier>) => {
    setTiers(tiers.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  const totalCapacity = tiers.reduce((acc, t) => acc + t.capacity, 0);
  const potentialRevenue = tiers.reduce((acc, t) => acc + t.price * t.capacity, 0);
  const avgPrice = tiers.length > 0 ? tiers.reduce((acc, t) => acc + t.price, 0) / tiers.length : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left animate-fade-in">
      <div className="lg:col-span-2 space-y-6">
        {/* Inventory Summary Widget */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
            <span className="text-[10px] text-on-surface-variant font-bold uppercase font-mono block">Total Capacity</span>
            <h3 className="text-lg font-bold text-text-primary mt-1">{totalCapacity.toLocaleString()}</h3>
          </div>
          <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
            <span className="text-[10px] text-on-surface-variant font-bold uppercase font-mono block">Potential Revenue</span>
            <h3 className="text-lg font-bold text-secondary mt-1">${potentialRevenue.toLocaleString()}</h3>
          </div>
          <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
            <span className="text-[10px] text-on-surface-variant font-bold uppercase font-mono block">Avg. Ticket Price</span>
            <h3 className="text-lg font-bold text-text-primary mt-1">${avgPrice.toFixed(0)}</h3>
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-6">
          <h3 className="text-base font-bold text-text-primary border-b border-border-subtle pb-3">Ticket Configurations</h3>

          {tiers.length === 0 ? (
            <p className="text-xs text-on-surface-variant font-mono">No ticket tiers created yet. Define at least one tier.</p>
          ) : (
            <div className="space-y-3">
              {tiers.map((t) => {
                const isExpanded = expandedId === t.id;
                return (
                  <div key={t.id} className="border border-border-subtle rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center p-3 bg-surface-container-low text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-text-primary">{t.name}</h4>
                          {t.zoneName && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[8px] font-bold">
                              <MapPin className="w-2.5 h-2.5" /> {t.zoneName}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-on-surface-variant font-mono">Capacity: {t.capacity} tickets &middot; Max {t.maxPerOrder ?? '-'} / order</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-text-primary">${t.price}</span>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : t.id)}
                          className="text-on-surface-variant hover:text-text-primary transition-colors p-1 cursor-pointer"
                          title="Advanced Tier Settings"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleRemove(t.id)} className="text-on-surface-variant hover:text-danger transition-colors p-1 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3 bg-white space-y-3 border-t border-border-subtle">
                        <p className="text-[10px] font-mono font-bold text-text-secondary uppercase">Advanced Tier Settings</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Max per Order</label>
                            <input type="number" value={t.maxPerOrder ?? 0} onChange={(e) => updateTier(t.id, { maxPerOrder: Number(e.target.value) })} className="w-full h-9 px-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Layout Zone</label>
                            <select
                              value={t.zoneId ?? ''}
                              onChange={(e) => {
                                const z = zones.find(zn => zn.id === e.target.value);
                                updateTier(t.id, { zoneId: z?.id, zoneName: z?.label });
                              }}
                              className="w-full h-9 px-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none cursor-pointer"
                            >
                              <option value="">General Admission</option>
                              {zones.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Sales Start</label>
                            <input type="date" value={t.salesStart ?? ''} onChange={(e) => updateTier(t.id, { salesStart: e.target.value })} className="w-full h-9 px-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Sales End</label>
                            <input type="date" value={t.salesEnd ?? ''} onChange={(e) => updateTier(t.id, { salesEnd: e.target.value })} className="w-full h-9 px-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tier Performance Preview */}
        {tiers.length > 0 && (
          <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-secondary" /> Tier Performance Preview
            </h3>
            <p className="text-[11px] text-text-secondary -mt-2">Projected revenue share if each tier sells to full capacity.</p>
            <div className="space-y-3">
              {tiers.map((t) => {
                const tierRevenue = t.price * t.capacity;
                const share = potentialRevenue > 0 ? (tierRevenue / potentialRevenue) * 100 : 0;
                return (
                  <div key={t.id} className="space-y-1 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="text-text-primary">{t.name}</span>
                      <span className="text-text-secondary font-mono text-[10px]">${tierRevenue.toLocaleString()} &middot; {share.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                      <div className="bg-secondary h-full rounded-full transition-all" style={{ width: `${share}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <form onSubmit={handleAdd} className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5"><Coins className="w-4 h-4 text-secondary" /> Add New Tier</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Tier Title</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" placeholder="e.g. VIP Front-stage" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Price ($)</label>
                <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Quantity</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Max per Order</label>
                <input type="number" value={maxPerOrder} onChange={(e) => setMaxPerOrder(Number(e.target.value))} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Layout Zone</label>
                <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none cursor-pointer">
                  <option value="">General Admission</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Sales Start</label>
                <input type="date" value={salesStart} onChange={(e) => setSalesStart(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Sales End</label>
                <input type="date" value={salesEnd} onChange={(e) => setSalesEnd(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
              </div>
            </div>
            <button type="submit" className="w-full bg-secondary hover:bg-secondary/90 text-white text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Add Tier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
