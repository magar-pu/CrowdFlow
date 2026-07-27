"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  CalendarRange,
  Users2,
  DollarSign,
  Settings2,
  LogOut,
  Sparkles,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';

type AdminNavId = 'dashboard' | 'analytics' | 'events' | 'users' | 'finance' | 'settings';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onViewChange: (view: AdminNavId) => void;
  pendingVerificationsCount: number;
}

const NAV_ITEMS: { id: AdminNavId; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'events', label: 'Event Management', icon: CalendarRange },
  { id: 'users', label: 'User Management', icon: Users2 },
  { id: 'finance', label: 'Finance Center', icon: DollarSign },
  { id: 'settings', label: 'Global Settings', icon: Settings2 },
];

export default function MobileNavDrawer({
  isOpen,
  onClose,
  currentView,
  onViewChange,
  pendingVerificationsCount,
}: MobileNavDrawerProps) {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    onClose();
    await logout();
    router.push('/login');
  };

  const badgeFor = (id: AdminNavId) =>
    id === 'users' && pendingVerificationsCount > 0 ? pendingVerificationsCount : undefined;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-surface-white border-r border-border-subtle shadow-2xl transition-transform duration-300 lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-border-subtle px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-sm shrink-0">
              <Sparkles className="h-5 w-5 text-on-primary" />
            </div>
            <div className="text-left">
              <span className="text-lg font-bold tracking-normal text-text-primary">CrowdFlow</span>
              <div className="text-xs font-medium text-text-secondary">Admin Console</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id || (item.id === 'events' && currentView === 'workspace');
            const badge = badgeFor(item.id);
            return (
              <button
                key={item.id}
                onClick={() => { onViewChange(item.id); onClose(); }}
                className={`w-full flex items-center justify-between rounded-lg font-sans text-sm font-medium py-2.5 px-4 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'text-text-secondary hover:bg-surface-container-low hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {badge !== undefined && (
                  <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                    isActive ? 'bg-white text-primary' : 'border border-danger/20 bg-danger/5 text-danger'
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border-subtle p-4">
          <div className="flex flex-col gap-2">
            <button
              onClick={handleLogout}
              className="w-full flex min-h-11 items-center gap-3 rounded-lg px-4 py-2.5 font-sans text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-danger/5 hover:text-danger cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
