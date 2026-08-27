"use client";

import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ApiResponse } from '@/types/admin';
import Modal from '@/components/ui/Modal';

interface RejectReasonModalProps {
  open: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: (notes: string) => Promise<ApiResponse<void>>;
}

export default function RejectReasonModal({ open, title, onCancel, onConfirm }: RejectReasonModalProps) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stays mounted across open/close cycles (for the close transition), so
  // reset the form here on each open instead of relying on a fresh mount.
  useEffect(() => {
    if (open) {
      setNotes('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;
    setError(null);
    setSubmitting(true);
    const res = await onConfirm(notes.trim());
    setSubmitting(false);
    if (!res.success) {
      setError(res.error?.message ?? 'Failed to submit rejection. Please try again.');
    }
  };

  return (
    <Modal open={open} onClose={submitting ? undefined : onCancel} title={title}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase text-text-muted">Reason for Rejection</label>
            <textarea
              rows={3}
              required
              placeholder="Explain what the organizer needs to fix before resubmitting..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              className="w-full resize-none rounded-xl border border-border-subtle bg-surface-soft px-3.5 py-2.5 text-xs text-text-primary outline-none focus:border-primary disabled:opacity-60"
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] font-medium text-danger">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border-subtle pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} disabled={submitting} className="min-h-11 rounded-xl border border-border-subtle px-4 py-2 text-xs text-text-secondary hover:bg-surface-soft disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={submitting} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-danger px-4 py-2 text-xs text-white hover:bg-danger/90 disabled:opacity-60">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm Rejection
            </button>
          </div>
        </form>
    </Modal>
  );
}
