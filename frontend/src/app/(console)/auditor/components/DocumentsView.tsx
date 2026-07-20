import React, { useState } from 'react';
import { DocumentReview } from '../types';
import { Search, FileText, CheckCircle2, XCircle } from 'lucide-react';

interface DocumentsViewProps {
  documents: DocumentReview[];
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  onViewDocument: (doc: DocumentReview) => void;
}

const FILTERS = ['All', 'WAITING REVIEW', 'READY', 'VERIFIED', 'REJECTED'] as const;

const statusStyle = (status: DocumentReview['status']) =>
  status === 'VERIFIED' ? 'bg-success/10 text-success border-success/20' :
  status === 'REJECTED' ? 'bg-danger/10 text-danger border-danger/20' :
  'bg-secondary/10 text-secondary border-secondary/20';

export default function DocumentsView({ documents, onVerify, onReject, onViewDocument }: DocumentsViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<typeof FILTERS[number]>('WAITING REVIEW');

  const filtered = documents.filter((d) => {
    const matchesFilter = filter === 'All' || d.status === filter;
    const matchesSearch = d.fileName.toLowerCase().includes(search.toLowerCase()) || d.eventName.toLowerCase().includes(search.toLowerCase()) || d.organizerName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Document Verification</h1>
        <p className="text-sm text-text-secondary">Review uploaded permits, contracts, and supporting files.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 border border-border-subtle rounded-xl soft-shadow">
        <div className="flex items-center gap-2 border border-border-subtle rounded-lg px-3 py-2 w-full sm:w-80 bg-surface-container-low">
          <Search className="w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search document, event, or organizer..."
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

      <div className="bg-white border border-border-subtle rounded-xl overflow-hidden soft-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-border-subtle">
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Document</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Category</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Event</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Organizer</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Status</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-sans text-xs text-text-primary">
              {filtered.map((doc) => (
                <tr key={doc.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-container-low transition-colors">
                  <td className="p-4 cursor-pointer" onClick={() => onViewDocument(doc)}>
                    <div className="flex items-center gap-2 group">
                      <FileText className="w-3.5 h-3.5 text-on-surface-variant group-hover:text-blue-600 shrink-0 transition-colors" />
                      <span className="font-bold text-text-primary group-hover:text-blue-600 border-b border-transparent group-hover:border-blue-600 transition-all">{doc.fileName}</span>
                    </div>
                  </td>
                  <td className="p-4 text-text-secondary">{doc.category}</td>
                  <td className="p-4 font-medium text-text-primary">{doc.eventName}</td>
                  <td className="p-4 text-text-secondary">{doc.organizerName}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded font-mono text-[8px] font-bold border ${statusStyle(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {doc.status === 'VERIFIED' || doc.status === 'REJECTED' ? (
                      <span className="text-[10px] text-on-surface-variant font-mono">Resolved</span>
                    ) : (
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => onVerify(doc.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-success/20 bg-success/5 hover:bg-success hover:text-white text-success text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verify
                        </button>
                        <button
                          onClick={() => onReject(doc.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-danger/20 bg-danger/5 hover:bg-danger hover:text-white text-danger text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-xs text-on-surface-variant font-mono">No documents match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
