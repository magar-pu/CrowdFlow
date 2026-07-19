"use client";

import React, { useState } from 'react';
import { EventSubmission, RiskLevel } from '../types';
import { Search, MapPin, CalendarDays, Shield, AlertTriangle, FileText, ArrowUpDown } from 'lucide-react';

interface ReviewsViewProps {
  submissions: EventSubmission[];
  onSelectSubmission: (submission: EventSubmission) => void;
}

const FILTERS = ['All', 'Pending', 'Changes Requested', 'Approved', 'Rejected'] as const;
const RISK_FILTERS = ['All Risk', 'Low', 'Medium', 'High', 'Critical'] as const;
type SortKey = 'date' | 'compliance' | 'lastUpdated' | 'risk';

const statusStyle = (status: EventSubmission['status']) =>
  status === 'Pending' ? 'bg-secondary/10 text-secondary border-secondary/20' :
  status === 'Approved' ? 'bg-success/10 text-success border-success/20' :
  status === 'Rejected' ? 'bg-danger/10 text-danger border-danger/20' :
  'bg-warning/10 text-warning border-warning/20';

const riskStyle = (r: RiskLevel) =>
  r === 'Low' ? 'bg-success/10 text-success border-success/20' :
  r === 'Medium' ? 'bg-warning/10 text-warning border-warning/20' :
  r === 'High' ? 'bg-orange-100 text-orange-600 border-orange-200' :
  'bg-danger/10 text-danger border-danger/20';

const riskOrder: Record<RiskLevel, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 };

export default function ReviewsView({ submissions, onSelectSubmission }: ReviewsViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<typeof FILTERS[number]>('Pending');
  const [riskFilter, setRiskFilter] = useState<typeof RISK_FILTERS[number]>('All Risk');
  const [sortKey, setSortKey] = useState<SortKey>('lastUpdated');

  const filtered = submissions
    .filter(s => {
      const matchesStatus = filter === 'All' || s.status === filter;
      const matchesRisk = riskFilter === 'All Risk' || s.riskLevel === riskFilter;
      const q = search.toLowerCase();
      const matchesSearch = !q || s.eventName.toLowerCase().includes(q) ||
        s.organizerName.toLowerCase().includes(q) ||
        s.venue.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q);
      return matchesStatus && matchesRisk && matchesSearch;
    })
    .sort((a, b) => {
      if (sortKey === 'compliance') return b.complianceScore - a.complianceScore;
      if (sortKey === 'risk') return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      if (sortKey === 'date') return a.date.localeCompare(b.date);
      return b.lastUpdated.localeCompare(a.lastUpdated);
    });

  const pendingCount = submissions.filter(s => s.status === 'Pending').length;

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Event Reviews</h1>
          <p className="text-sm text-text-secondary mt-0.5">Audit event submissions before they go live.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-text-secondary">{pendingCount} pending · {submissions.length} total</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-border-subtle rounded-xl p-4 soft-shadow space-y-3">
        {/* Search */}
        <div className="flex items-center gap-2 border border-border-subtle rounded-lg px-3 py-2 w-full bg-surface-container-low focus-within:bg-white focus-within:border-outline transition-colors">
          <Search className="w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search by event name, organizer, location, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-text-primary outline-none"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${filter === f ? 'bg-primary text-on-primary border-primary shadow-sm' : 'border-border-subtle text-text-secondary hover:bg-surface-container-low'}`}
            >
              {f}
            </button>
          ))}
          <div className="w-px h-5 bg-border-subtle self-center mx-1" />
          {RISK_FILTERS.map(r => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${riskFilter === r ? 'bg-primary text-on-primary border-primary shadow-sm' : 'border-border-subtle text-text-secondary hover:bg-surface-container-low'}`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Sort Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-text-secondary flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> Sort by:</span>
          {([['date', 'Event Date'], ['compliance', 'Compliance Score'], ['lastUpdated', 'Last Updated'], ['risk', 'Risk Level']] as [SortKey, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${sortKey === k ? 'bg-secondary/10 text-secondary border-secondary/20 font-bold' : 'border-border-subtle text-text-secondary hover:bg-surface-container-low'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(sub => (
          <div
            key={sub.id}
            onClick={() => onSelectSubmission(sub)}
            className="bg-white border border-border-subtle rounded-2xl overflow-hidden soft-shadow flex flex-col hover:border-outline hover:shadow-md transition-all group text-left cursor-pointer"
          >
            {/* Top part: Image Banner with overlays */}
            <div className="relative h-40 w-full bg-slate-100 overflow-hidden">
              <img
                src={sub.bannerUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80'}
                alt={sub.eventName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Risk Badge on Top-Left */}
              <div className="absolute top-3 left-3">
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold border uppercase tracking-wider ${riskStyle(sub.riskLevel)}`}>
                  {sub.riskLevel} Risk
                </span>
              </div>
              {/* Status Badge on Top-Right */}
              <div className="absolute top-3 right-3">
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold border uppercase tracking-wider ${statusStyle(sub.status)}`}>
                  {sub.status}
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-text-secondary font-mono uppercase tracking-wider block mb-1">
                  {sub.organizerName} · {sub.category}
                </span>
                <h4 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors leading-tight mb-3">
                  {sub.eventName}
                </h4>

                {/* Meta details */}
                <div className="space-y-2 text-xs text-text-secondary mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                    <span>{sub.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                    <span className="truncate">{sub.venue}</span>
                  </div>
                </div>
              </div>

              <div>
                {/* 3-Column Metrics Panel */}
                <div className="bg-surface-container-low border border-border-subtle rounded-xl p-3 grid grid-cols-3 gap-2 text-center text-xs mb-4">
                  <div>
                    <p className="text-[8px] font-mono text-text-secondary uppercase tracking-wider">Compliance</p>
                    <p className={`text-xs font-bold mt-0.5 ${
                      sub.complianceScore >= 80 ? 'text-success' : sub.complianceScore >= 50 ? 'text-warning' : 'text-danger'
                    }`}>
                      {sub.complianceScore}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] font-mono text-text-secondary uppercase tracking-wider">Missing Docs</p>
                    <p className={`text-xs font-bold mt-0.5 ${sub.missingDocs > 0 ? 'text-danger' : 'text-text-secondary'}`}>
                      {sub.missingDocs}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] font-mono text-text-secondary uppercase tracking-wider">Capacity</p>
                    <p className="text-xs font-bold text-text-primary mt-0.5">
                      {sub.capacity >= 1000 ? `${(sub.capacity / 1000).toFixed(1)}k` : sub.capacity}
                    </p>
                  </div>
                </div>

                {/* Footer action link */}
                <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                  <span className="text-[9px] font-mono text-text-secondary uppercase">
                    ID: {sub.id}
                  </span>
                  <span className="text-xs font-semibold text-secondary flex items-center gap-1 group-hover:underline">
                    Audit Submission →
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 bg-white border border-border-subtle rounded-xl p-10 text-center">
            <p className="text-sm font-bold text-text-primary">No submissions match this filter</p>
            <p className="text-xs text-text-secondary mt-1">Try a different status, risk level, or clear your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
