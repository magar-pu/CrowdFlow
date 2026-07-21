"use client";

import React, { useState } from 'react';
import { X, Tag, AlertTriangle } from 'lucide-react';

interface ResellTicketModalProps {
  onClose: () => void;
  ticketId: string;
  originalPrice: number;
}

export default function ResellTicketModal({ onClose, ticketId, originalPrice }: ResellTicketModalProps) {
  const [resalePrice, setResalePrice] = useState(originalPrice.toString());

  const handleResell = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(resalePrice);
    
    if (priceNum > originalPrice) {
      alert(`Resale price cannot exceed the original price of $${originalPrice}.`);
      return;
    }
    
    // TODO: Call API to create a resale listing
    console.log("Creating resale listing for ticket", ticketId, "at price", priceNum);
    alert("Ticket listed for resale successfully!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-border-subtle bg-surface-white p-6 shadow-overlay">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1 text-text-secondary hover:bg-surface hover:text-text-primary cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 text-primary">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">Resell Your Ticket</h3>
            <p className="text-xs text-text-secondary">List your ticket on the Verified Marketplace.</p>
          </div>
        </div>

        {/* IMPORTANT DISCLAIMER HERE */}
        <div className="mb-6 rounded-lg bg-warning/10 p-3 border border-warning/20 flex gap-3 items-start">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-text-primary">
            <strong>Important:</strong> To ensure user safety and prevent fraud, 
            require all resale transactions to be completed within the platform.
            Taking transactions off-platform violates our terms of service and compromises your security.
          </p>
        </div>

        <form onSubmit={handleResell} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Resale Price ($)</label>
            <input
              type="number"
              required
              max={originalPrice}
              value={resalePrice}
              onChange={(e) => setResalePrice(e.target.value)}
              className="h-11 w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:bg-surface-white focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1.5 text-xs text-text-secondary">
              Maximum allowed price: ${originalPrice} (Original Face Value).
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-border-subtle pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-lg border border-border-subtle px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex min-h-11 items-center gap-1 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-on-primary hover:bg-primary-container cursor-pointer transition-colors"
            >
              <span>List for Resale</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
