"use client";

import React from 'react';
import { UserCheck, FileText } from 'lucide-react';
import { VerificationApplication } from '../types';

interface VerificationQueueProps {
  verifications: VerificationApplication[];
  onApproveVerification: (id: string) => void;
  onRejectVerification: (id: string) => void;
}

export default function VerificationQueue({
  verifications,
  onApproveVerification,
  onRejectVerification
}: VerificationQueueProps) {
  const pendingApplicants = verifications.filter(v => v.status === 'Pending');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-white border-b border-slate-900 pb-3">Identity Validation Pipeline</h3>
        
        <div className="mt-4 space-y-4">
          {pendingApplicants.length === 0 ? (
            <div className="py-16 text-center text-slate-500 border border-dashed border-slate-900 rounded-2xl bg-slate-950/20">
              <UserCheck className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">All identity verification files processed.</p>
              <p className="text-xs text-slate-500 mt-1">Excellent job! Zero backlogs in active validation queue.</p>
            </div>
          ) : (
            pendingApplicants.map((applicant) => (
              <div key={applicant.id} className="rounded-2xl border border-slate-900 bg-slate-900/15 p-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-sm font-extrabold text-indigo-400 border border-indigo-500/20 self-start">
                    {applicant.name.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-200">{applicant.name}</h4>
                      <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[9px] font-medium text-indigo-400 border border-indigo-500/20">
                        {applicant.businessType}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">{applicant.email}</p>
                    
                    {/* Mock document layout */}
                    <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 p-2.5 max-w-sm">
                      <FileText className="h-4.5 w-4.5 text-slate-500" />
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[10px] text-slate-300 font-semibold truncate">{applicant.documentType}</p>
                        <p className="text-[9px] text-slate-500 font-mono">FILE: CF_ID_AUDIT_{applicant.id}.PDF</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => alert(`Opening raw document viewer for files matching applicant: ${applicant.name}`)}
                        className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 cursor-pointer"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    onClick={() => onApproveVerification(applicant.id)}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                  >
                    <span>Approve Applicant</span>
                  </button>
                  <button
                    onClick={() => onRejectVerification(applicant.id)}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 px-4 text-xs font-semibold text-slate-400 hover:text-rose-455 hover:bg-rose-500/5 transition-all cursor-pointer"
                  >
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
