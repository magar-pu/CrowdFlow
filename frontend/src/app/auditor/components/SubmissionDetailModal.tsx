import React, { useState } from 'react';
import { EventSubmission } from '../types';
import { X, CheckCircle2, FileText, MapPin, CalendarDays, Users2, Send, AlertTriangle, Ban } from 'lucide-react';

interface SubmissionDetailModalProps {
  submission: EventSubmission;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onRequestChanges: (id: string, notes: string) => void;
}

const TIMELINE_STAGES = ['Submitted', 'Document Verification', 'Event Validation', 'Final Approval'] as const;

export default function SubmissionDetailModal({ submission, onClose, onApprove, onReject, onRequestChanges }: SubmissionDetailModalProps) {
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'view' | 'reject' | 'changes'>('view');

  const stageIndex = TIMELINE_STAGES.indexOf(submission.stage);
  const isResolved = submission.status !== 'Pending';

  const handleConfirmReject = () => {
    if (!reason.trim()) return;
    onReject(submission.id, reason);
    onClose();
  };

  const handleConfirmChanges = () => {
    if (!reason.trim()) return;
    onRequestChanges(submission.id, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-border-subtle shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <div>
            <span className="font-mono text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">{submission.id}</span>
            <h3 className="text-base font-bold text-text-primary">{submission.eventName}</h3>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-text-primary p-1 rounded transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-left">
          <div className="flex items-center gap-3">
            <img src={submission.organizerAvatar} alt={submission.organizerName} className="w-10 h-10 rounded-full object-cover border border-border-subtle" />
            <div>
              <p className="text-sm font-bold text-text-primary">{submission.organizerName}</p>
              <p className="text-[10px] text-on-surface-variant font-mono">Submitted {submission.submittedAt}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <CalendarDays className="w-3.5 h-3.5 shrink-0" /> {submission.date}
            </div>
            <div className="flex items-center gap-1.5 text-text-secondary">
              <MapPin className="w-3.5 h-3.5 shrink-0" /> {submission.venue}
            </div>
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Users2 className="w-3.5 h-3.5 shrink-0" /> Cap. {submission.capacity.toLocaleString()}
            </div>
          </div>

          {/* Verification Timeline */}
          <div className="space-y-3">
            <p className="text-[10px] font-mono font-bold text-text-secondary uppercase">Verification Timeline</p>
            <div className="relative flex justify-between items-start gap-2">
              <div className="absolute left-4 right-4 top-4 h-0.5 bg-surface-container -z-10"></div>
              {TIMELINE_STAGES.map((stage, idx) => {
                const isCompleted = isResolved || idx < stageIndex;
                const isCurrent = !isResolved && idx === stageIndex;
                return (
                  <div key={stage} className="flex flex-col items-center gap-1.5 flex-1 text-center">
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                      isCompleted ? 'bg-secondary border-secondary text-white' :
                      isCurrent ? 'bg-primary border-primary text-on-primary' :
                      'bg-white border-border-subtle text-on-surface-variant'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <span className={`text-[9px] font-bold ${isCurrent ? 'text-text-primary' : 'text-on-surface-variant'}`}>{stage}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submission Checklist */}
          <div className="grid grid-cols-2 gap-2">
            {submission.checklist.map((item) => (
              <div key={item.label} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${item.done ? 'bg-success/5 text-success' : 'bg-surface-container-low text-on-surface-variant'}`}>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Documents */}
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold text-text-secondary uppercase">Required Documents</p>
            {submission.documents.map((doc, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs px-3 py-2 bg-surface-container-low border border-border-subtle rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-text-primary truncate">{doc.name}</p>
                    <span className="text-[9px] text-on-surface-variant font-mono">{doc.category}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[8px] font-bold shrink-0 ${
                  doc.status === 'VERIFIED' ? 'bg-success/10 text-success' :
                  doc.status === 'REJECTED' ? 'bg-danger/10 text-danger' :
                  'bg-secondary/10 text-secondary'
                }`}>
                  {doc.status}
                </span>
              </div>
            ))}
          </div>

          {submission.notes && (
            <div className="flex items-start gap-2 p-3 bg-warning/5 border border-warning/20 rounded-lg text-xs text-text-primary">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <span>{submission.notes}</span>
            </div>
          )}

          {!isResolved && mode !== 'view' && (
            <div className="space-y-2 pt-2 border-t border-border-subtle">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">
                {mode === 'reject' ? 'Rejection Reason' : 'Requested Changes'}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full p-3 border border-border-subtle rounded-lg text-xs bg-white outline-none resize-none"
                placeholder={mode === 'reject' ? 'Explain why this submission is being rejected...' : 'Describe what the organizer needs to fix...'}
              />
            </div>
          )}
        </div>

        {!isResolved && (
          <div className="p-5 border-t border-border-subtle">
            {mode === 'view' ? (
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => setMode('reject')}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-danger/20 bg-danger/5 hover:bg-danger hover:text-white text-danger text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" /> Reject
                </button>
                <button
                  onClick={() => setMode('changes')}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-warning/20 bg-warning/5 hover:bg-warning hover:text-white text-warning text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Request Changes
                </button>
                <button
                  onClick={() => { onApprove(submission.id); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" /> Approve & Publish
                </button>
              </div>
            ) : (
              <div className="flex gap-2.5">
                <button
                  onClick={() => { setMode('view'); setReason(''); }}
                  className="flex-1 border border-border-subtle text-text-secondary text-xs font-bold py-2.5 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={mode === 'reject' ? handleConfirmReject : handleConfirmChanges}
                  disabled={!reason.trim()}
                  className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                    mode === 'reject' ? 'bg-danger hover:bg-danger/90' : 'bg-warning hover:bg-warning/90'
                  }`}
                >
                  {mode === 'reject' ? 'Confirm Rejection' : 'Send Change Request'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
