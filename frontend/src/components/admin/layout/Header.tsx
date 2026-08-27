"use client";

import React, { useState, useEffect } from 'react';
import { Bell, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { format_role_label, get_initials } from '@/lib/utils/user-display';
import {
  listAdminNotifications,
  markAdminNotificationsRead,
  AdminNotification,
} from '@/lib/api/admin/notificationService';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenMenu?: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return "Just now";

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export default function Header({ title, subtitle, onOpenMenu }: HeaderProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const display_user = user ?? {
    full_name: "Admin",
    email: "",
    role: "super_admin" as const,
    avatar_url: "",
  };
  const displayName = display_user.full_name;
  const displayRole = format_role_label(display_user.role);
  const initials = get_initials(displayName);

  const fetchNotifications = async () => {
    const res = await listAdminNotifications();
    if (res.success && res.data) {
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n) => !n.isRead).length);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleNotifications = async () => {
    const nextShow = !showNotifications;
    setShowNotifications(nextShow);
    if (nextShow && unreadCount > 0) {
      await markAdminNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  // Admin notifications are written by the auditor package for the same events
  // an auditor sees, so the resource types line up with the admin console's own
  // routes. Anything else just closes the popover.
  const handleNotificationClick = (n: AdminNotification) => {
    setShowNotifications(false);
    if (!n.resourceType || !n.resourceId) return;

    if (n.resourceType === 'event') {
      router.push(`/admin/events/${n.resourceId}`);
    } else if (n.resourceType === 'payout') {
      router.push('/admin/finance');
    } else if (n.resourceType === 'organizer') {
      router.push('/admin/users');
    }
  };

  return (
    <header className="sticky top-0 z-10 flex min-h-[72px] w-full items-center justify-between gap-3 border-b border-border-subtle bg-surface-white/95 px-6 py-3 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {onOpenMenu && (
          <button
            onClick={onOpenMenu}
            className="hidden md:flex lg:hidden items-center justify-center p-2 -ml-1 rounded-lg text-text-secondary hover:bg-surface-container-low hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="text-left">
          <span className="text-[10px] text-on-surface-variant font-mono font-bold tracking-wider uppercase">
            {subtitle ?? 'CROWDFLOW ADMIN'}
          </span>
          <h2 className="text-sm font-bold text-text-primary capitalize leading-tight">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            id="notification-bell-btn"
            onClick={handleToggleNotifications}
            className="relative p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-container-low border border-border-subtle rounded-lg cursor-pointer transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-on-error ring-2 ring-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-border-subtle rounded-xl shadow-xl z-30 p-4 animate-fade-in text-left">
              <h4 className="text-xs font-bold text-text-primary mb-3 border-b border-border-subtle pb-2">
                Notifications
              </h4>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="text-[10px] text-text-secondary text-center py-4">No notifications found.</p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className="text-[10px] space-y-0.5 border-b border-surface-container-low pb-2 last:border-0 cursor-pointer hover:bg-surface-container-low/40 p-1.5 rounded transition-colors"
                    >
                      <div className="flex justify-between font-mono text-on-surface-variant">
                        <span className="font-bold text-text-primary text-[11px] font-sans flex items-center gap-1">
                          {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block"></span>}
                          {n.title}
                        </span>
                        <span>{formatRelativeTime(n.createdAt)}</span>
                      </div>
                      <p className="text-text-secondary leading-relaxed pl-2.5">{n.detail}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-surface-container-high"></div>

        <div className="flex items-center gap-3">
          <div
            id="admin-profile-avatar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-xs font-bold text-on-primary shadow-sm uppercase"
          >
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <h4 className="text-xs font-bold text-text-primary leading-tight truncate max-w-[120px]">{displayName}</h4>
            <p className="text-[10px] text-text-secondary leading-normal font-medium capitalize">{displayRole}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
