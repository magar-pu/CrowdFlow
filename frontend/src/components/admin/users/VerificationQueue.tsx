"use client";

import React from 'react';
import { UserCheck, FileText } from 'lucide-react';
import { VerificationApplication } from '@/types/admin';

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
      <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm">
        <h3 className="border-b border-border-subtle pb-3 text-sm font-bold text-text-primary">Identity Verification Queue</h3>
        
        <div className="mt-4 space-y-4">
          {pendingApplicants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-subtle bg-surface py-16 text-center text-text-secondary">
              <UserCheck className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm font-semibold text-text-primary">All identity verification files are processed.</p>
              <p className="mt-1 text-xs text-text-secondary">No pending applications at the moment.</p>
            </div>
          ) : (
            pendingApplicants.map((applicant) => (
              <div key={applicant.id} className="flex flex-col gap-5 rounded-lg border border-border-subtle bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-12 w-12 items-center justify-center self-start rounded-lg border border-secondary/20 bg-secondary/5 text-sm font-extrabold text-secondary">
                    {applicant.name.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-text-primary">{applicant.name}</h4>
                      <span className="rounded-full border border-secondary/20 bg-secondary/5 px-2 py-0.5 text-[9px] font-medium text-secondary">
                        {applicant.businessType}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-secondary">{applicant.email}</p>
                    
                    {/* Mock document layout */}
                    <div className="mt-2.5 flex max-w-sm items-center gap-2 rounded-lg border border-border-subtle bg-surface-white p-2.5">
                      <FileText className="h-4.5 w-4.5 text-text-secondary" />
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-[10px] font-semibold text-text-primary">{applicant.documentType}</p>
                        <p className="text-[9px] text-text-secondary">File: CF-ID-{applicant.id}.pdf</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => alert(`Opening raw document viewer for files matching applicant: ${applicant.name}`)}
                        className="text-[10px] font-bold text-secondary hover:text-primary cursor-pointer"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    onClick={() => onApproveVerification(applicant.id)}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-success px-4 text-xs font-semibold text-on-success transition-colors hover:bg-success/90 cursor-pointer"
                  >
                    <span>Approve Applicant</span>
                  </button>
                  <button
                    onClick={() => onRejectVerification(applicant.id)}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-white px-4 text-xs font-semibold text-text-secondary transition-all hover:bg-danger/5 hover:text-danger cursor-pointer"
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
