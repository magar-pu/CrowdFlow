"use client";

import React from 'react';
import { X, UserCheck, Ban } from 'lucide-react';
import { User } from '../types';

interface UserDetailDrawerProps {
  user: User;
  onClose: () => void;
  onToggleStatus: (userId: string, status: 'Verified' | 'Suspended') => void;
}

export default function UserDetailDrawer({ user, onClose, onToggleStatus }: UserDetailDrawerProps) {
  const handleVerify = () => {
    onToggleStatus(user.id, 'Verified');
  };

  const handleSuspend = () => {
    onToggleStatus(user.id, 'Suspended');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
      {/* Backdrop exit */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-md h-full bg-slate-950 border-l border-slate-800 p-6 shadow-2xl flex flex-col justify-between z-10 animate-slide-in">
        {/* Header */}
        <div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1 text-slate-500 hover:bg-slate-900 hover:text-slate-300 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center text-center mt-6">
            <img 
              src={user.profilePic} 
              alt={user.name} 
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-full object-cover border-2 border-indigo-500/20"
            />
            <h3 className="mt-3 text-base font-bold text-white">{user.name}</h3>
            <p className="text-[10px] text-slate-500 font-mono">{user.email}</p>
            <span className="mt-2.5 rounded bg-slate-900 border border-slate-800 px-2.5 py-0.5 text-[9px] font-mono text-indigo-400 uppercase tracking-widest">
              {user.role} Key Node
            </span>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-b border-slate-900 py-4 text-center">
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Trading History</span>
              <p className="text-base font-bold text-white mt-0.5">{user.transactionsCount} Orders</p>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Enrollment Date</span>
              <p className="text-xs text-slate-300 mt-1 font-mono">{user.joinedAt}</p>
            </div>
          </div>

          {/* Hardware / Security metrics */}
          <div className="mt-4 space-y-3">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Identity Security Controls</span>
            <div className="rounded-xl bg-slate-900/30 border border-slate-900 p-4 space-y-3.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Active hardware locks</span>
                <span className="font-mono text-slate-200 font-bold">1/1 verified MAC</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Verified payout bank</span>
                <span className="font-mono text-slate-200 font-bold">Stripe Custom Connect</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Identity Status</span>
                <span className={`font-bold font-mono text-[10px] ${
                  user.status === 'Verified' ? 'text-emerald-400' : user.status === 'Suspended' ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {user.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-2 border-t border-slate-900 pt-4">
          {user.status !== 'Verified' && (
            <button
              onClick={handleVerify}
              className="w-full bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <UserCheck className="h-4 w-4" />
              <span>Verify User Credentials</span>
            </button>
          )}
          
          {user.status !== 'Suspended' && user.role !== 'Admin' && (
            <button
              onClick={handleSuspend}
              className="w-full bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Ban className="h-4 w-4" />
              <span>Suspend Node Access</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => alert(`Resetting secure hardware authorization hashes for: ${user.name}`)}
            className="w-full bg-slate-900 border border-slate-800 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Reset Authorized Hardware ID
          </button>
        </div>
      </div>
    </div>
  );
}
