"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EventWorkspaceHeader from "./EventWorkspaceHeader";
import { useOrganizerData } from "../OrganizerDataContext";
import {
  getEventRevisions,
  publishOrganizerEvent,
  getPayoutDetails,
  listEventPublicly,
  unlistEvent,
  EventRevisionFeedback,
} from "@/lib/api/eorganizer";
import { AlertTriangle, XCircle, Send, CheckCircle2, Clock, ShieldAlert, Globe, EyeOff } from "lucide-react";

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  // null while unknown, so the button is not disabled on a slow/failed lookup —
  // the server gate is authoritative either way.
  const [payoutReady, setPayoutReady] = useState<boolean | null>(null);
  const [listingBusy, setListingBusy] = useState(false);
  const [listingError, setListingError] = useState<string | null>(null);

  useEffect(() => {
    const s = event?.status?.toLowerCase() || "";
    if (event && (s === "need revision" || s === "needs_revision" || s === "rejected")) {
      getEventRevisions(Number(eventId)).then((res) => {
        if (res.success && res.data) {
          setRevisionFeedback(res.data);
        }
      });
    }
  }, [event?.id, event?.status]);

  // Only drafts can be submitted, so only drafts need the payout pre-check.
  useEffect(() => {
    const s = event?.status?.toLowerCase() || "";
    if (!event || !(s === "draft" || s === "")) return;
    let cancelled = false;
    getPayoutDetails().then((res) => {
      if (cancelled) return;
      // A failed lookup leaves this null rather than false: blocking submission
      // because a secondary request failed would be worse than letting the
      // server gate reject it with the real reason.
      setPayoutReady(res.success && res.data ? res.data.complete : null);
    });
    return () => {
      cancelled = true;
    };
  }, [event?.id, event?.status]);

  /**
   * Revision points the organizer still has to act on. Excludes the states the
   * auditor has closed out — a Resolved/Verified point is settled, and listing
   * it under "Action Required" makes finished work look outstanding.
   */
  const CLOSED_REVISION_STATUSES = ["resolved", "verified"];
  const openRevisions = (revisionFeedback?.revisions ?? []).filter(
    (rev) => !CLOSED_REVISION_STATUSES.includes((rev.status ?? "").toLowerCase())
  );

  const handleResubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await publishOrganizerEvent(Number(eventId));
      if (res.success) {
        setResubmitSuccess(true);
        await fetchData();
        setTimeout(() => setResubmitSuccess(false), 3000);
      } else {
        // The server refuses submission while seats are unpriced
        // (422 SEATING_INCOMPLETE). Surfacing the reason matters — otherwise
        // the button just appears to do nothing.
        setSubmitError(res.error?.message ?? "Failed to submit this event for review.");
      }
    } catch (err) {
      console.error("Failed to resubmit event:", err);
      setSubmitError("Failed to submit this event for review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // The organizer's own go-live switch, separate from the auditor's approval.
  const handleSetListed = async (listed: boolean) => {
    if (!listed && !confirm(
      "Withdraw this event from public listing?\n\n" +
      "It will disappear from browse and search, and no new tickets can be sold. " +
      "Tickets already sold stay valid. You can publish it again at any time."
    )) return;

    setListingBusy(true);
    setListingError(null);
    const res = listed
      ? await listEventPublicly(Number(eventId))
      : await unlistEvent(Number(eventId));
    if (res.success) {
      await fetchData();
    } else {
      setListingError(res.error?.message ?? "Failed to update the public listing.");
    }
    setListingBusy(false);
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

  const sLower = event.status?.toLowerCase() || "";
  const isNeedRevision = sLower === "need revision" || sLower === "needs_revision";
  const isRejected = sLower === "rejected";
  // A draft has never been sent to an auditor — the revision banner below only
  // covers events that came back. Without this, a new event has no way to be
  // submitted at all.
  const isDraft = sLower === "draft" || sLower === "";
  const isPendingReview = sLower === "pending_review" || sLower === "pending review";
  // Approved by an auditor but not yet put on sale — the organizer's call.
  const isApprovedUnlisted = sLower === "approved";
  const isLive = sLower === "live";

  return (
    <>
      <EventWorkspaceHeader
        event={event}
        workspaceTab={activeTab}
        setWorkspaceTab={(tab) => router.push(tab === 'overview' ? `/organizer/events/${eventId}` : `/organizer/events/${eventId}/${tab}`)}
        onBack={() => router.push('/organizer/events')}
      />

      {/* Draft: not yet submitted to an auditor. */}
      {isDraft && (
        <div className="mt-4 p-5 rounded-xl border border-border-subtle bg-white shadow-sm text-left animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-text-primary">Ready for review?</h4>
              <p className="text-xs text-text-secondary mt-1">
                This event is a draft and isn&apos;t visible to buyers. Submit it to send it to an
                auditor for approval. Every seat in the venue layout must be priced first.
              </p>
            </div>

            <button
              onClick={handleResubmit}
              disabled={isSubmitting || payoutReady === false}
              className="flex shrink-0 items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Submitting..." : "Submit Event to Auditor"}</span>
            </button>
          </div>

          {/* Checked up front rather than left to the 422: payout details are
              the one submission requirement fixed OUTSIDE this workspace, so
              failing at the button would send the organizer hunting. */}
          {payoutReady === false && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              <p className="text-xs font-semibold text-warning">
                Add your payout bank details before submitting.{" "}
                <Link href="/organizer/settings" className="underline hover:no-underline">
                  Go to Settings
                </Link>
                . Submitting locks the account for this event.
              </p>
            </div>
          )}

          {submitError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
              <p className="text-xs font-semibold text-danger">{submitError}</p>
            </div>
          )}

          {resubmitSuccess && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-success/30 bg-success/20 px-3 py-2 text-xs font-bold text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span>Submitted to the auditor. This event is now in review.</span>
            </div>
          )}
        </div>
      )}

      {/* Approved by the auditor, but the organizer decides when it goes on sale. */}
      {isApprovedUnlisted && (
        <div className="mt-4 p-5 rounded-xl border border-success/30 bg-success/5 shadow-sm text-left animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                <h4 className="text-sm font-bold text-text-primary">Approved — ready to go live</h4>
              </div>
              <p className="text-xs text-text-secondary">
                An auditor has approved this event. It is <strong>not visible to buyers yet</strong> —
                publish it when you&apos;re ready to start selling.
              </p>
            </div>

            <button
              onClick={() => handleSetListed(true)}
              disabled={listingBusy}
              className="flex shrink-0 items-center gap-2 px-4 py-2 bg-success hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{listingBusy ? "Publishing…" : "Publish Event"}</span>
            </button>
          </div>

          {listingError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
              <p className="text-xs font-semibold text-danger">{listingError}</p>
            </div>
          )}
        </div>
      )}

      {/* Live to the public — the organizer can pull it back at any time. */}
      {isLive && (
        <div className="mt-4 rounded-xl border border-border-subtle bg-white shadow-sm px-5 py-3 text-left animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
              This event is live and on sale to the public.
            </p>
            <button
              onClick={() => handleSetListed(false)}
              disabled={listingBusy}
              className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 border border-border-subtle hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed text-text-primary text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>{listingBusy ? "Withdrawing…" : "Withdraw from public"}</span>
            </button>
          </div>

          {listingError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
              <p className="text-xs font-semibold text-danger">{listingError}</p>
            </div>
          )}
        </div>
      )}

      {/* Awaiting an auditor decision. */}
      {isPendingReview && (
        <div className="mt-4 rounded-xl border border-border-subtle bg-surface-container-low px-5 py-3 text-left animate-fade-in">
          <p className="text-xs font-semibold text-text-secondary">
            Submitted for review — an auditor is checking this event. You&apos;ll be notified if
            changes are requested.
          </p>
        </div>
      )}

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

            {/* Resubmission happens per revision point on the Revisions page
                ("Send Revision to Auditor"), which also records the document
                changelog. A blanket resubmit here bypassed that and raced the
                per-point flow. */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => router.push(`/organizer/events/${eventId}/revisions`)}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>View Revision Details</span>
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

          {/* List of Specific Required Actions.
              Only points that still need the organizer's attention belong in an
              "Action Required" banner — an item the auditor has already accepted
              is history, and leaving it here reads as outstanding work. */}
          {openRevisions.length > 0 && (
            <div className="mt-3 space-y-2">
              <span className="text-[10px] font-mono font-bold text-text-secondary uppercase block">
                Required Revision Items (click an item to respond)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {openRevisions.map((rev) => (
                  <div
                    key={rev.id}
                    onClick={() => router.push(`/organizer/events/${eventId}/revisions?revId=${rev.id}`)}
                    className="p-3 bg-white border border-amber-500/40 hover:border-amber-600 rounded-lg text-xs space-y-1 shadow-2xs cursor-pointer transition-all hover:shadow-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-900">{rev.title}</span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 border border-amber-500/25">
                        {rev.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-snug">{rev.description}</p>
                    <div className="pt-1 text-[10px] font-mono text-amber-700 font-bold">
                      Action: {rev.requiredAction}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {children}
    </>
  );
}
