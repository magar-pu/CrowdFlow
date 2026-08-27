import React, { useEffect, useState } from "react";
import { TicketTier } from "../../types";
import { Ticket, Loader2, AlertCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";

export interface TierFormValues {
  name: string;
  price: number;
  capacity: number;
  maxPerOrder: number;
  salesStart: string;
  salesEnd: string;
  description: string;
}

export interface TierSubmitResult {
  success: boolean;
  error?: string;
}

interface TierFormModalProps {
  open: boolean;
  tier?: TicketTier;
  onClose: () => void;
  onSubmit: (values: TierFormValues) => Promise<TierSubmitResult>;
}

function toFormValues(tier?: TicketTier): TierFormValues {
  return {
    name: tier?.name ?? "",
    price: tier?.price ?? 150,
    capacity: tier?.capacity ?? 500,
    maxPerOrder: tier?.maxPerOrder ?? 10,
    salesStart: tier?.salesStart ?? "",
    salesEnd: tier?.salesEnd ?? "",
    description: tier?.description ?? "",
  };
}

function validate(values: TierFormValues, tier: TicketTier | undefined): string | null {
  if (!values.name.trim()) return "Tier name is required.";
  if (values.price < 0) return "Price cannot be negative.";
  if (values.capacity <= 0) return "Capacity must be greater than zero.";
  if (tier && values.capacity < tier.sold) {
    return `Capacity can't be lower than the ${tier.sold} ticket${tier.sold === 1 ? "" : "s"} already sold.`;
  }
  if (values.salesStart && values.salesEnd && values.salesEnd < values.salesStart) {
    return "Sales close date must be after the sales open date.";
  }
  return null;
}

export default function TierFormModal({ open, tier, onClose, onSubmit }: TierFormModalProps) {
  const isEdit = Boolean(tier);
  const [values, setValues] = useState<TierFormValues>(() => toFormValues(tier));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The component now stays mounted across open/close cycles (so the close
  // transition has something to animate), so the form has to be reset here
  // on each open instead of relying on a fresh mount.
  useEffect(() => {
    if (open) {
      setValues(toFormValues(tier));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof TierFormValues>(key: K, value: TierFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate(values, tier);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await onSubmit(values);
    setSubmitting(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error ?? "Something went wrong. Please try again.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={isEdit ? "Edit Ticket Tier" : "Configure New Ticket Tier"}
      icon={<Ticket className="w-4 h-4" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="space-y-1.5">
          <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Tier Name</label>
          <input
            type="text"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={submitting}
            className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none disabled:opacity-60"
            placeholder="e.g. VIP All-Access"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Price ($)</label>
            <input type="number" value={values.price} onChange={(e) => set("price", Number(e.target.value))} disabled={submitting} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none disabled:opacity-60" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Capacity</label>
            <input type="number" value={values.capacity} onChange={(e) => set("capacity", Number(e.target.value))} disabled={submitting} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none disabled:opacity-60" />
            {tier && tier.sold > 0 && (
              <p className="text-[9px] text-on-surface-variant font-mono">{tier.sold} already sold</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Sales Opens</label>
            <input type="date" value={values.salesStart} onChange={(e) => set("salesStart", e.target.value)} disabled={submitting} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none disabled:opacity-60" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Sales Closes</label>
            <input type="date" value={values.salesEnd} onChange={(e) => set("salesEnd", e.target.value)} disabled={submitting} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none disabled:opacity-60" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Max Per Order</label>
          <input type="number" value={values.maxPerOrder} onChange={(e) => set("maxPerOrder", Number(e.target.value))} disabled={submitting} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none disabled:opacity-60" />
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Description</label>
          <textarea
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            disabled={submitting}
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-xs bg-white outline-none resize-none disabled:opacity-60"
            placeholder="Optional details shown to buyers"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] font-medium text-danger">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 bg-surface-container hover:bg-surface-container-low text-text-secondary text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Tier"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
