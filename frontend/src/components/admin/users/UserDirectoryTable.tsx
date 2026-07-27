"use client";

import React, { useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { User } from '@/types/admin';
import RoleBadge from './RoleBadge';
import Select from '@/components/ui/Select';

interface UserDirectoryTableProps {
  users: User[];
  onInspectUser: (user: User) => void;
}

export default function UserDirectoryTable({ users, onInspectUser }: UserDirectoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Filter users based on query parameters
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Quick Filters */}
      <div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-white p-4 shadow-sm md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute top-3 left-3.5 h-4.5 w-4.5 text-text-secondary" />
          <input
            id="user-search-input"
            type="text"
            placeholder="Search users by name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-lg border border-border-subtle bg-surface py-2 pr-4 pl-10.5 text-sm text-text-primary outline-none transition-all placeholder:text-text-secondary focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        {/* Role / Status select arrays */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            selectSize="md"
            id="user-role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="All">All Roles</option>
            <option value="Buyer">Buyers Only</option>
            <option value="Seller">Sellers Only</option>
            <option value="Organizer">Organizers Only</option>
            <option value="Auditor">Auditors Only</option>
            <option value="Gate Scanner">Gate Scanners Only</option>
            <option value="Admin">Admins Only</option>
            <option value="Mixed">Mixed Roles Only</option>
          </Select>

          <Select
            selectSize="md"
            id="user-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Verified">Verified Only</option>
            <option value="Pending">Pending Only</option>
            <option value="Suspended">Suspended Only</option>
          </Select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-text-secondary">
            <thead>
              <tr className="border-b border-border-subtle bg-surface text-[10px] uppercase tracking-wide text-text-secondary">
                <th className="py-3.5 px-4">User Info</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Enrolled At</th>
                <th className="py-3.5 px-4">Transactions</th>
                <th className="py-3.5 px-4">Identity Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-surface">
                  <td className="py-3.5 px-4 flex items-center gap-3">
                    <img 
                      src={user.profilePic} 
                      alt={user.name} 
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-full border border-border-subtle object-cover"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary">{user.name}</h4>
                      <p className="mt-0.5 text-[10px] text-text-secondary">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <RoleBadge
                      role={user.role}
                      label={
                        user.role === 'Mixed' && user.roleAssignments
                          ? `Mixed · ${user.roleAssignments.length}`
                          : undefined
                      }
                    />
                  </td>
                  <td className="py-3.5 px-4 text-xs text-text-secondary">{user.joinedAt}</td>
                  <td className="py-3.5 px-4 text-xs font-bold text-text-primary">{user.transactionsCount} orders</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                      user.status === 'Verified' 
                        ? 'bg-success/10 text-success border-success/20' 
                        : user.status === 'Pending' 
                        ? 'bg-warning/10 text-warning border-warning/20' 
                        : 'bg-danger/10 text-danger border-danger/20'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        user.status === 'Verified' ? 'bg-success' : user.status === 'Pending' ? 'bg-warning' : 'bg-danger'
                      }`} />
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onInspectUser(user)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-surface-white px-2.5 py-1.5 text-[10px] font-bold text-text-secondary transition-colors hover:border-secondary/20 hover:bg-secondary/5 hover:text-secondary cursor-pointer"
                    >
                      <span>View User</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
