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
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { format_role_label, get_initials } from '@/lib/utils/user-display';


interface SidebarProps {
  currentView: string;
  onViewChange: (view: 'dashboard' | 'analytics' | 'events' | 'users' | 'finance' | 'settings' | 'workspace') => void;
  pendingVerificationsCount: number;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function Sidebar({
  currentView,
  onViewChange,
  pendingVerificationsCount,
  isCollapsed = false,
  onToggleCollapsed
}: SidebarProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const display_user = user ?? {
    full_name: "Admin",
    email: "",
    role: "super_admin" as const,
    avatar_url: "",
  };
  const userName = display_user.full_name;
  const userRole = format_role_label(display_user.role);
  const initials = get_initials(userName);

  interface MenuItem {
    readonly id: 'dashboard' | 'analytics' | 'events' | 'users' | 'finance' | 'settings';
    readonly name: string;
    readonly icon: LucideIcon;
    readonly badge?: number;
  }

  const menuItems: MenuItem[] = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'events', name: 'Event Management', icon: CalendarRange },
    { 
      id: 'users', 
      name: 'User Management', 
      icon: Users2,
      badge: pendingVerificationsCount > 0 ? pendingVerificationsCount : undefined
    },
    { id: 'finance', name: 'Finance Center', icon: DollarSign },
    { id: 'settings', name: 'Global Settings', icon: Settings2 },
  ];

  const handleExit = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside 
      id="sidebar" 
      className={`fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-border-subtle bg-surface-white text-text-primary transition-all duration-300 md:flex ${
        isCollapsed ? "w-[88px]" : "w-[280px]"
      }`}
    >
      {/* Brand Logo Header */}
      <div className={`flex h-[72px] items-center border-b border-border-subtle ${isCollapsed ? "justify-center px-4" : "justify-between px-6"}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Sparkles className="h-5 w-5 text-on-primary" />
          </div>
          <div className={isCollapsed ? "hidden" : "block"}>
            <span className="text-lg font-bold tracking-normal text-text-primary">CrowdFlow</span>
            <div className="text-xs font-medium text-text-secondary">Admin Console</div>
          </div>
        </div>
        {!isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        )}
      </div>
      {isCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="mx-auto mt-4 rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      )}

      {/* Nav Menu Items */}
      <nav className={`flex-1 space-y-1.5 py-6 ${isCollapsed ? "px-3" : "px-4"}`}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id || (item.id === 'events' && currentView === 'workspace');
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => onViewChange(item.id)}
              title={isCollapsed ? item.name : undefined}
              className={`flex min-h-11 w-full items-center rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'text-text-secondary hover:bg-surface-container-low hover:text-text-primary'
              } ${isCollapsed ? "justify-center px-0 py-3" : "justify-between px-4 py-3"}`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${isActive ? 'text-on-primary' : 'text-text-secondary'}`} />
                <span className={isCollapsed ? "hidden" : "block"}>{item.name}</span>
              </div>
              {item.badge !== undefined && !isCollapsed && (
                <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  isActive ? 'bg-white text-primary' : 'border border-danger/20 bg-danger/5 text-danger'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin Profile Footer */}
      <div className={`border-t border-border-subtle bg-surface p-4 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
        <div className={`flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-white p-2 ${isCollapsed ? "justify-center border-transparent bg-transparent" : ""}`}>
          {display_user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              id="admin-avatar-footer"
              src={display_user.avatar_url}
              alt={`${userName} Admin`}
              referrerPolicy="no-referrer"
              className="h-10 w-10 rounded-full border border-border-subtle object-cover"
            />
          ) : (
            <div
              id="admin-avatar-footer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white"
            >
              {initials}
            </div>
          )}
          <div className={isCollapsed ? "hidden" : "flex-1 overflow-hidden"}>
            <h4 className="truncate text-sm font-semibold text-text-primary">{userName}</h4>
            <p className="truncate text-xs text-text-secondary">{userRole}</p>
          </div>
        </div>
        
        <button 
          onClick={handleExit}
          className={`mt-4 flex min-h-11 items-center rounded-lg text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-danger/5 hover:text-danger cursor-pointer ${
            isCollapsed ? "w-11 justify-center px-0" : "w-full gap-3 px-4 py-2.5"
          }`}
          title={isCollapsed ? "Exit Console" : undefined}
        >
          <LogOut className="h-4.5 w-4.5" />
          <span className={isCollapsed ? "hidden" : "block"}>Exit Console</span>
        </button>
      </div>
    </aside>
  );
}
