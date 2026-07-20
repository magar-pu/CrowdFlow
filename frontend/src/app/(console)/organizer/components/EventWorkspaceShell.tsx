"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EventWorkspaceHeader from "./EventWorkspaceHeader";
import { useOrganizerData } from "../OrganizerDataContext";
import { getEventRevisions, publishOrganizerEvent, EventRevisionFeedback } from "@/lib/api/eorganizer";
import { AlertTriangle, XCircle, Send, CheckCircle2, Clock, ShieldAlert } from "lucide-react";

interface EventWorkspaceShellProps {
  eventId: string;
  activeTab: string;
  children: React.ReactNode;
}

export default function EventWorkspaceShell({ eventId, activeTab, children }: EventWorkspaceShellProps) {
  const router = useRouter();
  const { events, fetchData } = useOrganizerData();
  const event = events.find((e) => e.id === eventId);

  const [revisionFeedback, setRevisionFeedback] = useState<EventRevisionFeedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resubmitSuccess, setResubmitSuccess] = useState(false);

  useEffect(() => {
    if (event && (event.status === "Need Revision" || event.status === "Rejected")) {
      getEventRevisions(Number(eventId)).then((res) => {
        if (res.success && res.data) {
          setRevisionFeedback(res.data);
        }
      });
    }
  }, [event?.id, event?.status]);

  const handleResubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await publishOrganizerEvent(Number(eventId));
      if (res.success) {
        setResubmitSuccess(true);
        await fetchData();
        setTimeout(() => setResubmitSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to resubmit event:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!event) {
    return (
      <div className="bg-white border border-border-subtle rounded-xl p-10 text-center animate-fade-in">
        <p className="text-sm font-bold text-text-primary">Event not found</p>
        <p className="text-xs text-text-secondary mt-1">"{eventId}" does not match any event.</p>
        <button
          onClick={() => router.push('/organizer/events')}
          className="mt-3 text-xs font-bold text-secondary hover:underline cursor-pointer"
        >
          Back to Events
        </button>
      </div>
    );
  }

  const isNeedRevision = event.status === "Need Revision";
  const isRejected = event.status === "Rejected";

  return (
    <>
      <EventWorkspaceHeader
        event={event}
        workspaceTab={activeTab}
        setWorkspaceTab={(tab) => router.push(tab === 'overview' ? `/organizer/events/${eventId}` : `/organizer/events/${eventId}/${tab}`)}
        onBack={() => router.push('/organizer/events')}
      />

      {/* Auditor Revision & Feedback Banner */}
      {(isNeedRevision || isRejected) && (
        <div className={`mt-4 p-5 rounded-xl border shadow-sm text-left animate-fade-in ${
          isNeedRevision
            ? "bg-amber-500/10 border-amber-500/30 text-amber-900"
            : "bg-rose-500/10 border-rose-500/30 text-rose-900"
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {isNeedRevision ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <h3 className="text-sm font-bold tracking-tight">
                  {isNeedRevision ? "Action Required: Auditor Revision Request" : "Event Application Rejected"}
                </h3>
              </div>
              <p className="text-xs text-text-secondary">
                {isNeedRevision
                  ? "The auditor has requested changes for this event. Please update the details below and resubmit for approval."
                  : "This event application was rejected by the auditor portal."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => router.push(`/organizer/events/${eventId}/revisions`)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-border-subtle hover:bg-surface-container text-text-primary text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>View Revision Details</span>
              </button>

              <button
                onClick={handleResubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Submitting..." : "Resubmit Event to Auditor"}</span>
              </button>
            </div>
          </div>

          {/* Detailed Auditor Feedback Notes */}
          {revisionFeedback?.auditorNotes && (
            <div className="mt-4 p-3 bg-white/80 border border-border-subtle rounded-lg space-y-1">
              <span className="text-[10px] font-mono font-bold text-text-secondary uppercase">
                Auditor Note ({revisionFeedback.assignedAuditorName || "Auditor"})
              </span>
              <p className="text-xs font-semibold text-text-primary leading-relaxed">
                {revisionFeedback.auditorNotes}
              </p>
            </div>
          )}

          {/* List of Specific Required Actions */}
          {revisionFeedback?.revisions && revisionFeedback.revisions.length > 0 && (
            <div className="mt-3 space-y-2">
              <span className="text-[10px] font-mono font-bold text-text-secondary uppercase block">
                Required Revision Items
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {revisionFeedback.revisions.map((rev) => (
                  <div key={rev.id} className="p-3 bg-white border border-border-subtle rounded-lg text-xs space-y-1 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-text-primary">{rev.title}</span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface-container text-text-secondary">
                        {rev.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-snug">{rev.description}</p>
                    <div className="pt-1 text-[10px] font-mono text-primary font-bold">
                      Action: {rev.requiredAction}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resubmitSuccess && (
            <div className="mt-3 p-2 bg-success/20 border border-success/30 rounded-lg text-xs font-bold text-success flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Event successfully resubmitted to auditor portal! Status changed to In Review.</span>
            </div>
          )}
        </div>
      )}

      {children}
    </>
  );
}
