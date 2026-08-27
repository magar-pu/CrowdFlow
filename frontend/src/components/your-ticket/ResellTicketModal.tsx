"use client";

import React, { useEffect, useState } from 'react';
import { Tag, AlertTriangle } from 'lucide-react';
import { createResaleListing } from '@/lib/api/resale';
import Modal from '@/components/ui/Modal';

interface ResellTicketModalProps {
  open: boolean;
  onClose: (success?: boolean, listingId?: string) => void;
  ticketId: string;
  originalPrice: number;
}

export default function ResellTicketModal({ open, onClose, ticketId, originalPrice }: ResellTicketModalProps) {
  const [resalePrice, setResalePrice] = useState(originalPrice.toLocaleString('id-ID'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Stays mounted across open/close cycles (for the close transition), so
  // reset the form here on each open instead of relying on a fresh mount.
  useEffect(() => {
    if (open) {
      setResalePrice(originalPrice.toLocaleString('id-ID'));
      setErrorMsg("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleResell = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const priceNum = parseFloat(resalePrice.replace(/\./g, ''));
    
    if (priceNum < originalPrice) {
      setErrorMsg(`Resale price cannot be lower than the original price of Rp${originalPrice.toLocaleString('id-ID')}.`);
      return;
    }
    
    setIsSubmitting(true);
    const res = await createResaleListing({
      ticket_id: ticketId,
      listing_price: priceNum,
    });
    setIsSubmitting(false);

    if (!res.success || !res.data) {
      setErrorMsg(res.error?.message || "Failed to create resale listing.");
      return;
    }
    
    alert("Ticket listed for resale successfully!");
    onClose(true, res.data.listing_id); // Pass true and the new listing_id
  };

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      title="Resell Your Ticket"
      description="List your ticket on the Verified Marketplace."
      icon={<Tag className="h-4 w-4" />}
    >
        {/* IMPORTANT DISCLAIMER HERE */}
        <div className="mb-6 rounded-lg bg-warning/10 p-3 border border-warning/20 flex gap-3 items-start">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-text-primary">
            <strong>Important:</strong> To ensure user safety and prevent fraud, 
            require all resale transactions to be completed within the platform.
            Taking transactions off-platform violates our terms of service and compromises your security.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-lg bg-error/10 p-3 border border-error/20 flex gap-3 items-start">
            <p className="text-sm text-error font-medium">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleResell} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Resale Price (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              required
              value={resalePrice}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\./g, '');
                if (/^\d*$/.test(rawValue)) {
                  const numValue = parseInt(rawValue, 10);
                  if (!isNaN(numValue)) {
                    setResalePrice(numValue.toLocaleString('id-ID'));
                  } else {
                    setResalePrice("");
                  }
                }
              }}
              disabled={isSubmitting}
              className="h-11 w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:bg-surface-white focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-border-subtle pt-4">
            <button
              type="button"
              onClick={() => onClose()}
              disabled={isSubmitting}
              className="min-h-11 rounded-lg border border-border-subtle px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-11 items-center gap-1 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-on-primary hover:bg-primary-container cursor-pointer transition-colors disabled:opacity-50"
            >
              <span>{isSubmitting ? "Listing..." : "List for Resale"}</span>
            </button>
          </div>
        </form>
    </Modal>
  );
}
