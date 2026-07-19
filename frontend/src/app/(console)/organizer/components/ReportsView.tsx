import React from 'react';
import { BarChart3, TrendingUp, Users } from 'lucide-react';

export default function ReportsView() {
  return (
    <div className="space-y-8 text-left animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">System Reports</h1>
        <p className="text-sm text-text-secondary">Analyze overall marketing reach, channels, and conversion statistics.</p>
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
              <span className="font-bold text-success">17,095</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-secondary" />
            Conversion Rate
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center space-y-2">
            <span className="text-4xl font-extrabold text-secondary">93.9%</span>
            <p className="text-xs text-text-secondary text-center leading-normal max-w-[200px]">
              Extremely high checkout-to-purchase ratio due to optimized checkout queues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
