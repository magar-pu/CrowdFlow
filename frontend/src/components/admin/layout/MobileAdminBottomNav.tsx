"use client";

import {
  BarChart3,
  CalendarRange,
  DollarSign,
  LayoutDashboard,
  Settings2,
  Users2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AdminView =
  | "dashboard"
  | "analytics"
  | "events"
  | "users"
  | "finance"
  | "settings"
  | "workspace";

interface MobileAdminBottomNavProps {
  currentView: AdminView;
  onViewChange: (view: AdminView) => void;
  pendingVerificationsCount: number;
}

interface MobileNavItem {
  id: Exclude<AdminView, "workspace">;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export default function MobileAdminBottomNav({
  currentView,
  onViewChange,
  pendingVerificationsCount,
}: MobileAdminBottomNavProps) {
  const items: MobileNavItem[] = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "events", label: "Events", icon: CalendarRange },
    {
      id: "users",
      label: "Users",
      icon: Users2,
      badge: pendingVerificationsCount > 0 ? pendingVerificationsCount : undefined,
    },
    { id: "finance", label: "Finance", icon: DollarSign },
    { id: "settings", label: "Settings", icon: Settings2 },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-overlay backdrop-blur-md md:hidden"
      aria-label="Admin mobile navigation"
    >
      <div className="grid grid-cols-6 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentView === item.id || (item.id === "events" && currentView === "workspace");

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={`relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold transition-colors ${
                isActive
                  ? "bg-secondary/5 text-secondary"
                  : "text-text-secondary hover:bg-surface hover:text-text-primary"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate leading-none">{item.label}</span>
              {item.badge !== undefined && (
                <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-on-error">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
