"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, UserCog } from "lucide-react";
import { Delegation, DelegationStatus } from "@/lib/api/delegations";
import { getUserDelegations, adminRevokeDelegation } from "@/lib/api/admin/delegationService";

const STATUS_STYLES: Record<DelegationStatus, string> = {
  active: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  declined: "bg-danger/10 text-danger",
  revoked: "bg-surface text-text-secondary",
};

function scopeLabel(d: Delegation): string {
  if (d.scope === "all") return "All events (incl. future)";
  return `${d.events.length} event${d.events.length === 1 ? "" : "s"}`;
}

interface UserDelegationsPanelProps {
  userId: string;
}

// Read-only Super Admin oversight of a user's co-organizer delegations, with a
// moderation revoke. Delegations are granted from the organizer console, not
// here — this panel only observes and moderates.
export default function UserDelegationsPanel({ userId }: UserDelegationsPanelProps) {
  const [owned, setOwned] = useState<Delegation[]>([]);
  const [received, setReceived] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getUserDelegations(userId);
    if (res.success && res.data) {
      setOwned(res.data.owned);
      setReceived(res.data.received);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRevoke = async (id: number) => {
    setBusyId(id);
    const res = await adminRevokeDelegation(id);
    setBusyId(null);
    if (res.success) load();
  };

  const hasAny = owned.length > 0 || received.length > 0;

  const renderRow = (d: Delegation, counterparty: string) => {
    const canRevoke = d.status === "active" || d.status === "pending";
    return (
      <div
        key={d.id}
        className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-white px-3 py-2"
      >
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-text-primary">{counterparty}</p>
          <p className="truncate text-[10px] text-text-secondary">{scopeLabel(d)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${STATUS_STYLES[d.status]}`}
          >
            {d.status}
          </span>
          {canRevoke && (
            <button
              onClick={() => handleRevoke(d.id)}
              disabled={busyId === d.id}
              title="Revoke (moderation)"
              className="rounded-md p-1 text-danger transition-colors hover:bg-danger/10 disabled:opacity-50 cursor-pointer"
            >
              {busyId === d.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <UserCog className="h-3.5 w-3.5 text-text-secondary" />
        <span className="text-[9px] font-bold uppercase tracking-wide text-text-secondary">
          Co-organizer Delegations
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface p-3 text-[11px] text-text-secondary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading delegations…
        </div>
      ) : !hasAny ? (
        <p className="rounded-lg border border-dashed border-border-subtle bg-surface p-3 text-center text-[11px] text-text-secondary">
          No co-organizer delegations.
        </p>
      ) : (
        <div className="space-y-3">
          {owned.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-text-secondary">Co-organizers granted</p>
              {owned.map((d) => renderRow(d, d.delegate_name))}
            </div>
          )}
          {received.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-text-secondary">Delegated to this user</p>
              {received.map((d) => renderRow(d, d.owner_name))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
