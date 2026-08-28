"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Send,
  Check,
  X,
  Trash2,
  Pencil,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CalendarCheck,
} from "lucide-react";
import {
  Delegation,
  DelegationScope,
  DelegationStatus,
  listOwnerDelegations,
  listReceivedDelegations,
  inviteCoOrganizer,
  requestDelegation,
  editDelegationScope,
  approveDelegation,
  declineDelegation,
  revokeDelegation,
} from "@/lib/api/delegations";
import { listOrganizerEvents, OrganizerEvent } from "@/lib/api/eorganizer";
import Modal from "@/components/ui/Modal";

type Tab = "granted" | "received";

// ---- Small presentational helpers ----

const STATUS_STYLES: Record<DelegationStatus, string> = {
  active: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  declined: "bg-danger/10 text-danger",
  revoked: "bg-surface-container text-on-surface-variant",
};

function StatusBadge({ status }: { status: DelegationStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function ScopeSummary({ delegation }: { delegation: Delegation }) {
  if (delegation.scope === "all") {
    return <span className="text-xs text-text-secondary">All events (incl. future)</span>;
  }
  const names = delegation.events.map((e) => e.name);
  return (
    <span className="text-xs text-text-secondary" title={names.join(", ")}>
      {names.length} event{names.length === 1 ? "" : "s"}
      {names.length > 0 && `: ${names.slice(0, 2).join(", ")}${names.length > 2 ? "…" : ""}`}
    </span>
  );
}

// ---- Main view ----

export default function CoOrganizersView() {
  const [tab, setTab] = useState<Tab>("granted");
  const [granted, setGranted] = useState<Delegation[]>([]);
  const [received, setReceived] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Delegation | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [ownerRes, receivedRes] = await Promise.all([
      listOwnerDelegations(),
      listReceivedDelegations(),
    ]);
    if (ownerRes.success && ownerRes.data) setGranted(ownerRes.data);
    if (receivedRes.success && receivedRes.data) setReceived(receivedRes.data);
    if (!ownerRes.success && !receivedRes.success) {
      setError(ownerRes.error?.message ?? "Failed to load co-organizers.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const notify = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    window.setTimeout(() => setFeedback(null), 3500);
  };

  const runAction = async (
    id: number,
    action: () => Promise<{ success: boolean; error?: { message: string } }>,
    successMsg: string
  ) => {
    setBusyId(id);
    const res = await action();
    setBusyId(null);
    if (res.success) {
      notify("success", successMsg);
      await refresh();
    } else {
      notify("error", res.error?.message ?? "Action failed.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            {/* Matches every other top-level organizer view (Orders, Finance,
                Reports, Attendees); this page was the only one at text-lg. */}
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Co-organizers</h1>
            <p className="text-sm text-text-secondary">
              Delegate management of your events to other verified organizers, or request access to theirs.
            </p>
          </div>
        </div>
        <button
          onClick={() => (tab === "granted" ? setInviteOpen(true) : setRequestOpen(true))}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
        >
          {tab === "granted" ? <UserPlus className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          {tab === "granted" ? "Invite co-organizer" : "Request access"}
        </button>
      </header>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-medium ${
            feedback.type === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {feedback.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {feedback.message}
        </div>
      )}

      {/* Tabs */}
      <div className="inline-flex rounded-lg border border-border-subtle bg-surface-container-low p-1">
        {(["granted", "received"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              tab === t ? "bg-primary text-on-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t === "granted" ? "My co-organizers" : "Delegated to me"}
          </button>
        ))}
      </div>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : tab === "granted" ? (
        <GrantedList
          items={granted}
          busyId={busyId}
          onApprove={(id) => runAction(id, () => approveDelegation(id), "Request approved.")}
          onDecline={(id) => runAction(id, () => declineDelegation(id), "Request declined.")}
          onRevoke={(id) => runAction(id, () => revokeDelegation(id), "Access revoked.")}
          onEdit={(d) => setEditTarget(d)}
        />
      ) : (
        <ReceivedList items={received} />
      )}

      <DelegationFormModal
        open={inviteOpen}
        mode="invite"
        onClose={() => setInviteOpen(false)}
        onDone={(msg) => {
          setInviteOpen(false);
          notify("success", msg);
          refresh();
        }}
      />
      <DelegationFormModal
        open={requestOpen}
        mode="request"
        onClose={() => setRequestOpen(false)}
        onDone={(msg) => {
          setRequestOpen(false);
          notify("success", msg);
          refresh();
        }}
      />
      <DelegationFormModal
        open={!!editTarget}
        mode="edit"
        target={editTarget ?? undefined}
        onClose={() => setEditTarget(null)}
        onDone={(msg) => {
          setEditTarget(null);
          notify("success", msg);
          refresh();
        }}
      />
    </div>
  );
}

// ---- Owner (granted) list ----

function GrantedList({
  items,
  busyId,
  onApprove,
  onDecline,
  onRevoke,
  onEdit,
}: {
  items: Delegation[];
  busyId: number | null;
  onApprove: (id: number) => void;
  onDecline: (id: number) => void;
  onRevoke: (id: number) => void;
  onEdit: (d: Delegation) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<UserPlus className="h-6 w-6" />}
        title="No co-organizers yet"
        description="Invite a verified organizer to help manage your events. They can never receive payouts."
      />
    );
  }
  return (
    <div className="space-y-3">
      {items.map((d) => {
        const isBusy = busyId === d.id;
        const requestedByDelegate = d.requested_by === d.delegate_id;
        return (
          <div
            key={d.id}
            className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-text-primary">{d.delegate_name}</p>
                <StatusBadge status={d.status} />
              </div>
              <p className="truncate text-xs text-text-secondary">{d.delegate_email}</p>
              <div className="mt-1">
                <ScopeSummary delegation={d} />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {isBusy && <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />}
              {d.status === "pending" && requestedByDelegate && (
                <>
                  <button
                    onClick={() => onApprove(d.id)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-success/90 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => onDecline(d.id)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-container-low disabled:opacity-50 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" /> Decline
                  </button>
                </>
              )}
              {d.status === "active" && (
                <>
                  <button
                    onClick={() => onEdit(d)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-container-low disabled:opacity-50 cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Scope
                  </button>
                  <button
                    onClick={() => onRevoke(d.id)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Revoke
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Delegate (received) list ----

function ReceivedList({ items }: { items: Delegation[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CalendarCheck className="h-6 w-6" />}
        title="No delegated events"
        description="When an organizer delegates events to you — or approves your request — they appear here."
      />
    );
  }
  return (
    <div className="space-y-3">
      {items.map((d) => (
        <div key={d.id} className="rounded-xl border border-border-subtle bg-surface-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">{d.owner_name}</p>
              <p className="truncate text-xs text-text-secondary">{d.owner_email}</p>
            </div>
            <StatusBadge status={d.status} />
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-text-secondary" />
            <ScopeSummary delegation={d} />
          </div>
          {d.status === "pending" && (
            <p className="mt-2 text-xs text-warning">Awaiting the owner&apos;s approval.</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ---- Shared form modal (invite / request / edit) ----

function DelegationFormModal({
  open,
  mode,
  target,
  onClose,
  onDone,
}: {
  open: boolean;
  mode: "invite" | "request" | "edit";
  target?: Delegation;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<DelegationScope>(target?.scope ?? "all");
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<number[]>(
    target?.events.map((e) => e.event_id) ?? []
  );
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Stays mounted across open/close cycles (for the close transition), so
  // reset the form here on each open instead of relying on a fresh mount.
  useEffect(() => {
    if (open) {
      setEmail("");
      setScope(target?.scope ?? "all");
      setNote("");
      setSelected(target?.events.map((e) => e.event_id) ?? []);
      setFormError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // The specific-scope event picker only applies to the owner's own events
  // (invite/edit). A delegate requesting access cannot enumerate them, so
  // request mode is scope 'all' only.
  const showEventPicker = mode !== "request" && scope === "specific";

  useEffect(() => {
    if (mode === "request") return;
    listOrganizerEvents().then((res) => {
      if (res.success && res.data) setEvents(res.data);
    });
  }, [mode]);

  const toggleEvent = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const title =
    mode === "invite"
      ? "Invite co-organizer"
      : mode === "request"
      ? "Request access"
      : "Edit delegation scope";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (mode !== "edit" && !email.trim()) {
      setFormError(mode === "invite" ? "Enter the co-organizer's email." : "Enter the owner's email.");
      return;
    }
    if (scope === "specific" && mode !== "request" && selected.length === 0) {
      setFormError("Select at least one event.");
      return;
    }

    setSubmitting(true);
    const eventIds = scope === "specific" ? selected : undefined;
    let res;
    if (mode === "invite") {
      res = await inviteCoOrganizer({ delegate_email: email.trim(), scope, event_ids: eventIds, note });
    } else if (mode === "request") {
      res = await requestDelegation({ owner_email: email.trim(), scope: "all", note });
    } else {
      res = await editDelegationScope(target!.id, { scope, event_ids: eventIds });
    }
    setSubmitting(false);

    if (res.success) {
      onDone(
        mode === "invite"
          ? "Co-organizer added."
          : mode === "request"
          ? "Request sent for approval."
          : "Scope updated."
      );
    } else {
      setFormError(res.error?.message ?? "Something went wrong.");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} contentClassName="">
        <form onSubmit={handleSubmit} className="space-y-4 p-5 text-left">
          {mode !== "edit" && (
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono font-bold uppercase text-text-secondary">
                {mode === "invite" ? "Co-organizer email" : "Owner email"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="h-9 w-full rounded-lg border border-border-subtle bg-white px-3 text-xs outline-none"
              />
              {mode === "invite" && (
                <p className="text-[10px] text-on-surface-variant">
                  Must be a verified Event Organizer. They gain management access only — never payouts.
                </p>
              )}
            </div>
          )}

          {mode !== "request" && (
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono font-bold uppercase text-text-secondary">Scope</label>
              <div className="inline-flex w-full gap-1 rounded-lg border border-border-subtle bg-surface-container-low p-1">
                {(["all", "specific"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      scope === s ? "bg-primary text-on-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {s === "all" ? "All events (incl. future)" : "Specific events"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showEventPicker && (
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono font-bold uppercase text-text-secondary">Events</label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border-subtle p-1">
                {events.length === 0 ? (
                  <p className="p-2 text-xs text-on-surface-variant">No events found.</p>
                ) : (
                  events.map((ev) => {
                    const id = parseInt(ev.id, 10);
                    return (
                      <label
                        key={ev.id}
                        className="flex cursor-pointer select-none items-center gap-2 rounded-md p-2 text-xs text-text-primary hover:bg-surface-container-low"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(id)}
                          onChange={() => toggleEvent(id)}
                          className="h-3.5 w-3.5 cursor-pointer accent-primary"
                        />
                        <span className="truncate">{ev.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {mode !== "edit" && (
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono font-bold uppercase text-text-secondary">Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-xs outline-none"
                placeholder="Add a short message…"
              />
            </div>
          )}

          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-xs font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mode === "invite" ? "Send invite" : mode === "request" ? "Send request" : "Save scope"}
          </button>
        </form>
    </Modal>
  );
}

// ---- States ----

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl border border-border-subtle bg-surface-container-low" />
      ))}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface-white px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-text-secondary">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-text-secondary">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-danger/30 bg-danger/5 px-6 py-12 text-center">
      <AlertCircle className="mb-3 h-8 w-8 text-danger" />
      <p className="text-sm font-medium text-text-primary">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 cursor-pointer rounded-lg border border-border-subtle px-4 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-container-low"
      >
        Retry
      </button>
    </div>
  );
}
