import React from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Ticket, CalendarDays, ClipboardCheck, Repeat, TrendingUp, Minus, MapPin, Plus, RefreshCw, ArrowRight } from 'lucide-react';
import { RecentOrder, RecentEvent } from '@/lib/api/eorganizer';
import { useOrganizerData } from '../OrganizerDataContext';
import { formatIDR } from "@/lib/pricing";

interface DashboardViewProps {
  onCreateEvent: () => void;
  onNavigateToView: (view: 'orders' | 'events' | 'finance' | 'reports') => void;
}

const LAST_UPDATED = new Date().toISOString().slice(0, 10);

export default function DashboardView({ onCreateEvent, onNavigateToView }: DashboardViewProps) {
  const router = useRouter();
  const { dashboardData, isLoading, fetchData } = useOrganizerData();

  const kpis = [
    {
      title: 'Total Revenue',
      value: dashboardData ? formatIDR(dashboardData.stats.totalRevenue) : formatIDR(0),
      change: 'Total cumulative earnings',
      icon: DollarSign,
      isPositive: true,
    },
    {
      title: 'Active Events',
      value: dashboardData ? String(dashboardData.stats.activeEvents) : '0',
      change: 'Deployments live on store',
      icon: CalendarDays,
      isPositive: null,
    },
    {
      title: 'Tickets Sold',
      value: dashboardData ? dashboardData.stats.ticketsSold.toLocaleString() : '0',
      change: 'Total check-in credentials issued',
      icon: Ticket,
      isPositive: true,
    },
    {
      title: 'Gross Sales',
      value: dashboardData ? formatIDR(dashboardData.stats.grossSales) : formatIDR(0),
      change: 'Raw ticketing volume',
      icon: DollarSign,
      isPositive: true,
    },
    {
      title: 'Verification Queue',
      value: dashboardData ? String(dashboardData.stats.verificationQueue) : '0',
      change: 'Documents pending verification',
      icon: ClipboardCheck,
      isPositive: false,
    },
    {
      title: 'Active Resale',
      value: dashboardData ? String(dashboardData.stats.activeResale) : '0',
      change: 'Listings on verified marketplace',
      icon: Repeat,
      isPositive: null,
    },
  ];

  const recentOrders = dashboardData?.recentOrders || [];

  return (
    <div className="space-y-8 pb-12 text-left">
      <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex flex-col gap-1 animate-fade-in">
          <h2 className="font-sans text-3xl font-bold text-text-primary tracking-tight">Organizer Control Center</h2>
          <p className="font-sans text-sm text-text-secondary font-normal">Monitor operations, analyze transaction streams, and deploy ticketing updates.</p>
          <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">Updated {LAST_UPDATED}</p>
        </div>
        <button
          onClick={async () => {
            await fetchData();
          }}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 border border-border-subtle hover:bg-surface-container-low rounded-lg font-sans text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Force Sync DB
        </button>
      </section>

      {isLoading && !dashboardData ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-border-subtle soft-shadow flex flex-col gap-3 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-2 w-20 bg-surface-container rounded"></div>
                <div className="h-4 w-4 bg-surface-container rounded-full"></div>
              </div>
              <div className="h-6 w-24 bg-surface-container rounded"></div>
              <div className="h-2 w-28 bg-surface-container rounded"></div>
            </div>
          ))}
        </section>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl p-5 border border-border-subtle soft-shadow flex flex-col gap-2 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider">{kpi.title}</span>
                  <Icon className="w-4 h-4 text-on-surface-variant" />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-sans text-2xl font-bold text-text-primary">{kpi.value}</span>
                </div>
                <div className={`flex items-center gap-1 font-mono text-[10px] font-bold ${
                  kpi.isPositive ? 'text-success' : kpi.isPositive === false ? 'text-warning' : 'text-text-secondary'
                }`}>
                  {kpi.isPositive ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  <span>{kpi.change}</span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="bg-white rounded-xl border border-border-subtle soft-shadow flex flex-col overflow-hidden">
          <div className="p-5 border-b border-border-subtle flex justify-between items-center">
            <h3 className="font-sans text-base font-bold text-text-primary">Recent Orders</h3>
            <button onClick={() => onNavigateToView('orders')} className="text-secondary font-sans text-xs font-semibold hover:underline cursor-pointer">
              View All
            </button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-border-subtle">
                  <th className="p-3 font-mono text-[9px] text-text-secondary uppercase font-bold">Customer</th>
                  <th className="p-3 font-mono text-[9px] text-text-secondary uppercase font-bold text-right">Amount</th>
                  <th className="p-3 font-mono text-[9px] text-text-secondary uppercase font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="font-sans text-xs text-text-primary">
                {recentOrders.map((order: RecentOrder, idx: number) => {
                  const isPaid = order.status.toLowerCase() === "paid";
                  return (
                    <tr key={idx} className="border-b border-border-subtle hover:bg-surface-container-low transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-text-primary">{order.customerName}</div>
                        <div className="text-[10px] text-on-surface-variant">{order.eventName}</div>
                      </td>
                      <td className="p-3 text-right font-semibold font-mono">{formatIDR(order.amount)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-mono text-[8px] font-bold ${
                          isPaid ? 'status-paid' : 'status-pending'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-xs text-text-secondary">
                      No recent transactions processed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      <section className="flex flex-col gap-4 animate-fade-in">
        <div className="flex justify-between items-center">
          <h3 className="font-sans text-base font-bold text-text-primary">Active Deployments</h3>
          <button
            onClick={onCreateEvent}
            className="px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-lg font-sans text-xs font-semibold shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4 text-white" />
            Create Event
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {(dashboardData?.recentEvents || []).map((event: RecentEvent) => {
            const capPercent = event.capacity > 0 ? Math.round((event.sold / event.capacity) * 100) : 0;
            return (
              <div
                key={event.id}
                onClick={() => router.push(`/organizer/events/${event.id}`)}
                className="bg-white border border-border-subtle rounded-xl flex flex-col overflow-hidden soft-shadow group transition-all duration-300 hover:shadow-lg hover:border-outline cursor-pointer"
              >
                <div
                  className="h-44 w-full bg-cover bg-center relative bg-surface-container-low"
                  style={event.image ? { backgroundImage: `url('${event.image}')` } : undefined}
                >
                  <div className="absolute top-4 right-4">
                    <span className={`backdrop-blur-sm border px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm font-mono text-[9px] font-bold ${
                      event.status === 'Live' ? 'bg-success/90 text-white border-success' :
                      event.status === 'Approved' ? 'bg-white/90 text-success border-success' :
                      event.status === 'Need Revision' ? 'bg-amber-500 text-white border-amber-600' :
                      event.status === 'Rejected' ? 'bg-rose-600 text-white border-rose-700' :
                      event.status === 'In Review' ? 'bg-blue-600 text-white border-blue-700' :
                      event.status === 'Archived' ? 'bg-slate-500/90 text-white border-slate-600' :
                      'bg-white/90 text-text-primary border-border-subtle'
                    }`}>
                      {event.status === 'Live' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      )}
                      {event.status}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-sans text-base font-bold text-text-primary mb-1 truncate group-hover:text-secondary transition-colors">
                    {event.name}
                  </h3>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 mt-1">
                    <div className="flex items-center gap-1.5 text-text-secondary font-mono text-[10px]">
                      <CalendarDays className="w-3.5 h-3.5 text-secondary" />
                      {event.date || '—'}
                    </div>
                    <div className="flex items-center gap-1.5 text-text-secondary font-mono text-[10px] truncate max-w-[150px]">
                      <MapPin className="w-3.5 h-3.5 text-secondary" />
                      {[event.venueName, event.location].filter(Boolean).join(', ') || 'No venue set'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4 bg-surface-container-low p-3 rounded-lg border border-border-subtle">
                    <div>
                      <div className="font-mono text-[9px] text-on-surface-variant mb-0.5">Revenue</div>
                      <div className="font-sans text-xs font-bold text-text-primary">
                        {typeof event.revenue === 'number' ? formatIDR(event.revenue) : event.revenue}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] text-on-surface-variant mb-0.5">Sold</div>
                      <div className="font-sans text-xs font-bold text-text-primary">
                        {(event.sold ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] text-on-surface-variant mb-0.5">Ratio</div>
                      <div className="font-sans text-xs font-bold text-secondary">
                        {event.status === 'Draft' ? '0%' : `${capPercent}%`}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border-subtle flex justify-end">
                    <span className="text-secondary font-sans text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                      Open Workspace
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {(dashboardData?.recentEvents || []).length === 0 && !isLoading && (
            <div className="col-span-full py-10 text-center text-xs text-text-secondary border border-dashed border-border-subtle rounded-xl bg-white">
              No active deployments found. Click &quot;Create Event&quot; to begin.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
