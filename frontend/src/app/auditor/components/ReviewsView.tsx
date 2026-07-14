import React, { useState } from 'react';
import { EventSubmission } from '../types';
import { Search, MapPin, CalendarDays } from 'lucide-react';
import SubmissionDetailModal from './SubmissionDetailModal';

interface ReviewsViewProps {
  submissions: EventSubmission[];
  selectedSubmission: EventSubmission | null;
  setSelectedSubmission: (sub: EventSubmission | null) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onRequestChanges: (id: string, notes: string) => void;
  onVerifyDocument: (submissionId: string, docName: string) => void;
  onRejectDocument: (submissionId: string, docName: string) => void;
  onViewDocument: (doc: { name: string; category: string; status: string }) => void;
}

const FILTERS = ['All', 'Pending', 'Changes Requested', 'Approved', 'Rejected'] as const;

const statusStyle = (status: EventSubmission['status']) =>
  status === 'Pending' ? 'bg-secondary/10 text-secondary border-secondary/20' :
  status === 'Approved' ? 'bg-success/10 text-success border-success/20' :
  status === 'Rejected' ? 'bg-danger/10 text-danger border-danger/20' :
  'bg-warning/10 text-warning border-warning/20';

export default function ReviewsView({ 
  submissions, 
  selectedSubmission,
  setSelectedSubmission,
  onApprove,
  onReject,
  onRequestChanges,
  onVerifyDocument,
  onRejectDocument,
  onViewDocument
}: ReviewsViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<typeof FILTERS[number]>('Pending');

  const filtered = submissions.filter((s) => {
    const matchesFilter = filter === 'All' || s.status === filter;
    const matchesSearch = s.eventName.toLowerCase().includes(search.toLowerCase()) || s.organizerName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Event Reviews</h1>
        <p className="text-sm text-text-secondary">Audit new event submissions before they go live.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 border border-border-subtle rounded-xl soft-shadow">
        <div className="flex items-center gap-2 border border-border-subtle rounded-lg px-3 py-2 w-full sm:w-80 bg-surface-container-low">
          <Search className="w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search event or organizer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-text-primary outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === f ? 'bg-primary text-on-primary shadow-sm' : 'border border-border-subtle text-text-secondary hover:bg-surface-container-low'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubmission(sub)}
            className="text-left bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col justify-between hover:border-outline transition-colors cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <img src={sub.organizerAvatar} alt={sub.organizerName} className="w-9 h-9 rounded-full object-cover border border-border-subtle" />
                  <div>
                    <h4 className="text-sm font-bold text-text-primary leading-tight">{sub.eventName}</h4>
                    <span className="text-[10px] text-on-surface-variant font-mono font-medium">{sub.organizerName}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border shrink-0 ${statusStyle(sub.status)}`}>
                  {sub.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-on-surface-variant" />
                  <span>{sub.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-on-surface-variant" />
                  <span>{sub.venue}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border-subtle flex justify-between items-center text-[10px] font-mono">
              <span className="text-on-surface-variant">Stage: <strong className="text-text-primary">{sub.stage}</strong></span>
              <span className="text-on-surface-variant">{sub.id}</span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="md:col-span-2 bg-white border border-border-subtle rounded-xl p-10 text-center">
            <p className="text-sm font-bold text-text-primary">No submissions match this filter</p>
            <p className="text-xs text-text-secondary mt-1">Try a different status or clear your search.</p>
          </div>
        )}
      </div>

      {selectedSubmission && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onApprove={onApprove}
          onReject={onReject}
          onRequestChanges={onRequestChanges}
          onVerifyDocument={onVerifyDocument}
          onRejectDocument={onRejectDocument}
          onViewDocument={onViewDocument}
        />
      )}
    </div>
  );
}
