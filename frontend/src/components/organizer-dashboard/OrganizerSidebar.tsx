"use client";

/**
 * components/organizer-dashboard/OrganizerSidebar.tsx
 *
 * Fixed left sidebar for the (organizer) route group: brand block, "Create
 * New Event" primary action, nav links (active state driven by
 * active_href), and a footer link group (Help Center / Log Out).
 * Matches organizer_dashboard_overview_white_theme Stitch markup exactly.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import {
  Plus,
  LayoutDashboard,
  CalendarRange,
  BarChart3,
  Banknote,
  Settings,
  CircleHelp,
  LogOut,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Event Management", href: "/dashboard/events", icon: CalendarRange },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Sales Report", href: "/dashboard/sales-report", icon: Banknote },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface OrganizerSidebarProps {
  active_href: string;
}

export function OrganizerSidebar({ active_href }: OrganizerSidebarProps) {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handle_logout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <nav className="hidden h-full w-64 shrink-0 flex-col justify-between border-r border-border-subtle bg-surface-container-low p-stack-md md:flex">
      <div>
        {/* Header */}
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-lg font-bold text-on-secondary">
            CB
          </div>
          <div>
            <h1 className="truncate font-headline-sm text-base font-bold leading-tight text-primary">
              CrowdFlow Business
            </h1>
            <p className="font-label-sm text-label-sm text-text-secondary">
              Enterprise Tier
            </p>
          </div>
        </div>

        {/* Primary action */}
        <Link
          href="/dashboard/events/new"
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-md text-label-md text-on-primary shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus size={18} />
          Create New Event
        </Link>

        {/* Nav links */}
        <ul className="space-y-1">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const is_active = active_href === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-label-md text-label-md transition-all ${
                    is_active
                      ? "bg-secondary/10 font-bold text-secondary"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <Icon size={20} />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer links */}
      <ul className="space-y-1 border-t border-border-subtle pt-4">
        <li>
          <Link
            href="/support"
            className="flex items-center gap-3 rounded-lg px-3 py-2 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <CircleHelp size={20} />
            Help Center
          </Link>
        </li>
        <li>
          <button
            type="button"
            onClick={handle_logout}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 font-label-md text-label-md text-danger transition-colors hover:bg-surface-container-high cursor-pointer text-left border-none bg-transparent"
          >
            <LogOut size={20} />
            Log Out
          </button>
        </li>
      </ul>
    </nav>
  );
}