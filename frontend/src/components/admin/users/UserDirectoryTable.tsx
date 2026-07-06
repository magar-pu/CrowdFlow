"use client";

import React, { useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { User } from '@/types/admin';

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
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-sm flex flex-col gap-4 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-3.5 h-4.5 w-4.5 text-slate-500" />
          <input
            id="user-search-input"
            type="text"
            placeholder="Search users by name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-2 pr-4 pl-10.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:bg-slate-900"
          />
        </div>

        {/* Role / Status select arrays */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            id="user-role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-300 outline-none transition-colors focus:border-indigo-500 focus:bg-slate-900"
          >
            <option value="All">All Roles</option>
            <option value="Buyer">Buyers Only</option>
            <option value="Seller">Sellers Only</option>
            <option value="Organizer">Organizers Only</option>
            <option value="Admin">Admins Only</option>
          </select>

          <select
            id="user-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-300 outline-none transition-colors focus:border-indigo-500 focus:bg-slate-900"
          >
            <option value="All">All Statuses</option>
            <option value="Verified">Verified Only</option>
            <option value="Pending">Pending Only</option>
            <option value="Suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Directory Ledger Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-400 border-collapse">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-900/20">
                <th className="py-3.5 px-4">User Info</th>
                <th className="py-3.5 px-4">Role / Node</th>
                <th className="py-3.5 px-4">Enrolled At</th>
                <th className="py-3.5 px-4">Transactions</th>
                <th className="py-3.5 px-4">Identity Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-900/30 transition-colors">
                  <td className="py-3.5 px-4 flex items-center gap-3">
                    <img 
                      src={user.profilePic} 
                      alt={user.name} 
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-full object-cover border border-indigo-500/10"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">{user.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex rounded-lg px-2 py-0.5 text-[9px] font-semibold uppercase ${
                      user.role === 'Admin' 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                        : user.role === 'Organizer' 
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : user.role === 'Seller' 
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 text-2xs">{user.joinedAt}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-200 text-xs font-bold">{user.transactionsCount} orders</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                      user.status === 'Verified' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : user.status === 'Pending' 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        user.status === 'Verified' ? 'bg-emerald-400' : user.status === 'Pending' ? 'bg-amber-400' : 'bg-rose-500'
                      }`} />
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onInspectUser(user)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <span>Inspect Node</span>
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
