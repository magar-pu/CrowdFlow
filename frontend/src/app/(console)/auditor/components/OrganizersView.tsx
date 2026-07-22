"use client";

import React, { useState } from 'react';
import { OrganizerVerification, OrganizerStatus } from '../types';
import {
  Search, ArrowUpDown, MapPin, CalendarDays, Clock
} from 'lucide-react';

interface OrganizersViewProps {
  organizers: OrganizerVerification[];
  onSelectOrganizer: (organizer: OrganizerVerification) => void;
}

const STATUS_FILTERS: (OrganizerStatus | 'All')[] = ['All', 'Pending', 'Verified', 'Need Revision', 'Rejected', 'Suspended'];
const BUSINESS_FILTERS = ['All Types', 'PT / Limited Liability', 'CV / Partnership', 'Individual'];

const statusColors: Record<OrganizerStatus, string> = {
  Pending: 'bg-secondary/10 text-secondary border-secondary/20',
  Verified: 'bg-success/10 text-success border-success/20',
  'Need Revision': 'bg-warning/10 text-warning border-warning/20',
  Rejected: 'bg-danger/10 text-danger border-danger/20',
  Suspended: 'bg-slate-200 text-slate-700 border-slate-300',
};

export default function OrganizersView({
  organizers,
  onSelectOrganizer,
}: OrganizersViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrganizerStatus | 'All'>('Pending');
  const [businessFilter, setBusinessFilter] = useState('All Types');
  const [sortKey, setSortKey] = useState<'date' | 'risk' | 'name'>('date');

  const filtered = organizers
    .filter(org => {
      const matchesStatus = statusFilter === 'All' || org.status === statusFilter;
      const matchesBusiness = businessFilter === 'All Types' || org.businessType === businessFilter;
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        org.name.toLowerCase().includes(q) ||
        org.companyName.toLowerCase().includes(q) ||
        org.picEmail.toLowerCase().includes(q) ||
        org.id.toLowerCase().includes(q);
      return matchesStatus && matchesBusiness && matchesSearch;
    })
    .sort((a, b) => {
      if (sortKey === 'risk') return b.riskScore - a.riskScore;
      if (sortKey === 'name') return a.companyName.localeCompare(b.companyName);
      return b.registrationDate.localeCompare(a.registrationDate); // latest first
    });

  // Summary counts
  const stats = {
    pending: organizers.filter(o => o.status === 'Pending').length,
    verified: organizers.filter(o => o.status === 'Verified').length,
    revision: organizers.filter(o => o.status === 'Need Revision').length,
    rejected: organizers.filter(o => o.status === 'Rejected').length,
    suspended: organizers.filter(o => o.status === 'Suspended').length,
  };

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Organizer Verification</h1>
        <p className="text-sm text-text-secondary mt-0.5">Validate and verify event organizer credentials.</p>
      </div>

      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Pending Review', value: stats.pending, color: 'text-secondary bg-secondary/5 border-secondary/20' },
          { label: 'Verified', value: stats.verified, color: 'text-success bg-success/5 border-success/20' },
          { label: 'Need Revision', value: stats.revision, color: 'text-warning bg-warning/5 border-warning/20' },
          { label: 'Rejected', value: stats.rejected, color: 'text-danger bg-danger/5 border-danger/20' },
          { label: 'Suspended', value: stats.suspended, color: 'text-slate-500 bg-slate-100 border-slate-200' },
        ].map(s => (
          <div key={s.label} className={`border border-border-subtle rounded-xl p-4 soft-shadow text-center ${s.color}`}>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-[10px] text-text-secondary font-mono uppercase mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-border-subtle rounded-xl p-4 soft-shadow space-y-3">
        <div className="flex items-center gap-2 border border-border-subtle rounded-lg px-3 py-2 w-full bg-surface-container-low focus-within:bg-white focus-within:border-outline transition-colors">
          <Search className="w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search by organizer name, company name, email, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-text-primary outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${statusFilter === f ? 'bg-primary text-white border-primary shadow-xs' : 'border-border-subtle text-text-secondary hover:bg-surface-container-low'}`}
            >
              {f}
            </button>
          ))}
          <div className="w-px h-5 bg-border-subtle self-center mx-1" />
          {BUSINESS_FILTERS.map(b => (
            <button
              key={b}
              onClick={() => setBusinessFilter(b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${businessFilter === b ? 'bg-secondary text-white border-secondary' : 'border-border-subtle text-text-secondary hover:bg-surface-container-low'}`}
            >
              {b}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[10px] font-mono text-text-secondary flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> Sort by:</span>
          {([['date', 'Reg Date'], ['risk', 'Risk Score'], ['name', 'Company Name']] as const).map(([k, label]) => (
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

      {/* Organizers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(org => (
          <div
            key={org.id}
            onClick={() => onSelectOrganizer(org)}
            className="bg-white border border-border-subtle rounded-2xl p-5 soft-shadow flex flex-col hover:border-outline hover:shadow-md transition-all group text-left cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <img src={org.logo} alt={org.name} className="w-11 h-11 rounded-full object-cover border border-border-subtle shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-text-primary leading-tight truncate group-hover:text-primary transition-colors">{org.name}</h4>
                  <p className="text-[10px] text-text-secondary font-mono truncate">{org.companyName}</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold border shrink-0 ${statusColors[org.status]}`}>
                {org.status}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-text-secondary mb-4 flex-1">
              <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-on-surface-variant shrink-0" /><span className="truncate">{org.province}</span></div>
              <div className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5 text-on-surface-variant shrink-0" /><span>Reg: {org.registrationDate}</span></div>
              <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-on-surface-variant shrink-0" /><span>Activity: {org.lastActivity}</span></div>
            </div>

            <div className="bg-surface-container-low border border-border-subtle rounded-xl p-3 grid grid-cols-2 gap-2 text-center text-xs mb-4">
              <div>
                <p className="text-[8px] font-mono text-text-secondary uppercase tracking-wider">Risk Category</p>
                <p className={`text-xs font-bold mt-0.5 ${org.riskCategory === 'Low' ? 'text-success' : org.riskCategory === 'Medium' ? 'text-warning' : 'text-danger'}`}>{org.riskCategory}</p>
              </div>
              <div>
                <p className="text-[8px] font-mono text-text-secondary uppercase tracking-wider">Risk Score</p>
                <p className="text-xs font-bold text-text-primary mt-0.5">{org.riskScore}%</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border-subtle text-[10px] font-mono">
              <span>{org.id}</span>
              <span className="text-xs font-semibold text-secondary flex items-center gap-1 group-hover:underline">
                Review Details →
              </span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 bg-white border border-border-subtle rounded-xl p-10 text-center">
            <p className="text-sm font-bold text-text-primary">No organizers found matching this filter</p>
            <p className="text-xs text-text-secondary mt-1">Try another search keyword or clear filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
