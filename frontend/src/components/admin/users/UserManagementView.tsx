"use client";

import React, { useEffect, useState } from 'react';
import { ApiResponse, Event, User, VerificationApplication } from '@/types/admin';
import UserDirectoryTable from './UserDirectoryTable';
import VerificationQueue from './VerificationQueue';
import UserDetailDrawer from './UserDetailDrawer';
import Pagination from '@/components/admin/shared/Pagination';

interface UserManagementViewProps {
  users: User[];
  verifications: VerificationApplication[];
  events: Event[];
  onApproveVerification: (id: string) => void;
  onRejectVerification: (id: string) => void;
  onToggleUserStatus: (userId: string, newStatus: 'Verified' | 'Suspended') => void;
  onGrantRole: (userId: string, roleId: number, eventId: number | null) => Promise<ApiResponse<void>>;
  onRevokeRole: (userId: string, roleId: number, eventId: number | null) => Promise<ApiResponse<void>>;
  page: number;
  hasNextPage: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export default function UserManagementView({
  users,
  verifications,
  events,
  onApproveVerification,
  onRejectVerification,
  onToggleUserStatus,
  onGrantRole,
  onRevokeRole,
  page,
  hasNextPage,
  onPrevPage,
  onNextPage
}: UserManagementViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'queue'>('directory');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Derive the open user from the live `users` list rather than snapshotting it,
  // so a status change or role grant/revoke (which refetches `users`) is
  // reflected in the drawer immediately without manual patching.
  const selectedUser = selectedUserId
    ? users.find((u) => u.id === selectedUserId) ?? null
    : null;

  // Close the drawer if the selected user drops out of the list (e.g. paged away).
  useEffect(() => {
    if (selectedUserId && !users.some((u) => u.id === selectedUserId)) {
      setSelectedUserId(null);
      setDrawerOpen(false);
    }
  }, [users, selectedUserId]);

  const pendingCount = verifications.filter(v => v.status === 'Pending').length;

  const handleInspectUser = (user: User) => {
    setSelectedUserId(user.id);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 relative">
      {/* User Header with Sub-Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-text-primary md:text-4xl">User Management</h1>
          <p className="mt-2 text-sm text-text-secondary">Review users, verification requests, and account status changes.</p>
        </div>

        {/* Sub-tab selection */}
        <div className="flex rounded-lg border border-border-subtle bg-surface p-1">
          <button
            onClick={() => setActiveSubTab('directory')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase transition-all cursor-pointer ${
              activeSubTab === 'directory' ? 'bg-primary text-on-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Users Directory
          </button>
          <button
            onClick={() => setActiveSubTab('queue')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'queue' ? 'bg-primary text-on-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>Verification Queue</span>
            {pendingCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-on-error">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Directory Tab Content */}
      {activeSubTab === 'directory' && (
        <>
          <UserDirectoryTable users={users} onInspectUser={handleInspectUser} />
          <Pagination page={page} hasNext={hasNextPage} onPrev={onPrevPage} onNext={onNextPage} />
        </>
      )}

      {/* Verification Queue Tab */}
      {activeSubTab === 'queue' && (
        <VerificationQueue 
          verifications={verifications} 
          onApproveVerification={onApproveVerification}
          onRejectVerification={onRejectVerification}
        />
      )}

      {/* User Inspection Side Drawer Overlay */}
      {selectedUser && (
        <UserDetailDrawer
          open={drawerOpen}
          user={selectedUser}
          events={events}
          onClose={() => setDrawerOpen(false)}
          onToggleStatus={onToggleUserStatus}
          onGrantRole={onGrantRole}
          onRevokeRole={onRevokeRole}
        />
      )}
    </div>
  );
}
