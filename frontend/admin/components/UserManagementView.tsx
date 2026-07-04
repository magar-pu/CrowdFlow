"use client";

import React, { useState } from 'react';
import { User, VerificationApplication } from '../types';
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
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">User Management</h1>
          <p className="mt-1 text-sm text-slate-400">Audit user profiles, process identity verification files, and issue security bans.</p>
        </div>

        {/* Sub-tab selection */}
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
          <button
            onClick={() => setActiveSubTab('directory')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase transition-all cursor-pointer ${
              activeSubTab === 'directory' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Users Directory
          </button>
          <button
            onClick={() => setActiveSubTab('queue')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'queue' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Verification Queue</span>
            {pendingCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white animate-pulse">
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
