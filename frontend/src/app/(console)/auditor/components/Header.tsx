import React, { useState, useEffect } from 'react';
import { Bell, Menu } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { listAuditorNotifications, markAuditorNotificationsRead, AuditorNotification } from '@/lib/api/auditor';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenMenu?: () => void;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "Just now";
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDays}d ago`;
  } catch (e) {
    return "Recently";
  }
}

export default function Header({
  title,
  subtitle,
  onOpenMenu,
}: HeaderProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AuditorNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user: storeUser } = useAuthStore();

  const email = storeUser?.email || 'admin@crowdflow.my.id';
  const fullName = storeUser?.full_name || 'Super Admin';
  const displayRole = storeUser?.role ? storeUser.role.replace('_', ' ') : 'compliance auditor';
  const displayName = fullName || email.split('@')[0];
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('') || email[0];

  const fetchNotifications = async () => {
    try {
      const res = await listAuditorNotifications();
      if (res.success && res.data) {
        setNotifications(res.data);
        const unread = res.data.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error("Failed to load header notifications:", err);
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
      try {
        await markAuditorNotificationsRead();
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      } catch (err) {
        console.error("Failed to mark notifications as read:", err);
      }
    }
  };

  const handleNotificationClick = (n: AuditorNotification) => {
    setShowNotifications(false);
    if (!n.resourceType || !n.resourceId) return;

    if (n.resourceType === 'event') {
      router.push(`/auditor/reviews/${n.resourceId}`);
    } else if (n.resourceType === 'payout') {
      router.push(`/auditor/payouts/${n.resourceId}`);
    } else if (n.resourceType === 'organizer') {
      router.push(`/auditor/organizers/${n.resourceId}`);
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
            {subtitle ?? 'CROWDFLOW AUDITOR'}
          </span>
          <h2 className="text-sm font-bold text-text-primary capitalize leading-tight">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={handleToggleNotifications}
            className="relative p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-container-low border border-border-subtle rounded-lg cursor-pointer transition-colors"
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
              <div className="flex justify-between items-center mb-3 border-b border-border-subtle pb-2">
                <h4 className="text-xs font-bold text-text-primary">Notifications</h4>
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    router.push('/auditor/documents');
                  }}
                  className="text-[10px] text-primary hover:underline font-semibold"
                >
                  View All
                </button>
              </div>
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
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-xs font-bold text-on-primary shadow-sm uppercase">
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
