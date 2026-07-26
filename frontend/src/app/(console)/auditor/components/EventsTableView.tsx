"use client";

import React, { useEffect, useState } from 'react';
import { Search, Calendar, MapPin, Tag } from 'lucide-react';
import { listEventReviews } from '@/lib/api/auditor';
import { EventSubmission } from '../types';

export default function EventsTableView() {
  const [events, setEvents] = useState<EventSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        const res = await listEventReviews({ limit: 100 });
        if (res.success && res.data) {
          setEvents(res.data);
        } else {
          setError(res.error?.message || 'Failed to fetch auditor events');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch auditor events');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  const safeEvents = Array.isArray(events) ? events : [];
  const filteredEvents = safeEvents.filter(e => 
    (e?.eventName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e?.organizerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e?.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Matches the status pills used by the Reviews, Organizers and Payouts lists:
  // 9px bold in a bordered rounded-full capsule.
  const STATUS_PILL =
    'inline-block px-2.5 py-0.5 rounded-full border font-bold text-[9px] uppercase tracking-wider whitespace-nowrap';

  const getStatusBadge = (status: string) => {
    const [label, tone] = ((): [string, string] => {
      switch (status?.toLowerCase()) {
        case 'approved':
          return ['Approved', 'bg-success/10 text-success border-success/20'];
        case 'pending':
        case 'in review':
          return ['Pending Review', 'bg-secondary/10 text-secondary border-secondary/20'];
        case 'changes requested':
        case 'need revision':
          return ['Changes Requested', 'bg-warning/10 text-warning border-warning/20'];
        case 'rejected':
          return ['Rejected', 'bg-danger/10 text-danger border-danger/20'];
        default:
          return [status || 'Draft', 'bg-surface-container text-text-secondary border-border-subtle'];
      }
    })();

    return <span className={`${STATUS_PILL} ${tone}`}>{label}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in text-left pb-12">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Master Event List</h2>
          <p className="text-sm text-text-secondary">View all registered events in the system for audit.</p>
        </div>
      </div>

      <div className="bg-surface-white rounded-xl border border-border-subtle soft-shadow overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row gap-4 justify-between items-center bg-surface-white">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search by event title, organizer, or category..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-text-secondary font-mono uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4 font-bold border-b border-border-subtle">Event Details</th>
                <th className="px-6 py-4 font-bold border-b border-border-subtle">Status</th>
                <th className="px-6 py-4 font-bold border-b border-border-subtle">Category</th>
                <th className="px-6 py-4 font-bold border-b border-border-subtle">Organizer</th>
                <th className="px-6 py-4 font-bold border-b border-border-subtle">Submitted Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-surface-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                    Loading events...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-danger">
                    Error loading events: {error}
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                    No events found matching your search.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-surface transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded overflow-hidden bg-surface flex-shrink-0 border border-border-subtle">
                          <img src={evt.bannerUrl || 'https://via.placeholder.com/40'} alt={evt.eventName} className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <div className="font-semibold text-text-primary line-clamp-1">{evt.eventName}</div>
                          <div className="text-xs text-text-muted font-mono mt-0.5">ID: {evt.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(evt.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Tag className="w-3.5 h-3.5" />
                        <span>{evt.category || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-text-secondary">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="line-clamp-1">{evt.organizerName || 'Unknown Organizer'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{evt.submittedAt ? new Date(evt.submittedAt).toLocaleDateString() : 'TBA'}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

