import React, { useState } from "react";
import { TicketTier } from "../../types";
import { Plus, Trash2, Layers, CheckCircle2, PackageOpen } from "lucide-react";

interface WorkspaceTicketsProps {
  ticketTiers: TicketTier[];
  onCreateTier: (tier: Omit<TicketTier, "id">) => void;
  onUpdateTier: (id: string, updated: Partial<TicketTier>) => void;
  onDeleteTier: (id: string) => void;
}

export default function WorkspaceTickets({
  ticketTiers,
  onCreateTier,
  onDeleteTier
}: WorkspaceTicketsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTierName, setNewTierName] = useState("");
  const [newTierPrice, setNewTierPrice] = useState(150);
  const [newTierCapacity, setNewTierCapacity] = useState(500);
  const [newTierSalesEnd, setNewTierSalesEnd] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTierName) return;
    onCreateTier({
      name: newTierName,
      price: newTierPrice,
      sold: 0,
      capacity: newTierCapacity,
      status: "On Sale",
      color: "#3B82F6",
      salesEnd: newTierSalesEnd || undefined,
    });
    setNewTierName("");
    setNewTierSalesEnd("");
    setShowAddForm(false);
  };

  const totalCapacity = ticketTiers.reduce((acc, t) => acc + t.capacity, 0);
  const totalSold = ticketTiers.reduce((acc, t) => acc + t.sold, 0);
  const totalRemaining = totalCapacity - totalSold;

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-text-secondary">Total Capacity</span>
            <div className="p-1.5 bg-primary/10 border border-primary/20 text-primary rounded-lg"><Layers className="w-4 h-4" /></div>
          </div>
          <h3 className="text-xl font-bold text-text-primary">{totalCapacity.toLocaleString()}</h3>
        </div>
        <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-text-secondary">Total Sold</span>
            <div className="p-1.5 bg-secondary/10 border border-secondary/20 text-secondary rounded-lg"><CheckCircle2 className="w-4 h-4" /></div>
          </div>
          <h3 className="text-xl font-bold text-text-primary">{totalSold.toLocaleString()}</h3>
        </div>
        <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-text-secondary">Remaining</span>
            <div className="p-1.5 bg-success/10 border border-success/20 text-success rounded-lg"><PackageOpen className="w-4 h-4" /></div>
          </div>
          <h3 className="text-xl font-bold text-text-primary">{totalRemaining.toLocaleString()}</h3>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-text-primary">Admission Ticket Tiers</h3>
          <p className="text-xs text-text-secondary">Configure pricing scales and strict capacity limits.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span>Add Tier</span>
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-4 bg-white border border-border-subtle rounded-xl space-y-4 max-w-md">
          <h4 className="text-xs font-bold text-text-primary">Configure New Ticket Tier</h4>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Tier Name</label>
              <input type="text" value={newTierName} onChange={(e) => setNewTierName(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" placeholder="e.g. VIP All-Access" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Price ($)</label>
                <input type="number" value={newTierPrice} onChange={(e) => setNewTierPrice(Number(e.target.value))} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Capacity</label>
                <input type="number" value={newTierCapacity} onChange={(e) => setNewTierCapacity(Number(e.target.value))} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Sales Deadline</label>
              <input type="date" value={newTierSalesEnd} onChange={(e) => setNewTierSalesEnd(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
            </div>
            <button type="submit" className="w-full bg-secondary hover:bg-secondary/90 text-white text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer">Create Tier</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ticketTiers.map((tier) => {
          const remaining = tier.capacity - tier.sold;
          const revenue = tier.sold * tier.price;
          return (
            <div key={tier.id} className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold text-white" style={{ backgroundColor: tier.color || "#3B82F6" }}>
                    {tier.status || "On Sale"}
                  </span>
                  <button onClick={() => onDeleteTier(tier.id)} className="text-on-surface-variant hover:text-danger p-1 rounded transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h4 className="text-base font-bold text-text-primary">{tier.name}</h4>
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">Allocation limit: {tier.capacity}</p>
                </div>

                <div className="pt-2 border-t border-surface-container-low">
                  <span className="text-2xl font-black text-text-primary">${tier.price}</span>
                  <span className="text-[10px] text-on-surface-variant font-mono ml-1.5">/ ticket</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                  <div>
                    <span className="text-text-secondary block">Remaining</span>
                    <span className="text-text-primary font-bold">{remaining.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary block">Tier Revenue</span>
                    <span className="text-secondary font-bold">${revenue.toLocaleString()}</span>
                  </div>
                </div>

                {tier.salesEnd && (
                  <p className="text-[10px] text-on-surface-variant font-mono">Sales close: {tier.salesEnd}</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-border-subtle space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-text-secondary">Sales progress</span>
                  <span className="text-text-primary font-bold">{tier.sold} / {tier.capacity}</span>
                </div>
                <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: `${(tier.sold / tier.capacity) * 100}%` }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
