"use client";

import React, { useMemo, useState } from 'react';
import { Plus, X, ShieldPlus, Loader2 } from 'lucide-react';
import { ApiResponse, Event, RoleAssignment, User } from '@/types/admin';
import RoleBadge from './RoleBadge';

// The platform roles a Super Admin can grant, with their DB roles.id and
// whether the role binds to a specific event. Auditor / Gate Scanner are
// event-scoped (they require an event); Super Admin / Event Organizer are
// platform-wide. IDs mirror the seeded roles table (see admin repository).
const GRANTABLE_ROLES: { roleId: number; label: string; eventScoped: boolean }[] = [
  { roleId: 1, label: 'Super Admin', eventScoped: false },
  { roleId: 3, label: 'Event Organizer', eventScoped: false },
  { roleId: 2, label: 'Auditor', eventScoped: true },
  { roleId: 4, label: 'Gate Scanner', eventScoped: true },
];

interface UserRolesManagerProps {
  user: User;
  events: Event[];
  onGrantRole: (userId: string, roleId: number, eventId: number | null) => Promise<ApiResponse<void>>;
  onRevokeRole: (userId: string, roleId: number, eventId: number | null) => Promise<ApiResponse<void>>;
}

// Stable key for a single assignment (role + optional event scope).
function assignmentKey(a: RoleAssignment): string {
  return `${a.roleId}:${a.eventId ?? 'platform'}`;
}

export default function UserRolesManager({ user, events, onGrantRole, onRevokeRole }: UserRolesManagerProps) {
  const assignments = user.roleAssignments ?? [];

  const [adding, setAdding] = useState(false);
  const [roleId, setRoleId] = useState<number>(GRANTABLE_ROLES[0].roleId);
  const [eventId, setEventId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  // Tracks the assignment key currently being revoked, so only that row spins.
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedRole = useMemo(
    () => GRANTABLE_ROLES.find((r) => r.roleId === roleId) ?? GRANTABLE_ROLES[0],
    [roleId]
  );

  const resetForm = () => {
    setAdding(false);
    setError(null);
    setRoleId(GRANTABLE_ROLES[0].roleId);
    setEventId('');
  };

  const handleGrant = async () => {
    setError(null);
    if (selectedRole.eventScoped && !eventId) {
      setError('Pick an event for this role.');
      return;
    }
    setSubmitting(true);
    const scopedEventId = selectedRole.eventScoped ? Number(eventId) : null;
    const result = await onGrantRole(user.id, selectedRole.roleId, scopedEventId);
    setSubmitting(false);
    if (result.success) {
      resetForm();
    } else {
      setError(result.error?.message ?? 'Failed to grant role.');
    }
  };

  const handleRevoke = async (a: RoleAssignment) => {
    setError(null);
    const key = assignmentKey(a);
    setPendingKey(key);
    const result = await onRevokeRole(user.id, a.roleId, a.eventId);
    setPendingKey(null);
    if (!result.success) {
      setError(result.error?.message ?? 'Failed to revoke role.');
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-wide text-text-secondary">
          Roles &amp; Access
        </span>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-secondary/20 bg-secondary/5 px-2 py-1 text-[10px] font-bold text-secondary transition-colors hover:bg-secondary/10 cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Add role</span>
          </button>
        )}
      </div>

      {/* Current assignments (item 4: role -> event bindings) */}
      <div className="space-y-2 rounded-lg border border-border-subtle bg-surface p-3">
        {assignments.length === 0 ? (
          <p className="py-1 text-center text-[11px] text-text-secondary">
            No console roles. This user is a standard buyer.
          </p>
        ) : (
          assignments.map((a) => {
            const key = assignmentKey(a);
            return (
              <div key={key} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <RoleBadge role={a.role} />
                  <span className="truncate text-[11px] text-text-secondary">
                    {a.eventId ? a.eventName ?? `Event #${a.eventId}` : 'Platform-wide'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(a)}
                  disabled={pendingKey === key}
                  aria-label={`Revoke ${a.role} role`}
                  className="rounded-md p-1 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50 cursor-pointer"
                >
                  {pendingKey === key ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add-role form */}
      {adding && (
        <div className="space-y-2.5 rounded-lg border border-secondary/20 bg-secondary/5 p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-secondary">
            <ShieldPlus className="h-3.5 w-3.5" />
            <span>Grant a role</span>
          </div>

          <select
            value={roleId}
            onChange={(e) => {
              setRoleId(Number(e.target.value));
              setEventId('');
              setError(null);
            }}
            className="h-10 w-full rounded-lg border border-border-subtle bg-surface-white px-2.5 text-xs text-text-primary outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          >
            {GRANTABLE_ROLES.map((r) => (
              <option key={r.roleId} value={r.roleId}>
                {r.label}
                {r.eventScoped ? ' (event-scoped)' : ' (platform-wide)'}
              </option>
            ))}
          </select>

          {selectedRole.eventScoped && (
            <select
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                setError(null);
              }}
              className="h-10 w-full rounded-lg border border-border-subtle bg-surface-white px-2.5 text-xs text-text-primary outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            >
              <option value="">Select an event…</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          )}

          {error && (
            <p className="rounded-md bg-danger/10 px-2 py-1.5 text-[10px] font-semibold text-danger">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGrant}
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-secondary py-2 text-xs font-bold text-on-secondary transition-colors hover:bg-secondary/90 disabled:opacity-60 cursor-pointer"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Grant role</span>
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="rounded-lg border border-border-subtle bg-surface-white px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface disabled:opacity-60 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Revoke error surfaced outside the add form too */}
      {!adding && error && (
        <p className="rounded-md bg-danger/10 px-2 py-1.5 text-[10px] font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
