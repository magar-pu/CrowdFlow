import React, { useState } from "react";
import { TicketTier } from "../../types";
import { Plus, Trash2, Layers, CheckCircle2, Pencil } from "lucide-react";
import TierFormModal, { TierFormValues, TierSubmitResult } from "./TierFormModal";

interface WorkspaceTicketsProps {
  ticketTiers: TicketTier[];
  onCreateTier: (tier: Omit<TicketTier, "id">) => Promise<TierSubmitResult>;
  onUpdateTier: (id: string, updated: Partial<TicketTier>) => Promise<TierSubmitResult>;
  onDeleteTier: (id: string) => void;
}

export default function WorkspaceTickets({
  ticketTiers,
  onCreateTier,
  onUpdateTier,
  onDeleteTier
}: WorkspaceTicketsProps) {
  const [modalMode, setModalMode] = useState<"none" | "create" | "edit">("none");
  const [editingTier, setEditingTier] = useState<TicketTier | null>(null);

  const openCreate = () => {
    setEditingTier(null);
    setModalMode("create");
  };

  const openEdit = (tier: TicketTier) => {
    setEditingTier(tier);
    setModalMode("edit");
  };

  const closeModal = () => {
    // Deliberately leave editingTier as-is: TierFormModal stays mounted
    // during its close transition, and nulling the tier here would flip its
    // "Edit"/"Create" title mid-fade. It's overwritten on the next open.
    setModalMode("none");
  };

  const handleSubmit = (values: TierFormValues): Promise<TierSubmitResult> => {
    if (modalMode === "edit" && editingTier) {
      // The backend does a full-row update, not a merge — every editable
      // field must be sent even though only some changed, or the untouched
      // ones get overwritten with the form's carried-over values.
      return onUpdateTier(editingTier.id, values);
    }
    return onCreateTier({
      ...values,
      sold: 0,
      status: "On Sale",
      color: "#3B82F6",
    });
  };

  // No "remaining" here: for a seated event a tier's real capacity is however
  // many seats are painted with it in the Venue tab, not this figure. Showing a
  // headroom number derived from the manual allocation limit would contradict
  // the seat map whenever the two disagree.
  const totalCapacity = ticketTiers.reduce((acc, t) => acc + t.capacity, 0);
  const totalSold = ticketTiers.reduce((acc, t) => acc + t.sold, 0);

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-text-primary">Admission Ticket Tiers</h3>
          <p className="text-xs text-text-secondary">Configure pricing scales and strict capacity limits.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span>Add Tier</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ticketTiers.map((tier) => {
          const revenue = tier.sold * tier.price;
          return (
            <div key={tier.id} className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold text-white" style={{ backgroundColor: tier.color || "#3B82F6" }}>
                    {tier.status || "On Sale"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(tier)} className="text-on-surface-variant hover:text-primary p-1 rounded transition-colors cursor-pointer">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDeleteTier(tier.id)} className="text-on-surface-variant hover:text-danger p-1 rounded transition-colors cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-bold text-text-primary">{tier.name}</h4>
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">Allocation limit: {tier.capacity}</p>
                </div>

                <div className="pt-2 border-t border-surface-container-low">
                  <span className="text-2xl font-black text-text-primary">${tier.price}</span>
                  <span className="text-[10px] text-on-surface-variant font-mono ml-1.5">/ ticket</span>
                </div>

                <div className="text-[10px] font-mono">
                  <span className="text-text-secondary block">Tier Revenue</span>
                  <span className="text-secondary font-bold">${revenue.toLocaleString()}</span>
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

      <TierFormModal
        open={modalMode !== "none"}
        tier={editingTier ?? undefined}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
