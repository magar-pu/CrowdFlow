import React, { useState } from "react";
import { TicketTier } from "../../types";
import { Plus, Trash2, Layers, CheckCircle2, DollarSign } from "lucide-react";
import type { EventSeating, TierSeating } from "@/lib/api/eorganizer";
import { formatIDR } from "@/lib/pricing";

interface WorkspaceTicketsProps {
  ticketTiers: TicketTier[];
  /** Seat-map figures. null when no layout is bound to this event yet. */
  seating: EventSeating | null;
  seatingLoading?: boolean;
  onCreateTier: (tier: Omit<TicketTier, "id">) => void;
  onUpdateTier: (id: string, updated: Partial<TicketTier>) => void;
  onDeleteTier: (id: string) => void;
}

export default function WorkspaceTickets({
  ticketTiers,
  seating,
  seatingLoading = false,
  onCreateTier,
  onDeleteTier
}: WorkspaceTicketsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTierName, setNewTierName] = useState("");
  const [newTierPrice, setNewTierPrice] = useState(150000);
  const [newTierCapacity, setNewTierCapacity] = useState(500);
  const [newTierSalesEnd, setNewTierSalesEnd] = useState("");
  // Per-order cap (ticket_tiers.max_ticket_per_user). 4 is the column default.
  const [newTierMaxPerOrder, setNewTierMaxPerOrder] = useState(4);

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
      maxPerOrder: newTierMaxPerOrder,
      salesEnd: newTierSalesEnd || undefined,
    });
    setNewTierName("");
    setNewTierSalesEnd("");
    setNewTierMaxPerOrder(4);
    setShowAddForm(false);
  };

  const totalSold = ticketTiers.reduce((acc, t) => acc + t.sold, 0);
  const grossRevenue = ticketTiers.reduce((acc, t) => acc + t.sold * t.price, 0);

  // Real capacity comes from the seat map, not from the tiers: a seated event
  // sells however many seats are painted with a tier in the Venue tab. Summing
  // the tiers' allocation limits produced a number that contradicted the seat
  // map whenever the two disagreed, which is why that tile is gone.
  const totalSeats = seating?.total_seats ?? 0;
  const untieredSeats = seating?.untiered_seats ?? 0;
  const pricedSeats = Math.max(totalSeats - untieredSeats, 0);
  const hasSeatMap = totalSeats > 0;

  // Per-tier seat allocation, keyed by tier id. A tier that appears here has seats
  // painted with it in the Venue tab, which makes it ASSIGNED SEATING: the backend
  // sells it by seat id and never consults allocation_limit
  // (booking/service.go -> IsAssignedSeating). A tier absent from this map is
  // general admission, where allocation_limit IS the stock. The card shows
  // whichever number actually governs that tier.
  const seatsByTier = new Map<number, TierSeating>();
  for (const t of seating?.tiers ?? []) {
    seatsByTier.set(t.ticket_tier_id, t);
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-text-secondary">Seats Priced</span>
            <div className="p-1.5 bg-primary/10 border border-primary/20 text-primary rounded-lg"><Layers className="w-4 h-4" /></div>
          </div>
          {seatingLoading ? (
            <div className="h-7 w-24 animate-pulse rounded bg-surface-container-low" />
          ) : hasSeatMap ? (
            <>
              <h3 className="text-xl font-bold text-text-primary">
                {pricedSeats.toLocaleString()}
                <span className="text-sm font-semibold text-text-secondary"> / {totalSeats.toLocaleString()}</span>
              </h3>
              {/* Unpriced seats are exactly what blocks submission
                  (422 SEATING_INCOMPLETE), so they are worth naming here. */}
              <p className={`text-[10px] font-mono mt-1 ${untieredSeats > 0 ? "text-amber-600 font-bold" : "text-text-secondary"}`}>
                {untieredSeats > 0
                  ? `${untieredSeats.toLocaleString()} seat${untieredSeats === 1 ? "" : "s"} unpriced`
                  : "All seats priced"}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-text-primary">—</h3>
              <p className="text-[10px] font-mono text-text-secondary mt-1">No seat map yet</p>
            </>
          )}
        </div>
        <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-text-secondary">Total Sold</span>
            <div className="p-1.5 bg-secondary/10 border border-secondary/20 text-secondary rounded-lg"><CheckCircle2 className="w-4 h-4" /></div>
          </div>
          <h3 className="text-xl font-bold text-text-primary">{totalSold.toLocaleString()}</h3>
          <p className="text-[10px] font-mono text-text-secondary mt-1">
            across {ticketTiers.length} tier{ticketTiers.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-text-secondary">Gross Revenue</span>
            <div className="p-1.5 bg-success/10 border border-success/20 text-success rounded-lg"><DollarSign className="w-4 h-4" /></div>
          </div>
          <h3 className="text-xl font-bold text-text-primary">{formatIDR(grossRevenue)}</h3>
          <p className="text-[10px] font-mono text-text-secondary mt-1">from tier sales</p>
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
                <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Price (Rp)</label>
                <input type="number" value={newTierPrice} onChange={(e) => setNewTierPrice(Number(e.target.value))} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Capacity</label>
                <input type="number" value={newTierCapacity} onChange={(e) => setNewTierCapacity(Number(e.target.value))} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Sales Deadline</label>
                <input type="date" value={newTierSalesEnd} onChange={(e) => setNewTierSalesEnd(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Max Per Order</label>
                <input
                  type="number"
                  min={1}
                  value={newTierMaxPerOrder}
                  onChange={(e) => setNewTierMaxPerOrder(Number(e.target.value))}
                  className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none"
                />
              </div>
            </div>
            <p className="text-[10px] text-text-secondary">
              Buyers cannot put more than <strong>{newTierMaxPerOrder > 0 ? newTierMaxPerOrder : 4}</strong> of this
              ticket in a single order.
            </p>
            <button type="submit" className="w-full bg-secondary hover:bg-secondary/90 text-white text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer">Create Tier</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ticketTiers.map((tier) => {
          const revenue = tier.sold * tier.price;
          const seats = seatsByTier.get(Number(tier.id));
          // Seated tiers are governed by the seat map; GA tiers by allocation_limit.
          const stockTotal = seats ? seats.seat_count : tier.capacity;
          const stockSold = seats ? seats.sold : tier.sold;
          const soldPct = stockTotal > 0 ? Math.min(100, (stockSold / stockTotal) * 100) : 0;
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-text-primary">{tier.name}</h4>
                    <span className={`px-1.5 py-0.5 rounded font-mono text-[8px] font-bold uppercase tracking-wider border ${
                      seats
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-surface-container text-text-secondary border-border-subtle"
                    }`}>
                      {seats ? "Assigned seating" : "General admission"}
                    </span>
                  </div>
                  {seats ? (
                    <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                      Seats allocated: {seats.seat_count.toLocaleString()}
                      {seats.blocked > 0 && (
                        <span className="text-amber-600"> · {seats.blocked.toLocaleString()} blocked</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-on-surface-variant font-mono mt-0.5">Allocation limit: {tier.capacity.toLocaleString()}</p>
                  )}
                  {tier.maxPerOrder && tier.maxPerOrder > 0 ? (
                    <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                      Max {tier.maxPerOrder.toLocaleString()} per order
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 font-mono mt-0.5">No per-order limit</p>
                  )}
                </div>

                <div className="pt-2 border-t border-surface-container-low">
                  <span className="text-2xl font-black text-text-primary">{formatIDR(tier.price)}</span>
                  <span className="text-[10px] text-on-surface-variant font-mono ml-1.5">/ ticket</span>
                </div>

                <div className="text-[10px] font-mono">
                  <span className="text-text-secondary block">Tier Revenue</span>
                  <span className="text-secondary font-bold">{formatIDR(revenue)}</span>
                </div>

                {tier.salesEnd && (
                  <p className="text-[10px] text-on-surface-variant font-mono">Sales close: {tier.salesEnd}</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-border-subtle space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-text-secondary">
                    {seats ? "Seats sold" : "Sales progress"}
                  </span>
                  <span className="text-text-primary font-bold">
                    {stockSold.toLocaleString()} / {stockTotal.toLocaleString()}
                  </span>
                </div>
                {/* Guarded: a seated tier with no seats painted yet, or a GA tier
                    saved with capacity 0, made this width NaN%. */}
                <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: `${soldPct}%` }}></div>
                </div>
                {seats && seats.available > 0 && (
                  <p className="text-[10px] font-mono text-text-secondary">
                    {seats.available.toLocaleString()} still available
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
