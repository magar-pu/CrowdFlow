"use client";

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface RejectReasonModalProps {
  title: string;
  onCancel: () => void;
  onConfirm: (notes: string) => void;
}

export default function RejectReasonModal({ title, onCancel, onConfirm }: RejectReasonModalProps) {
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border-subtle bg-surface-white p-5 shadow-2xl sm:p-6">
        <button onClick={onCancel} className="absolute right-4 top-4 text-text-muted hover:text-text-primary">
          <X className="h-5 w-5" />
        </button>
        <h3 className="mb-4 pr-8 text-base font-bold text-text-primary">{title}</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!notes.trim()) return;
            onConfirm(notes.trim());
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase text-text-muted">Reason for Rejection</label>
            <textarea
              rows={3}
              required
              placeholder="Explain what the organizer needs to fix before resubmitting..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none rounded-xl border border-border-subtle bg-surface-soft px-3.5 py-2.5 text-xs text-text-primary outline-none focus:border-primary"
            />
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border-subtle pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-border-subtle px-4 py-2 text-xs text-text-secondary hover:bg-surface-soft">Cancel</button>
            <button type="submit" className="min-h-11 rounded-xl bg-danger px-4 py-2 text-xs text-white hover:bg-danger/90">Confirm Rejection</button>
          </div>
        </form>
      </div>
    </div>
  );
}
