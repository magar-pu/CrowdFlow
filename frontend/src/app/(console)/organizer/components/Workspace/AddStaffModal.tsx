import React, { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { Copy, Check, Loader2, AlertCircle, KeyRound } from "lucide-react";
import { Gate } from "../../types";
import { OrganizerTicketTier } from "@/lib/api/eorganizer";
import { createEventStaff, CreateStaffResponse } from "@/lib/api/eventstaff";

interface AddStaffModalProps {
  open: boolean;
  eventId: number;
  gates: Gate[];
  tiers: OrganizerTicketTier[];
  onClose: () => void;
  onCreated: () => void;
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AddStaffModal({ open, eventId, gates, tiers, onClose, onCreated }: AddStaffModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [gateIds, setGateIds] = useState<number[]>([]);
  const [tierIds, setTierIds] = useState<number[]>([]);
  const [validFrom, setValidFrom] = useState(() => toLocalInputValue(new Date()));
  const [validUntil, setValidUntil] = useState(() => toLocalInputValue(new Date(Date.now() + 24 * 3600 * 1000)));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateStaffResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName("");
      setEmail("");
      setGateIds([]);
      setTierIds([]);
      setValidFrom(toLocalInputValue(new Date()));
      setValidUntil(toLocalInputValue(new Date(Date.now() + 24 * 3600 * 1000)));
      setError(null);
      setResult(null);
    }
  }, [open]);

  const toggleGate = (id: number) => {
    setGateIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };
  const toggleTier = (id: number) => {
    setTierIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await createEventStaff(eventId, {
        fullName: fullName.trim(),
        email: email.trim(),
        gateIds,
        tierIds,
        validFrom: new Date(validFrom).toISOString(),
        validUntil: new Date(validUntil).toISOString(),
      });
      if (res.success && res.data) {
        setResult(res.data);
        onCreated();
      } else {
        setError(res.error?.message || "Failed to create staff account.");
      }
    } catch (err) {
      setError("Failed to create staff account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard?.writeText(`Event Code: ${result.eventCode}\nEmail: ${result.email}\nPassword: ${result.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal open={open} onClose={isSubmitting ? undefined : onClose} title="Add Ticketman Staff" contentClassName="">
      {!result ? (
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Staff full name"
              className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@example.com"
              className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Gate Access</label>
            <div className="grid grid-cols-2 gap-1.5">
              {gates.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-[11px] text-text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={gateIds.includes(Number(g.id))}
                    onChange={() => toggleGate(Number(g.id))}
                    className="w-3.5 h-3.5 accent-secondary cursor-pointer"
                  />
                  {g.name}
                </label>
              ))}
              {gates.length === 0 && <span className="text-[11px] text-on-surface-variant">No gates yet.</span>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Tier Access</label>
            <div className="grid grid-cols-2 gap-1.5">
              {tiers.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-[11px] text-text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={tierIds.includes(Number(t.id))}
                    onChange={() => toggleTier(Number(t.id))}
                    className="w-3.5 h-3.5 accent-secondary cursor-pointer"
                  />
                  {t.name}
                </label>
              ))}
              {tiers.length === 0 && <span className="text-[11px] text-on-surface-variant">No ticket tiers yet.</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Valid From</label>
              <input
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full h-9 px-2 border border-border-subtle rounded-lg text-[11px] bg-white outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Valid Until</label>
              <input
                type="datetime-local"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full h-9 px-2 border border-border-subtle rounded-lg text-[11px] bg-white outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] font-medium text-danger">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !fullName.trim() || !email.trim()}
            className="w-full flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 disabled:bg-surface-container disabled:text-on-surface-variant text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                <span>Create Staff Account</span>
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="p-5 space-y-3 text-center">
          <p className="text-xs font-bold text-text-primary">Account created. Save these credentials now — the password is shown only once.</p>
          <div className="bg-surface-container-low border border-border-subtle rounded-lg p-3 text-left space-y-1.5 font-mono text-xs">
            <div><span className="text-text-secondary">Event Code:</span> <strong>{result.eventCode}</strong></div>
            <div><span className="text-text-secondary">Email:</span> <strong>{result.email}</strong></div>
            <div><span className="text-text-secondary">Password:</span> <strong>{result.password}</strong></div>
          </div>
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-1.5 border border-border-subtle hover:bg-surface-container-low text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy Credentials"}
          </button>
          <button
            onClick={onClose}
            className="w-full bg-secondary hover:bg-secondary/90 text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}
