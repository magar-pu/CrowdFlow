import React, { useState } from 'react';
import { Bell, Search, Activity, Play, RefreshCw, Building2, ChevronsUpDown, Check } from 'lucide-react';
import { LogEntry } from '../types';

const ORGANIZATIONS = ['CrowdFlow Inc.', 'Nightfall Presents', 'Summit Live Events'];
const MOCK_NOTIFICATIONS = [
  { id: 'n-1', title: 'Payout processed', detail: 'Your last settlement of $12,450 was deposited.', time: '2h ago' },
  { id: 'n-2', title: 'Low ticket stock', detail: 'VIP Pass for "Neon Nights" is under 10% remaining.', time: '5h ago' },
  { id: 'n-3', title: 'New team member', detail: 'Liam Vance accepted your Manager invite.', time: '1d ago' },
];

interface HeaderProps {
  currentTabName: string;
  selectedEventName?: string;
  onResetData?: () => void;
  onTriggerLiveScan?: () => void;
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
  recentLogs = [],
  searchQuery = '',
  setSearchQuery,
  user = {
    name: 'Alex Rivera',
    role: 'Event Admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop',
  },
}: HeaderProps) {
  const [showLogsPopup, setShowLogsPopup] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [activeOrg, setActiveOrg] = useState(ORGANIZATIONS[0]);

  return (
    <header
      className="sticky top-0 z-10 flex min-h-[72px] w-full items-center justify-between gap-3 border-b border-border-subtle bg-surface-white/95 px-6 py-3 backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
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
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-container-low border border-border-subtle rounded-lg cursor-pointer transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-danger"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-border-subtle rounded-xl shadow-xl z-30 p-4 animate-fade-in text-left">
              <h4 className="text-xs font-bold text-text-primary mb-3 border-b border-border-subtle pb-2">Notifications</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {MOCK_NOTIFICATIONS.map((n) => (
                  <div key={n.id} className="text-[10px] space-y-0.5 border-b border-surface-container-low pb-2 last:border-0">
                    <div className="flex justify-between font-mono text-on-surface-variant">
                      <span className="font-bold text-text-primary text-[11px] font-sans">{n.title}</span>
                      <span>{n.time}</span>
                    </div>
                    <p className="text-text-secondary leading-relaxed">{n.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-surface-container-high"></div>

        <div className="flex items-center gap-3">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-9 h-9 rounded-full border border-border-subtle object-cover shadow-sm"
          />
          <div className="hidden sm:block text-left">
            <h4 className="text-xs font-bold text-text-primary leading-tight">{user.name}</h4>
            <p className="text-[10px] text-text-secondary leading-normal font-medium">{user.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
