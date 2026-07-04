"use client";

import React, { useState } from 'react';
import { Search, Bell, HelpCircle, CheckCircle, ShieldAlert, X } from 'lucide-react';
import { SecurityAlert } from '../types';

interface HeaderProps {
  alerts: SecurityAlert[];
  onSearch?: (query: string) => void;
  onClearAlert?: (id: string) => void;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
}

export default function Header({ 
  alerts, 
  onSearch, 
  onClearAlert,
  userName = "Richie M.",
  userRole = "Platform Admin",
  userAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop"
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    if (onSearch) onSearch(val);
  };

  const handleClearAll = () => {
    if (alerts.length > 0 && onClearAlert) {
      alerts.forEach(alert => onClearAlert(alert.id));
    } else {
      alert('All active threats dismissed. Syncing security ledger...');
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
      {/* Search Bar */}
      <div className="flex flex-1 items-center max-w-lg">
        <div className="relative w-full">
          <Search className="absolute top-2.5 left-3.5 h-4.5 w-4.5 text-slate-500" />
          <input
            id="global-search-input"
            type="text"
            placeholder="Search users, events, transactions, scanner logs..."
            value={searchVal}
            onChange={handleSearchChange}
            className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 pr-4 pl-10.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Right Side Tools */}
      <div className="flex items-center gap-4">
        {/* System Health Status */}
        <div className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 border border-emerald-500/20 sm:flex">
          <CheckCircle className="h-3.5 w-3.5 animate-pulse" />
          <span>SYS STATUS: OPERATIONAL</span>
        </div>

        {/* Support Hub Button */}
        <button 
          onClick={() => alert('Accessing the Admin operations manual: standard operations and escalation protocols.')}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 cursor-pointer"
          title="System Help Manual"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Notifications Alert Popover */}
        <div className="relative">
          <button
            id="notification-bell-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 cursor-pointer"
          >
            <Bell className="h-5 w-5" />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-white animate-bounce">
                {alerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl ring-1 ring-black/10 z-30">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <ShieldAlert className="h-4 w-4 text-indigo-600" />
                  <span>Security & Activity Monitor</span>
                </h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {alerts.length} Alerts
                </span>
              </div>
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {alerts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">No active priority threats detected.</div>
                ) : (
                  alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`relative rounded-xl border p-3 transition-colors ${
                        alert.severity === 'high' 
                          ? 'bg-rose-50 border-rose-100 text-rose-800' 
                          : 'bg-amber-50 border-amber-100 text-amber-800'
                      }`}
                    >
                      <button 
                        onClick={() => onClearAlert?.(alert.id)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <h4 className="text-xs font-semibold pr-4">{alert.title}</h4>
                      <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">{alert.description}</p>
                      <span className="mt-1.5 block text-[9px] text-slate-400 font-mono">{alert.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
              {alerts.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3 text-center">
                  <button 
                    onClick={handleClearAll}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors cursor-pointer"
                  >
                    Clear All Threats
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Identity Banner */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="hidden text-right md:block">
            <span className="block text-sm font-medium text-slate-800">{userName}</span>
            <span className="block text-[9px] font-mono text-indigo-600 uppercase tracking-widest">{userRole}</span>
          </div>
          <img 
            id="admin-profile-avatar"
            src={userAvatar} 
            alt={userName} 
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-full object-cover border border-indigo-500/20 ring-2 ring-indigo-500/10"
          />
        </div>
      </div>
    </header>
  );
}
