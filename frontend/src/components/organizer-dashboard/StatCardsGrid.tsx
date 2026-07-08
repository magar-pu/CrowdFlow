/**
 * components/organizer-dashboard/StatCardsGrid.tsx
 *
 * The 4-card bento grid at the top of the dashboard: Total Revenue,
 * Tickets Sold, Avg Capacity Usage, Upcoming Events. Matches
 * organizer_dashboard_overview_white_theme Stitch markup exactly,
 * including the hover lift (widget-hover) and per-card icon tint.
 */

import Link from "next/link";
import { TrendingUp, Ticket, Users, CalendarClock, ArrowRight } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { formatIDR } from "@/lib/pricing";
import type { DashboardStats } from "@/types/ticket";

interface StatCardsGridProps {
  stats: DashboardStats;
}

export function StatCardsGrid({ stats }: StatCardsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-4">
      {/* Total Revenue */}
      <div className="flex h-[180px] flex-col justify-between rounded-xl border border-border-subtle bg-surface-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Total Revenue
            </p>
            <h3 className="font-headline-md text-headline-md text-text-primary">
              {formatIDR(stats.total_revenue)}
            </h3>
          </div>
          <div className="flex items-center justify-center rounded-lg bg-success/10 p-2 text-success">
            <TrendingUp size={20} />
          </div>
        </div>
        <div className="mt-4">
          <p className="font-body-sm text-body-sm font-medium text-success">
            +{stats.total_revenue_change_pct}%{" "}
            <span className="font-normal text-text-secondary">
              vs last month
            </span>
          </p>
          <div className="mt-2 h-8 w-full opacity-60">
            <Sparkline data={stats.revenue_sparkline} color="#10b981" />
          </div>
        </div>
      </div>

      {/* Tickets Sold */}
      <div className="flex h-[180px] flex-col justify-between rounded-xl border border-border-subtle bg-surface-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Tickets Sold
            </p>
            <h3 className="font-headline-md text-headline-md text-text-primary">
              {stats.tickets_sold.toLocaleString("en-US")}
            </h3>
          </div>
          <div className="flex items-center justify-center rounded-lg bg-secondary/10 p-2 text-secondary">
            <Ticket size={20} />
          </div>
        </div>
        <div className="mt-4">
          <p className="font-body-sm text-body-sm font-medium text-success">
            +{stats.tickets_sold_change_pct}%{" "}
            <span className="font-normal text-text-secondary">
              vs last month
            </span>
          </p>
          <div className="mt-2 h-8 w-full opacity-60">
            <Sparkline data={stats.tickets_sparkline} color="#2563eb" />
          </div>
        </div>
      </div>

      {/* Avg Capacity Usage */}
      <div className="flex h-[180px] flex-col justify-between rounded-xl border border-border-subtle bg-surface-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Avg Capacity Usage
            </p>
            <h3 className="font-headline-md text-headline-md text-text-primary">
              {stats.avg_capacity_usage_pct}%
            </h3>
          </div>
          <div className="flex items-center justify-center rounded-lg bg-warning/10 p-2 text-warning">
            <Users size={20} />
          </div>
        </div>
        <div className="mt-4 w-full">
          <div className="mb-1 flex justify-between font-label-sm text-label-sm text-text-secondary">
            <span>Target: {stats.avg_capacity_target_pct}%</span>
            <span>{stats.avg_capacity_usage_pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-container">
            <div
              className="h-2 rounded-full bg-warning"
              style={{ width: `${stats.avg_capacity_usage_pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <Link
        href="/dashboard/events"
        className="group flex h-[180px] cursor-pointer flex-col justify-between rounded-xl border border-border-subtle bg-surface-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Upcoming Events
            </p>
            <h3 className="font-headline-md text-headline-md text-text-primary">
              {stats.upcoming_events_count}
            </h3>
          </div>
          <div className="flex items-center justify-center rounded-lg bg-primary/10 p-2 text-primary">
            <CalendarClock size={20} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 font-label-md text-label-md text-secondary">
          View Schedule
          <ArrowRight
            size={18}
            className="transition-transform group-hover:translate-x-1"
          />
        </div>
      </Link>
    </div>
  );
}