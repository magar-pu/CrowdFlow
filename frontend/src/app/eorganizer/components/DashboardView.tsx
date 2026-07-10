import React from 'react';
import { Order } from '../types';
import { DollarSign, Ticket, CalendarDays, QrCode, TrendingUp, Minus, MapPin, Plus } from 'lucide-react';

interface DashboardViewProps {
  onCreateEvent: () => void;
  onNavigateToView: (view: 'orders' | 'events' | 'finance' | 'reports') => void;
}

export default function DashboardView({ onCreateEvent, onNavigateToView }: DashboardViewProps) {
  const kpis = [
    { title: 'Total Revenue', value: '$1,240,000', change: '+12.5% from last month', icon: DollarSign, isPositive: true },
    { title: 'Tickets Sold', value: '17,095', change: '+5.2% from last month', icon: Ticket, isPositive: true },
    { title: 'Active Events', value: '3', change: 'No change', icon: CalendarDays, isPositive: null },
    { title: "Today's Check-ins", value: '1,204', change: 'Peak arrival time', icon: QrCode, isPositive: true },
  ];

  const recentOrders: Order[] = [
    {
      id: 'ORD-9901',
      customerName: 'Alice Cooper',
      customerEmail: 'alice@cooper.org',
      eventName: 'Global Tech Summit 2024',
      ticketType: 'VIP All-Access',
      paymentMethod: 'Credit Card',
      amount: 350,
      status: 'Paid',
      time: 'Oct 10, 10:32 AM'
    },
    {
      id: 'ORD-9902',
      customerName: 'Bob Dylan',
      customerEmail: 'bob@dylan.com',
      eventName: 'Aurora Music Festival',
      ticketType: 'General Admission',
      paymentMethod: 'Bank Transfer',
      amount: 150,
      status: 'Paid',
      time: 'Nov 02, 04:15 PM'
    },
    {
      id: 'ORD-9903',
      customerName: 'Charlie Sheen',
      customerEmail: 'charlie@sheen.tv',
      eventName: 'Executive Leadership Retreat',
      ticketType: 'VIP All-Access',
      paymentMethod: 'Credit Card',
      amount: 1250,
      status: 'Pending',
      time: 'Dec 01, 08:00 AM'
    }
  ];

  return (
    <div className="space-y-8 pb-12 text-left">
      <section className="flex flex-col gap-1">
        <h2 className="font-sans text-3xl font-bold text-text-primary tracking-tight">Good Morning, Alex</h2>
        <p className="font-sans text-sm text-text-secondary font-normal">Welcome back. Here&apos;s what&apos;s happening with your events today.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <div className="flex items-baseline gap-2">
                <span className="font-sans text-2xl font-bold text-text-primary">{kpi.value}</span>
              </div>
              <div className={`flex items-center gap-1 font-mono text-[10px] font-bold ${
                kpi.isPositive ? 'text-success' : 'text-text-secondary'
              }`}>
                {kpi.isPositive ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                <span>{kpi.change}</span>
              </div>
            </div>
          );
        })}
      </section>

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
                {recentOrders.map((order, idx) => (
                  <tr key={idx} className="border-b border-border-subtle hover:bg-surface-container-low transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-text-primary">{order.customerName}</div>
                      <div className="text-[10px] text-on-surface-variant">{order.eventName}</div>
                    </td>
                    <td className="p-3 text-right font-semibold font-mono">${order.amount.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-mono text-[8px] font-bold ${
                        order.status === 'Paid' ? 'status-paid' : 'status-pending'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-4">
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
          <div onClick={() => onNavigateToView('events')} className="bg-white rounded-xl border border-border-subtle soft-shadow overflow-hidden flex flex-col group cursor-pointer hover:border-outline transition-all duration-300">
            <div className="h-28 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format')" }}></div>
            <div className="p-4 flex flex-col gap-1.5 text-left">
              <h4 className="font-bold text-text-primary group-hover:text-secondary transition-colors text-sm">Global Tech Summit 2024</h4>
              <p className="text-xs text-text-secondary flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-secondary" />Moscone Center, SF</p>
            </div>
          </div>
          <div onClick={() => onNavigateToView('events')} className="bg-white rounded-xl border border-border-subtle soft-shadow overflow-hidden flex flex-col group cursor-pointer hover:border-outline transition-all duration-300">
            <div className="h-28 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format')" }}></div>
            <div className="p-4 flex flex-col gap-1.5 text-left">
              <h4 className="font-bold text-text-primary group-hover:text-secondary transition-colors text-sm">Aurora Music Festival</h4>
              <p className="text-xs text-text-secondary flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-secondary" />Zilker Park, Austin</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
