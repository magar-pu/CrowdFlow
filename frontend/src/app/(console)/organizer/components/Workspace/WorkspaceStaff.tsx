import React, { useState } from "react";
import { Gate } from "../../types";
import { OrganizerTicketTier } from "@/lib/api/eorganizer";
import { EventStaffMember } from "@/lib/api/eventstaff";
import { Plus, Wifi, WifiOff, Copy, Check, KeyRound, Trash2, Ban, PlayCircle, Loader2 } from "lucide-react";
import AddStaffModal from "./AddStaffModal";
import Modal from "@/components/ui/Modal";

interface WorkspaceStaffProps {
  eventId: number;
  gates: Gate[];
  tiers: OrganizerTicketTier[];
  staff: EventStaffMember[];
  onRefresh: () => void;
  onToggleStatus: (staffId: number, next: "active" | "suspended") => Promise<void>;
  onDelete: (staffId: number) => Promise<void>;
  onResetCredentials: (staffId: number) => Promise<{ email: string; password: string } | null>;
}

export default function WorkspaceStaff({
  eventId,
  gates,
  tiers,
  staff,
  onRefresh,
  onToggleStatus,
  onDelete,
  onResetCredentials,
}: WorkspaceStaffProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const gateName = (id: number) => gates.find((g) => Number(g.id) === id)?.name || `#${id}`;
  const tierName = (id: number) => tiers.find((t) => Number(t.id) === id)?.name || `#${id}`;

  const handleToggle = async (s: EventStaffMember) => {
    setBusyId(s.id);
    try {
      await onToggleStatus(s.id, s.status === "active" ? "suspended" : "active");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (s: EventStaffMember) => {
    if (!window.confirm(`Remove ${s.fullName}'s staff account? This cannot be undone.`)) return;
    setBusyId(s.id);
    try {
      await onDelete(s.id);
    } finally {
      setBusyId(null);
    }
  };

  const handleReset = async (s: EventStaffMember) => {
    setBusyId(s.id);
    try {
      const res = await onResetCredentials(s.id);
      if (res) setResetResult(res);
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyReset = () => {
    if (!resetResult) return;
    navigator.clipboard?.writeText(`Email: ${resetResult.email}\nPassword: ${resetResult.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-text-primary">Ticketman Staff</h3>
          <p className="text-xs text-text-secondary">Manage gate scanning accounts and their tier/gate access.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span>Add Staff</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {gates.map((gate) => (
          <div key={gate.id} className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-text-secondary">{gate.name}</span>
              <div className={`p-1.5 rounded-lg border ${gate.status === "online" ? "bg-success/10 border-success/20 text-success" : "bg-surface-container border-border-subtle text-on-surface-variant"}`}>
                {gate.status === "online" ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              </div>
            </div>
            <h3 className="text-xl font-bold text-text-primary">{gate.scans.toLocaleString()}</h3>
            <p className="text-[10px] text-text-secondary font-mono mt-1">scans today &middot; {gate.staffCount} staff</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-border-subtle rounded-xl overflow-hidden soft-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-border-subtle">
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Name</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Email</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Gates</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Tiers</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Status</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Valid Until</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-sans text-xs text-text-primary">
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-container-low transition-colors">
                  <td className="p-4 font-bold text-text-primary">{s.fullName}</td>
                  <td className="p-4 text-text-secondary">{s.email}</td>
                  <td className="p-4 text-text-secondary">
                    {s.gateIds.length === 0 ? "All gates" : s.gateIds.map(gateName).join(", ")}
                  </td>
                  <td className="p-4 text-text-secondary">
                    {s.tierIds.length === 0 ? "All tiers" : s.tierIds.map(tierName).join(", ")}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded font-mono text-[8px] font-bold ${
                      s.status === "active" ? "bg-success/10 text-success border border-success/20" : "bg-surface-container text-text-secondary border border-border-subtle"
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-[10px] text-text-secondary">
                    {new Date(s.validUntil).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {busyId === s.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-text-secondary" />
                      ) : (
                        <>
                          <button
                            onClick={() => handleToggle(s)}
                            title={s.status === "active" ? "Suspend access" : "Reactivate access"}
                            className="bg-surface-container hover:bg-surface-container-high text-text-primary border border-border-subtle font-sans text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1"
                          >
                            {s.status === "active" ? <Ban className="w-3 h-3" /> : <PlayCircle className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => handleReset(s)}
                            title="Reset credentials"
                            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-sans text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <KeyRound className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            title="Delete staff account"
                            className="bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 font-sans text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-on-surface-variant">
                    No ticketman staff yet. Add one to start scanning tickets at this event.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddStaffModal
        open={showAddModal}
        eventId={eventId}
        gates={gates}
        tiers={tiers}
        onClose={() => setShowAddModal(false)}
        onCreated={onRefresh}
      />

      <Modal open={!!resetResult} onClose={() => setResetResult(null)} title="Credentials Reset" size="sm">
        {resetResult && (
          <div className="text-center space-y-3">
            <p className="text-xs font-bold text-text-primary">Save this password now — it won't be shown again.</p>
            <div className="bg-surface-container-low border border-border-subtle rounded-lg p-3 text-left space-y-1.5 font-mono text-xs">
              <div><span className="text-text-secondary">Email:</span> <strong>{resetResult.email}</strong></div>
              <div><span className="text-text-secondary">Password:</span> <strong>{resetResult.password}</strong></div>
            </div>
            <button
              onClick={handleCopyReset}
              className="w-full flex items-center justify-center gap-1.5 border border-border-subtle hover:bg-surface-container-low text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy Credentials"}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
