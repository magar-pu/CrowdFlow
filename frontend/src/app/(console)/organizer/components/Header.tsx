import React, { useState, useEffect } from 'react';
import { Bell, Search, Activity, Play, RefreshCw, Building2, ChevronsUpDown, Check, Menu, CheckCircle, HelpCircle } from 'lucide-react';
import { LogEntry } from '../types';
import { listNotifications, markNotificationsRead, ApiNotification } from '@/lib/api/eorganizer';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

const ORGANIZATIONS = ['CrowdFlow Inc.', 'Nightfall Presents', 'Summit Live Events'];

interface HeaderProps {
  currentTabName: string;
  selectedEventName?: string;
  onResetData?: () => void;
  onTriggerLiveScan?: () => void;
  onOpenMenu?: () => void;
  recentLogs?: LogEntry[];
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  user?: {
    name: string;
    role: string;
    avatar: string;
  };
}

export default function Header({
  currentTabName,
  selectedEventName,
  onResetData,
  onTriggerLiveScan,
  onOpenMenu,
  recentLogs = [],
  searchQuery = '',
  setSearchQuery,
  user,
}: HeaderProps) {
  const router = useRouter();
  const [showLogsPopup, setShowLogsPopup] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [activeOrg, setActiveOrg] = useState(ORGANIZATIONS[0]);

  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const { user: storeUser } = useAuthStore();

  const email = storeUser?.email || 'organizer@crowdflow.my.id';
  const fullName = storeUser?.full_name || user?.name || 'Event Organizer';
  const displayRole = storeUser?.role ? storeUser.role.replace('_', ' ') : user?.role || 'verified organizer';
  const displayName = fullName || email.split('@')[0];
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('') || email[0];

  const fetchNotifications = async () => {
    const res = await listNotifications();
    if (res.success && res.data) {
      setNotifications(res.data);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleNotifications = async () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState && unreadNotifications.length > 0) {
      await markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  const handleNotificationClick = async (n: ApiNotification) => {
    setShowNotifications(false);
    if (!n.isRead) {
      try {
        await markNotificationsRead([n.id]);
        fetchNotifications();
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    }

    if (!n.resourceType || !n.resourceId) return;

    if (n.resourceType === 'event') {
      router.push(`/organizer/events/${n.resourceId}`);
    } else if (n.resourceType === 'payout') {
      router.push('/organizer/finance');
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.isRead);

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <header
      className="sticky top-0 z-10 flex min-h-[72px] w-full items-center justify-between gap-3 border-b border-border-subtle bg-surface-white/95 px-6 py-3 backdrop-blur-md"
    >
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
            {selectedEventName ? `WORKSPACE: ${selectedEventName}` : 'CROWDFLOW PORTAL'}
          </span>
          <h2 className="text-sm font-bold text-text-primary capitalize leading-tight">
            {currentTabName.replace('-', ' ')}
          </h2>
        </div>
      </div>

      {setSearchQuery && (
        <div className="hidden sm:flex items-center gap-2 border border-border-subtle rounded-lg px-3 py-1.5 w-64 bg-surface-container-low focus-within:bg-white focus-within:border-outline transition-colors">
          <Search className="w-3.5 h-3.5 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Quick search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-text-primary outline-none placeholder-on-surface-variant"
          />
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-success/20 bg-success/5 px-3 py-1 text-xs font-medium text-success">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>Operational</span>
        </div>

        <button
          onClick={() => alert('CrowdFlow Organizer Help Center: guides for events, ticketing, and check-in operations.')}
          className="hidden sm:flex rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-container-low hover:text-text-primary cursor-pointer"
          title="Help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {selectedEventName && onTriggerLiveScan && (
          <button
            onClick={onTriggerLiveScan}
            className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
            title="Simulate a random barcode scan check-in"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Live Scan</span>
          </button>
        )}

        {onResetData && (
          <button
            onClick={onResetData}
            className="hidden sm:flex items-center gap-1 text-text-secondary hover:text-text-primary border border-border-subtle hover:bg-surface-container-low rounded-lg p-1.5 text-xs font-semibold cursor-pointer transition-colors"
            title="Reset simulation data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        {selectedEventName && recentLogs.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowLogsPopup(!showLogsPopup)}
              className="relative p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-container-low border border-border-subtle rounded-lg cursor-pointer transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-success"></span>
            </button>

            {showLogsPopup && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-border-subtle rounded-xl shadow-xl z-30 p-4 animate-fade-in text-left">
                <h4 className="text-xs font-bold text-text-primary mb-3 border-b border-border-subtle pb-2">
                  Real-time Gate Feed
                </h4>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {recentLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="text-[10px] space-y-0.5 border-b border-surface-container-low pb-2">
                      <div className="flex justify-between font-mono text-on-surface-variant">
                        <span>{log.gate} ({log.staff})</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <p className="text-text-primary font-medium leading-relaxed">
                        {log.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
            className="hidden sm:flex items-center gap-1.5 border border-border-subtle hover:bg-surface-container-low rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text-primary transition-colors cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-text-secondary" />
            <span className="max-w-[120px] truncate">{activeOrg}</span>
            <ChevronsUpDown className="w-3 h-3 text-text-secondary" />
          </button>

          {showOrgSwitcher && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-border-subtle rounded-xl shadow-xl z-30 p-1.5 animate-fade-in">
              {ORGANIZATIONS.map((org) => (
                <button
                  key={org}
                  onClick={() => { setActiveOrg(org); setShowOrgSwitcher(false); }}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-text-primary hover:bg-surface-container-low transition-colors cursor-pointer text-left"
                >
                  <span className="truncate">{org}</span>
                  {org === activeOrg && <Check className="w-3.5 h-3.5 text-secondary shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={handleToggleNotifications}
            className="relative p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-container-low border border-border-subtle rounded-lg cursor-pointer transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-on-error ring-2 ring-white animate-pulse">
                {unreadNotifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-border-subtle rounded-xl shadow-xl z-30 p-4 animate-fade-in text-left">
              <h4 className="text-xs font-bold text-text-primary mb-3 border-b border-border-subtle pb-2">Notifications</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
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
                        <span>{formatTimeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-text-secondary leading-relaxed pl-2.5">{n.detail}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-text-secondary font-mono">
                    No new notifications.
                  </div>
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
