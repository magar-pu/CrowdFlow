import React from 'react';
import { DollarSign, Ticket, CalendarDays, Users, ClipboardCheck, Repeat, TrendingUp, Minus, MapPin, Plus, RefreshCw } from 'lucide-react';
import { useEorganizerData } from '../EorganizerDataContext';

interface DashboardViewProps {
  onCreateEvent: () => void;
  onNavigateToView: (view: 'orders' | 'events' | 'finance' | 'reports') => void;
}

const LAST_UPDATED = new Date().toISOString().slice(0, 10);

export default function DashboardView({ onCreateEvent, onNavigateToView }: DashboardViewProps) {
  const { dashboardData, isLoading, fetchData } = useEorganizerData();

  const kpis = [
    {
      title: 'Total Revenue',
      value: dashboardData ? `$${dashboardData.stats.totalRevenue.toLocaleString()}` : '$0',
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
      value: dashboardData ? `$${dashboardData.stats.grossSales.toLocaleString()}` : '$0',
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
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
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
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white rounded-xl border border-border-subtle soft-shadow flex flex-col">
          <div className="p-5 border-b border-border-subtle flex justify-between items-center">
            <h3 className="font-sans text-base font-bold text-text-primary">Revenue Analytics</h3>
            <div className="flex gap-2">
              <span className="px-2.5 py-1 text-[10px] font-mono font-bold rounded bg-surface-container text-text-primary">30D</span>
            </div>
          </div>
          <div className="p-5 flex-1 min-h-[220px] relative flex flex-col justify-between">
            <div className="relative w-full h-44 mt-2">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <line x1="0" y1="25" x2="100" y2="25" stroke="#F1F5F9" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#F1F5F9" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="#F1F5F9" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="0" y1="100" x2="100" y2="100" stroke="var(--color-border-subtle)" strokeWidth="0.75" />
                <path d="M0,80 Q20,72 40,65 T80,48 T100,45 L100,100 L0,100 Z" fill="url(#revGrad)" opacity="0.15" />
                <defs>
                  <linearGradient id="revGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-secondary)" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <path d="M0,80 Q20,72 40,65 T80,48 T100,45" fill="none" stroke="var(--color-secondary)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[8px] text-on-surface-variant font-mono leading-none">
                <span>$1.5M</span><span>$1.0M</span><span>$500k</span><span>$0</span>
              </div>
              <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[9px] text-on-surface-variant font-mono">
                <span>Oct 1</span><span>Oct 10</span><span>Oct 20</span><span>Oct 30</span>
              </div>
            </div>
          </div>
        </section>

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
                {recentOrders.map((order, idx) => {
                  const isPaid = order.status.toLowerCase() === "paid";
                  return (
                    <tr key={idx} className="border-b border-border-subtle hover:bg-surface-container-low transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-text-primary">{order.customerName}</div>
                        <div className="text-[10px] text-on-surface-variant">{order.eventName}</div>
                      </td>
                      <td className="p-3 text-right font-semibold font-mono">${order.amount.toFixed(2)}</td>
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
      </div>

      <section className="flex flex-col gap-4 animate-fade-in">
        <div className="flex justify-between items-center">
          <h3 className="font-sans text-base font-bold text-text-primary">Active Deployments</h3>
          <button
            onClick={onCreateEvent}
            className="px-4 py-2 bg-secondary text-white hover:bg-secondary/90 rounded-lg font-sans text-xs font-semibold shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4 text-white" />
            Create Event
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(dashboardData?.recentEvents || []).slice(0, 2).map((event) => (
            <div
              key={event.id}
              onClick={() => onNavigateToView("events")}
              className="bg-white rounded-xl border border-border-subtle soft-shadow overflow-hidden flex flex-col group cursor-pointer hover:border-outline transition-all duration-300"
            >
              <div
                className="h-28 bg-cover bg-center"
                style={{ backgroundImage: `url('${event.image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format"}')` }}
              ></div>
              <div className="p-4 flex flex-col gap-1.5 text-left">
                <h4 className="font-bold text-text-primary group-hover:text-secondary transition-colors text-sm">{event.name}</h4>
                <p className="text-xs text-text-secondary flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-secondary" />
                  {event.venueName}, {event.location}
                </p>
              </div>
            </div>
          ))}
          {(dashboardData?.recentEvents || []).length === 0 && !isLoading && (
            <div className="md:col-span-2 py-10 text-center text-xs text-text-secondary border border-dashed border-border-subtle rounded-xl bg-white">
              No active deployments found. Click &quot;Create Event&quot; to begin.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
