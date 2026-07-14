"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, HelpCircle, CheckCircle, ShieldAlert, X, ChevronDown, LogOut } from 'lucide-react';
import { SecurityAlert } from '@/types/admin';
import { useAuthStore } from '@/lib/store/authStore';
import { format_role_label, get_initials } from '@/lib/utils/user-display';

interface HeaderProps {
  alerts: SecurityAlert[];
  onSearch?: (query: string) => void;
  onClearAlert?: (id: string) => void;
}

export default function Header({
  alerts,
  onSearch,
  onClearAlert,
}: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);

  const display_user = user ?? {
    full_name: "Admin",
    email: "",
    role: "super_admin" as const,
    avatar_url: "",
  };
  const userAvatar = display_user.avatar_url ?? null;
  const userName = display_user.full_name;
  const userRole = format_role_label(display_user.role);
  const initials = get_initials(userName);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    router.push('/login');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    if (onSearch) onSearch(val);
  };

  const handleClearAll = () => {
    if (alerts.length > 0 && onClearAlert) {
      alerts.forEach(alert => onClearAlert(alert.id));
    } else {
      alert('All active alerts cleared.');
    }
  };

  return (
    <header className="sticky top-0 z-10 flex min-h-[72px] w-full items-center justify-between gap-3 border-b border-border-subtle bg-surface-white/95 px-4 py-3 backdrop-blur-md sm:px-6">
      {/* Search Bar */}
      <div className="flex flex-1 items-center max-w-[180px] xs:max-w-xs sm:max-w-md md:max-w-lg">
        <div className="relative w-full">
          <Search className="absolute top-3 left-3.5 h-4.5 w-4.5 text-text-secondary" />
          <input
            id="global-search-input"
            type="text"
            placeholder="Search users, events, transactions..."
            value={searchVal}
            onChange={handleSearchChange}
            className="h-11 w-full rounded-lg border border-border-subtle bg-surface px-4 pl-10.5 text-sm text-text-primary outline-none transition-all duration-200 placeholder:text-text-secondary focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20"
          />
        </div>
      </div>

      {/* Right Side Tools */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* System Health Status */}
        <div className="hidden items-center gap-1.5 rounded-full border border-success/20 bg-success/5 px-3 py-1 text-xs font-medium text-success sm:flex">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>Operational</span>
        </div>

        {/* Support Hub Button */}
        <button 
          onClick={() => alert('Accessing the Admin operations manual: standard operations and escalation protocols.')}
          className="hidden rounded-lg p-2 text-text-secondary transition-all duration-200 hover:bg-surface-container-low hover:text-text-primary cursor-pointer sm:block"
          title="System Help Manual"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Notifications Alert Popover */}
        <div className="relative">
          <button
            id="notification-bell-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-text-secondary transition-all duration-200 hover:bg-surface-container-low hover:text-text-primary cursor-pointer"
          >
            <Bell className="h-5 w-5" />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-on-error ring-2 ring-white">
                {alerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 z-30 mt-3 w-80 rounded-xl border border-border-subtle bg-surface-white p-4 shadow-overlay">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                  <ShieldAlert className="h-4 w-4 text-secondary" />
                  <span>Security Monitor</span>
                </h3>
                <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                  {alerts.length} Alerts
                </span>
              </div>
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {alerts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-text-secondary">No active priority alerts.</div>
                ) : (
                  alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`relative rounded-lg border p-3 transition-colors ${
                        alert.severity === 'high' 
                          ? 'border-danger/20 bg-danger/5 text-danger' 
                          : 'border-warning/20 bg-warning/5 text-warning'
                      }`}
                    >
                      <button 
                        onClick={() => onClearAlert?.(alert.id)}
                        className="absolute top-2 right-2 text-text-secondary hover:text-text-primary cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <h4 className="text-xs font-semibold pr-4">{alert.title}</h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{alert.description}</p>
                      <span className="mt-1.5 block text-[9px] text-text-secondary">{alert.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
              {alerts.length > 0 && (
                <div className="mt-3 border-t border-border-subtle pt-3 text-center">
                  <button 
                    onClick={handleClearAll}
                    className="text-xs font-semibold text-secondary transition-colors hover:text-primary cursor-pointer"
                  >
                    Clear All Alerts
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Identity Banner */}
        <div className="flex items-center gap-3 border-l border-border-subtle pl-3 sm:pl-4">
          <div className="hidden md:block text-right">
            <span className="block text-sm font-medium text-text-primary leading-tight">{userName}</span>
            <span className="block text-xs text-text-secondary leading-none mt-1">{userRole}</span>
          </div>
          <img 
            id="admin-profile-avatar"
            src={userAvatar} 
            alt={userName} 
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-full border border-border-subtle object-cover shadow-xs"
          />
        </div>
      </div>
    </header>
  );
}
