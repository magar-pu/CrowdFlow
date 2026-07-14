import React, { useState } from 'react';
import { Bell, Search, Menu, CheckCircle, HelpCircle } from 'lucide-react';

const MOCK_NOTIFICATIONS = [
  { id: 'n-1', title: 'New submission', detail: '"Riverside Jazz Weekend" entered the review queue.', time: '2d ago' },
  { id: 'n-2', title: 'Document uploaded', detail: 'Aurora Live Events uploaded a new artist agreement.', time: '3d ago' },
];

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenMenu?: () => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  user?: {
    name: string;
    role: string;
    avatar: string;
  };
}

export default function Header({
  title,
  subtitle,
  onOpenMenu,
  searchQuery = '',
  setSearchQuery,
  user = {
    name: 'Priya Nair',
    role: 'Compliance Auditor',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  },
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

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

      {setSearchQuery && (
        <div className="hidden sm:flex items-center gap-2 border border-border-subtle rounded-lg px-3 py-1.5 w-64 bg-surface-container-low focus-within:bg-white focus-within:border-outline transition-colors">
          <Search className="w-3.5 h-3.5 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search submissions, documents..."
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
          onClick={() => alert('CrowdFlow Auditor Help Center: review guidelines, escalation paths, and compliance policy references.')}
          className="hidden sm:flex rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-container-low hover:text-text-primary cursor-pointer"
          title="Help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-container-low border border-border-subtle rounded-lg cursor-pointer transition-colors"
          >
            <Bell className="w-4 h-4" />
            {MOCK_NOTIFICATIONS.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-on-error ring-2 ring-white">
                {MOCK_NOTIFICATIONS.length}
              </span>
            )}
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
