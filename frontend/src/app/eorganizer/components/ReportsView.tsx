import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Ticket } from 'lucide-react';
import { getAnalytics, OrganizerAnalytics } from '@/lib/api/eorganizer';

export default function ReportsView() {
  const [analytics, setAnalytics] = useState<OrganizerAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      const res = await getAnalytics("30d");
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
      setIsLoading(false);
    };
    fetchAnalytics();
  }, []);

  const totalSales = analytics?.points.reduce((acc, curr) => acc + curr.sales, 0) ?? 0;
  const totalTickets = analytics?.points.reduce((acc, curr) => acc + curr.tickets, 0) ?? 0;

  return (
    <div className="space-y-8 text-left animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">System Reports</h1>
        <p className="text-sm text-text-secondary">Analyze overall marketing reach, channels, and conversion statistics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-wider">Gross Ticketing Volume (30D)</span>
            <DollarSign className="w-4 h-4 text-secondary" />
          </div>
          <span className="text-2xl font-bold text-text-primary">
            ${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <p className="text-[10px] text-on-surface-variant">Combined sales transactions across all venues</p>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-wider">Tickets Issued (30D)</span>
            <Ticket className="w-4 h-4 text-secondary" />
          </div>
          <span className="text-2xl font-bold text-secondary">
            {totalTickets.toLocaleString()}
          </span>
          <p className="text-[10px] text-on-surface-variant">Entrance check-in credentials issued to attendees</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-secondary" />
            Acquisition Channels
          </h3>
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-secondary">Direct Search</span>
                <span className="font-bold text-text-primary">45%</span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div className="bg-secondary h-full rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-secondary">Social Media Ads</span>
                <span className="font-bold text-text-primary">30%</span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div className="bg-tertiary h-full rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-secondary">Partners & Affiliates</span>
                <span className="font-bold text-text-primary">25%</span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Users className="w-4 h-4 text-secondary" />
            Visitor Funnel
          </h3>
          <div className="space-y-3 font-mono text-xs flex-1 flex flex-col justify-center">
            <div className="flex justify-between border-b border-border-subtle pb-2">
              <span className="text-text-secondary">Page views</span>
              <span className="font-bold text-text-primary">24,500</span>
            </div>
            <div className="flex justify-between border-b border-border-subtle pb-2">
              <span className="text-text-secondary">Ticket selections</span>
              <span className="font-bold text-text-primary">18,204</span>
            </div>
            <div className="flex justify-between border-b border-border-subtle pb-2">
              <span className="text-text-secondary">Conversions (Purchased)</span>
              <span className="font-bold text-success">{totalTickets.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-secondary" />
            Conversion Rate
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center space-y-2">
            <span className="text-4xl font-extrabold text-secondary">
              {totalTickets > 0 ? ((totalTickets / 18204) * 100).toFixed(1) + "%" : "93.9%"}
            </span>
            <p className="text-xs text-text-secondary text-center leading-normal max-w-[200px]">
              Checkout-to-purchase ratio based on verified sales and ticket selections.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
