import React from 'react';
import { EventSubmission, DocumentReview, AuditorActivity } from '../types';
import { ClipboardCheck, CheckCircle2, XCircle, Timer, FileCheck2, ArrowUpRight } from 'lucide-react';

interface DashboardViewProps {
  submissions: EventSubmission[];
  documents: DocumentReview[];
  activity: AuditorActivity[];
  onNavigateToView: (view: 'reviews' | 'documents') => void;
}

export default function DashboardView({ submissions, documents, activity, onNavigateToView }: DashboardViewProps) {
  const pending = submissions.filter(s => s.status === 'Pending').length;
  const approvedToday = submissions.filter(s => s.status === 'Approved').length;
  const rejected = submissions.filter(s => s.status === 'Rejected').length;
  const docsWaiting = documents.filter(d => d.status === 'WAITING REVIEW').length;

  const kpis = [
    { title: 'Pending Reviews', value: pending, icon: ClipboardCheck, accent: 'text-secondary bg-secondary/10 border-secondary/20' },
    { title: 'Approved', value: approvedToday, icon: CheckCircle2, accent: 'text-success bg-success/10 border-success/20' },
    { title: 'Rejected', value: rejected, icon: XCircle, accent: 'text-danger bg-danger/10 border-danger/20' },
    { title: 'Avg. Review Time', value: '6.4 hrs', icon: Timer, accent: 'text-primary bg-primary/10 border-primary/20' },
    { title: 'Documents Pending', value: docsWaiting, icon: FileCheck2, accent: 'text-tertiary bg-tertiary/10 border-tertiary/20' },
  ];

  const queuePreview = submissions.filter(s => s.status === 'Pending').slice(0, 4);

  return (
    <div className="space-y-8 pb-12 text-left animate-fade-in">
      <section className="flex flex-col gap-1">
        <h2 className="font-sans text-3xl font-bold text-text-primary tracking-tight">Good Morning, Priya</h2>
        <p className="font-sans text-sm text-text-secondary font-normal">Here&apos;s the state of the compliance queue today.</p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.title} className="bg-white rounded-xl p-5 border border-border-subtle soft-shadow flex flex-col gap-2 hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider">{kpi.title}</span>
                <div className={`p-1.5 rounded-lg border ${kpi.accent}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <span className="font-sans text-2xl font-bold text-text-primary">{kpi.value}</span>
            </div>
          );
        })}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white rounded-xl border border-border-subtle soft-shadow flex flex-col">
          <div className="p-5 border-b border-border-subtle flex justify-between items-center">
            <h3 className="font-sans text-base font-bold text-text-primary">Review Queue</h3>
            <button onClick={() => onNavigateToView('reviews')} className="text-secondary font-sans text-xs font-semibold hover:underline cursor-pointer">
              View All
            </button>
          </div>
          <div className="divide-y divide-border-subtle">
            {queuePreview.length === 0 ? (
              <p className="p-6 text-center text-xs text-on-surface-variant font-mono">Queue is empty. Nice work.</p>
            ) : queuePreview.map((sub) => (
              <button
                key={sub.id}
                onClick={() => onNavigateToView('reviews')}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img src={sub.organizerAvatar} alt={sub.organizerName} className="w-9 h-9 rounded-full object-cover border border-border-subtle shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{sub.eventName}</p>
                    <p className="text-[10px] text-on-surface-variant font-mono">{sub.organizerName} &middot; {sub.stage}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 font-mono text-[9px] font-bold shrink-0">
                  {sub.category}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-border-subtle soft-shadow flex flex-col overflow-hidden">
          <div className="p-5 border-b border-border-subtle">
            <h3 className="font-sans text-base font-bold text-text-primary">Recent Activity</h3>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto max-h-[320px]">
            {activity.map((a) => (
              <div key={a.id} className="text-xs border-b border-border-subtle pb-3 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-primary flex items-center gap-1">
                    {a.action} <ArrowUpRight className="w-3 h-3 text-on-surface-variant" />
                  </span>
                  <span className="text-[9px] text-on-surface-variant font-mono">{a.timestamp}</span>
                </div>
                <p className="text-text-secondary mt-1 leading-relaxed">{a.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
