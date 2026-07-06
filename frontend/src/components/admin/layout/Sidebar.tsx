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
  Sparkles
} from 'lucide-react';


interface SidebarProps {
  currentView: string;
  onViewChange: (view: 'dashboard' | 'analytics' | 'events' | 'users' | 'finance' | 'settings' | 'workspace') => void;
  pendingVerificationsCount: number;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  onLogout?: () => void;
}

export default function Sidebar({ 
  currentView, 
  onViewChange, 
  pendingVerificationsCount,
  userName = "Richie M.",
  userRole = "Platform Administrator",
  userAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
  onLogout
}: SidebarProps) {
  const router = useRouter();

  interface MenuItem {
    readonly id: 'dashboard' | 'analytics' | 'events' | 'users' | 'finance' | 'settings';
    readonly name: string;
    readonly icon: React.ComponentType<any>;
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

  const handleExit = () => {
    if (onLogout) {
      onLogout();
    } else {
      router.push('/login');
    }
  };

  return (
    <aside 
      id="sidebar" 
      className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-white text-slate-800 transition-transform duration-300 md:translate-x-0"
    >
      {/* Brand Logo Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900">CrowdFlow</span>
            <div className="text-[10px] font-medium tracking-wide text-indigo-600 uppercase">Super Admin</div>
          </div>
        </div>
      </div>

      {/* Nav Menu Items */}
      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id || (item.id === 'events' && currentView === 'workspace');
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => onViewChange(item.id)}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  isActive ? 'bg-white text-indigo-600' : 'bg-rose-50/10 text-rose-600 border border-rose-500/20'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin Profile Footer */}
      <div className="border-t border-slate-200 p-4 bg-slate-50/50">
        <div className="flex items-center gap-3 rounded-xl p-2 bg-slate-100/50">
          <img 
            id="admin-avatar-footer"
            src={userAvatar} 
            alt={`${userName} Admin`} 
            referrerPolicy="no-referrer"
            className="h-10 w-10 rounded-full object-cover border border-indigo-500/20"
          />
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-semibold text-slate-800 truncate">{userName}</h4>
            <p className="text-xs text-slate-500 truncate">{userRole}</p>
          </div>
        </div>
        
        <button 
          onClick={handleExit}
          className="mt-4 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 cursor-pointer"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span>Exit Console</span>
        </button>
      </div>
    </aside>
  );
}
