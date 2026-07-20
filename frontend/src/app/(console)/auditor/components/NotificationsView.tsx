import React, { useState } from 'react';
import { AuditorNotification, markAuditorNotificationsRead } from '@/lib/api/auditor';
import { Bell, Search, Check, Info, FileText, Landmark, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NotificationsViewProps {
  notifications: AuditorNotification[];
  fetchNotifications: () => void;
}

const FILTERS = ['All', 'Unread', 'Read'] as const;

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

export default function NotificationsView({ notifications, fetchNotifications }: NotificationsViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All');

  const filtered = notifications.filter((n) => {
    const matchesFilter =
      filter === 'All' ? true :
      filter === 'Unread' ? !n.isRead :
      n.isRead;
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.detail.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleMarkAllRead = async () => {
    try {
      await markAuditorNotificationsRead();
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = async (n: AuditorNotification) => {
    // Optional: Mark single notification as read in background
    if (!n.isRead) {
      try {
        await markAuditorNotificationsRead([n.id]);
        fetchNotifications();
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    }

    if (!n.resourceType || !n.resourceId) return;

    if (n.resourceType === 'event') {
      router.push(`/auditor/reviews/${n.resourceId}`);
    } else if (n.resourceType === 'payout') {
      router.push(`/auditor/payouts/${n.resourceId}`);
    } else if (n.resourceType === 'organizer') {
      router.push(`/auditor/organizers/${n.resourceId}`);
    }
  };

  const getNotificationIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('setuju') || t.includes('approve') || t.includes('sukses')) {
      return <Check className="w-5 h-5 text-success" />;
    }
    if (t.includes('tolak') || t.includes('reject') || t.includes('batal')) {
      return <Info className="w-5 h-5 text-danger" />;
    }
    if (t.includes('payout') || t.includes('bayar') || t.includes('tarik')) {
      return <Landmark className="w-5 h-5 text-warning" />;
    }
    if (t.includes('dokumen') || t.includes('document')) {
      return <FileText className="w-5 h-5 text-primary" />;
    }
    return <Bell className="w-5 h-5 text-text-secondary" />;
  };

  const getNotificationBg = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('setuju') || t.includes('approve') || t.includes('sukses')) {
      return 'bg-success/10 border-success/20';
    }
    if (t.includes('tolak') || t.includes('reject') || t.includes('batal')) {
      return 'bg-danger/10 border-danger/20';
    }
    if (t.includes('payout') || t.includes('bayar') || t.includes('tarik')) {
      return 'bg-warning/10 border-warning/20';
    }
    if (t.includes('dokumen') || t.includes('document')) {
      return 'bg-primary/10 border-primary/20';
    }
    return 'bg-surface border-border-subtle';
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Notification Center</h1>
          <p className="text-sm text-text-secondary">Pusat pemberitahuan audit aktivitas organizer, event submission, dan penarikan dana.</p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="px-4 py-2 border border-border-subtle hover:bg-surface-container-low text-text-primary rounded-lg font-sans text-xs font-semibold shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-primary" />
          Tandai Semua Dibaca
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 border border-border-subtle rounded-xl soft-shadow">
        <div className="flex items-center gap-2 border border-border-subtle rounded-lg px-3 py-2 w-full sm:w-80 bg-surface-container-low focus-within:bg-white focus-within:border-outline transition-colors">
          <Search className="w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Cari notifikasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-text-primary outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === f ? 'bg-primary text-on-primary shadow-sm' : 'border border-border-subtle text-text-secondary hover:bg-surface-container-low'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-border-subtle rounded-xl soft-shadow overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Bell className="w-12 h-12 text-on-surface-variant mx-auto opacity-40 animate-bounce" />
            <p className="text-sm font-semibold text-text-secondary">Tidak ada pemberitahuan</p>
            <p className="text-xs text-text-secondary">Semua pemberitahuan baru akan muncul di sini.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-4 flex gap-4 transition-all duration-200 hover:bg-surface-container-low/30 relative cursor-pointer ${
                  !n.isRead ? 'bg-primary/5' : ''
                }`}
              >
                {!n.isRead && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r"></span>
                )}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${getNotificationBg(n.title)}`}>
                  {getNotificationIcon(n.title)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className={`text-sm font-semibold text-text-primary leading-snug ${!n.isRead ? 'font-bold' : ''}`}>
                      {n.title}
                    </h4>
                    <span className="text-[10px] text-text-secondary whitespace-nowrap font-medium">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {n.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
