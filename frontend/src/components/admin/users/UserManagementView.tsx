"use client";

import React, { useState } from 'react';
import { User, VerificationApplication } from '@/types/admin';
import UserDirectoryTable from './UserDirectoryTable';
import VerificationQueue from './VerificationQueue';
import UserDetailDrawer from './UserDetailDrawer';

interface UserManagementViewProps {
  users: User[];
  verifications: VerificationApplication[];
  onApproveVerification: (id: string) => void;
  onRejectVerification: (id: string) => void;
  onToggleUserStatus: (userId: string, newStatus: 'Verified' | 'Suspended') => void;
}

export default function UserManagementView({
  users,
  verifications,
  onApproveVerification,
  onRejectVerification,
  onToggleUserStatus
}: UserManagementViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'queue'>('directory');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const pendingCount = verifications.filter(v => v.status === 'Pending').length;

  const handleInspectUser = (user: User) => {
    setSelectedUser(user);
  };

  const handleToggleStatusInDrawer = (userId: string, status: 'Verified' | 'Suspended') => {
    onToggleUserStatus(userId, status);
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser({ ...selectedUser, status });
    }
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
        <UserDirectoryTable users={users} onInspectUser={handleInspectUser} />
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
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
          onToggleStatus={handleToggleStatusInDrawer} 
        />
      )}
    </div>
  );
}
