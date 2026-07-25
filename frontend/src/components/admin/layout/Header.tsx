"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ShieldAlert, X, ChevronDown, LogOut, QrCode } from 'lucide-react';
import { SecurityAlert } from '@/types/admin';
import { useAuthStore } from '@/lib/store/authStore';
import { format_role_label, get_initials } from '@/lib/utils/user-display';

interface HeaderProps {
  alerts: SecurityAlert[];
  onClearAlert?: (id: string) => void;
}

export default function Header({
  alerts,
  onClearAlert,
}: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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

  const handleClearAll = () => {
    if (alerts.length > 0 && onClearAlert) {
      alerts.forEach(alert => onClearAlert(alert.id));
    } else {
      alert('All active alerts cleared.');
    }
  };

  return (
    <header className="sticky top-0 z-10 flex min-h-[72px] w-full items-center justify-between gap-3 border-b border-border-subtle bg-surface-white/95 px-4 py-3 backdrop-blur-md sm:px-6">
      {/* Right Side Tools */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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

        {/* Profile Identity Banner & Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 border-l border-border-subtle pl-3 sm:pl-4 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <div className="hidden md:block text-right">
              <span className="block text-sm font-medium text-text-primary leading-tight">{userName}</span>
              <span className="block text-xs text-text-secondary leading-none mt-1">{userRole}</span>
            </div>
            <img 
              id="admin-profile-avatar"
              src={userAvatar || undefined} 
              alt={userName} 
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-full border border-border-subtle object-cover shadow-xs"
            />
            <ChevronDown className="h-4 w-4 text-text-secondary" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 z-30 mt-3 w-80 rounded-2xl border border-border-subtle bg-white p-4 shadow-xl text-left space-y-3 animate-scale-in">
              <div className="border-b border-border-subtle pb-3">
                <span className="text-[10px] font-mono font-bold text-primary tracking-widest uppercase block">ADMIN PROFILE SESSION</span>
                <h4 className="text-sm font-bold text-text-primary mt-0.5">{userName}</h4>
                <p className="text-xs text-text-secondary">{userRole}</p>
              </div>

              {/* Quick Scanner Test Tool */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <QrCode className="h-4 w-4" /> EO Scanner Test Suite
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-primary text-white rounded">EVENT 10</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Access Code: <code className="font-mono text-primary font-bold">CF-SCAN-ADMIN123</code>
                </p>
                <a
                  href="/scanner/10?token=CF-SCAN-ADMIN123"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Launch Scanner (Admin Mode)
                </a>
              </div>

              {/* Quick Copy Test Ticket Tokens */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[9px] font-mono font-bold text-text-secondary uppercase block">Seeded Test Tickets (Click to Copy ID)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("20ed491c-4d15-43f4-8d8b-0c8d3ee0622e");
                    alert("Copied Ticket ID: Richie Obhasa (Admin)");
                  }}
                  className="w-full text-left p-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-border-subtle text-[11px] font-mono truncate flex justify-between items-center transition-colors cursor-pointer"
                >
                  <span className="truncate text-text-primary">1. Richie Obhasa (Admin)</span>
                  <span className="text-[9px] text-primary font-bold shrink-0">COPY ID</span>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("d33e38db-ce17-434c-95c3-0d291544ab60");
                    alert("Copied Ticket ID: John Doe (Tester)");
                  }}
                  className="w-full text-left p-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-border-subtle text-[11px] font-mono truncate flex justify-between items-center transition-colors cursor-pointer"
                >
                  <span className="truncate text-text-primary">2. John Doe (Tester)</span>
                  <span className="text-[9px] text-primary font-bold shrink-0">COPY ID</span>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("0be0eae4-f244-499d-b48a-6f0af8463543");
                    alert("Copied Ticket ID: Siti Rahma (VVIP)");
                  }}
                  className="w-full text-left p-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-border-subtle text-[11px] font-mono truncate flex justify-between items-center transition-colors cursor-pointer"
                >
                  <span className="truncate text-text-primary">3. Siti Rahma (VVIP)</span>
                  <span className="text-[9px] text-primary font-bold shrink-0">COPY ID</span>
                </button>
              </div>

              <div className="border-t border-border-subtle pt-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout Admin Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
