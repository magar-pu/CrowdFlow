"use client";

import React from 'react';
import { X, UserCheck, Ban } from 'lucide-react';
import { ApiResponse, Event, User } from '@/types/admin';
import RoleBadge from './RoleBadge';
import UserRolesManager from './UserRolesManager';
import UserDelegationsPanel from './UserDelegationsPanel';
import Modal from '@/components/ui/Modal';

interface UserDetailDrawerProps {
  open: boolean;
  user: User;
  events: Event[];
  onClose: () => void;
  onToggleStatus: (userId: string, status: 'Verified' | 'Suspended') => void;
  onGrantRole: (userId: string, roleId: number, eventId: number | null) => Promise<ApiResponse<void>>;
  onRevokeRole: (userId: string, roleId: number, eventId: number | null) => Promise<ApiResponse<void>>;
}

export default function UserDetailDrawer({
  open,
  user,
  events,
  onClose,
  onToggleStatus,
  onGrantRole,
  onRevokeRole,
}: UserDetailDrawerProps) {
  const handleVerify = () => {
    onToggleStatus(user.id, 'Verified');
  };

  const handleSuspend = () => {
    onToggleStatus(user.id, 'Suspended');
  };

  // A Super Admin must not be suspendable from the UI. The collapsed `role` is
  // "Mixed" (not "Admin") when they also hold another role, so check every
  // assignment, falling back to `role` for payloads without the breakdown.
  const isAdmin =
    user.role === 'Admin' || (user.roleAssignments?.some((a) => a.role === 'Admin') ?? false);

  return (
    <Modal open={open} bare onClose={onClose} closeOnBackdropClick backdropClassName="bg-primary/40 backdrop-blur-sm">
      <div className="relative flex w-full max-w-md max-h-[90vh] overflow-y-auto flex-col justify-between rounded-2xl border border-border-subtle bg-surface-white p-6 shadow-overlay animate-fade-in">
        {/* Header */}
        <div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1 text-text-secondary hover:bg-surface hover:text-text-primary cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center text-center mt-6">
            <img 
              src={user.profilePic} 
              alt={user.name} 
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-full border-2 border-border-subtle object-cover"
            />
            <h3 className="mt-3 text-base font-bold text-text-primary">{user.name}</h3>
            <p className="text-[10px] text-text-secondary">{user.email}</p>
            <div className="mt-2.5">
              <RoleBadge role={user.role} />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-y border-border-subtle py-4 text-center">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wide text-text-secondary">Order History</span>
              <p className="mt-0.5 text-base font-bold text-text-primary">{user.transactionsCount} Orders</p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wide text-text-secondary">Enrollment Date</span>
              <p className="mt-1 text-xs text-text-primary">{user.joinedAt}</p>
            </div>
          </div>

          {/* Hardware / Security metrics */}
          <div className="mt-4 space-y-3">
            <span className="text-[9px] font-bold uppercase tracking-wide text-text-secondary">Account Controls</span>
            <div className="space-y-3.5 rounded-lg border border-border-subtle bg-surface p-4">
              <div className="flex items-center justify-between text-[11px] text-text-secondary">
                <span>Device authorization</span>
                <span className="font-bold text-text-primary">Verified</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-secondary">
                <span>Payout account</span>
                <span className="font-bold text-text-primary">Connected</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-secondary">
                <span>Identity Status</span>
                <span className={`text-[10px] font-bold ${
                  user.status === 'Verified' ? 'text-success' : user.status === 'Suspended' ? 'text-danger' : 'text-warning'
                }`}>
                  {user.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Roles & Access: current role -> event bindings + grant/revoke */}
          <UserRolesManager
            user={user}
            events={events}
            onGrantRole={onGrantRole}
            onRevokeRole={onRevokeRole}
          />

          {/* Read-only co-organizer delegation oversight + moderation revoke */}
          <UserDelegationsPanel userId={user.id} />
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-2 border-t border-border-subtle pt-4">
          {user.status !== 'Verified' && (
            <button
              onClick={handleVerify}
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-success py-2.5 text-xs font-bold text-on-success transition-colors hover:bg-success/90 cursor-pointer"
            >
              <UserCheck className="h-4 w-4" />
              <span>Verify User Credentials</span>
            </button>
          )}
          
          {user.status !== 'Suspended' && !isAdmin && (
            <button
              onClick={handleSuspend}
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-danger/20 bg-danger/10 py-2.5 text-xs font-bold text-danger transition-all hover:bg-danger hover:text-on-error cursor-pointer"
            >
              <Ban className="h-4 w-4" />
              <span>Suspend Account</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => alert(`Resetting authorized device for ${user.name}`)}
            className="min-h-11 w-full rounded-lg border border-border-subtle bg-surface-white py-2.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface cursor-pointer"
          >
            Reset Authorized Device
          </button>
        </div>
      </div>
    </Modal>
  );
}
