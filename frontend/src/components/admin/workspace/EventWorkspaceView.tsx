"use client";

import React, { useState } from 'react';
import { ArrowLeft, Check, X, Activity, Ticket, Settings, FileEdit } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ApiResponse, Event, TicketTier, Transaction } from '@/types/admin';
import RejectReasonModal from '@/components/admin/shared/RejectReasonModal';
import WorkspaceLiveTrackerTab from './WorkspaceLiveTrackerTab';
import WorkspaceTicketTiersTab from './WorkspaceTicketTiersTab';
import WorkspaceSettingsTab from './WorkspaceSettingsTab';
import WorkspaceDetailsTab from './WorkspaceDetailsTab';

interface EventWorkspaceViewProps {
  event: Event;
  ticketTiers: TicketTier[];
  transactions: Transaction[];
  onBack: () => void;
  onUpdateTiers: (updatedTiers: TicketTier[]) => Promise<ApiResponse<void>>;
  onDeleteTier: (tierId: string) => void;
  onSetDraft: (id: string) => void;
  onSetPendingReview: (id: string) => void;
  onApproveEvent: (id: string) => void;
  onRejectEvent: (id: string, notes: string) => Promise<ApiResponse<void>>;
  onDetailsSaved: () => void | Promise<void>;
}

type WorkspaceTab = 'overview' | 'tickets' | 'details' | 'settings';

const STATUS_BADGE_CLASS: Record<Event['status'], string> = {
  Active: 'bg-success/10 text-success border-success/20',
  Draft: 'bg-surface text-text-secondary border-border-subtle',
  'In Review': 'bg-warning/10 text-warning border-warning/20',
  Rejected: 'bg-danger/10 text-danger border-danger/20',
  Completed: 'bg-secondary/10 text-secondary border-secondary/20',
};

export default function EventWorkspaceView({
  event,
  ticketTiers,
  transactions,
  onBack,
  onUpdateTiers,
  onDeleteTier,
  onSetDraft,
  onSetPendingReview,
  onApproveEvent,
  onRejectEvent,
  onDetailsSaved
}: EventWorkspaceViewProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [showRejectModal, setShowRejectModal] = useState(false);

  return (
    <div className="space-y-6 relative">
      {/* Header breadcrumb & info */}
      <div className="flex flex-col gap-4 border-b border-border-subtle pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="rounded-lg border border-border-subtle bg-surface-white p-2.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-secondary/20 bg-secondary/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary">
                {event.category} Workspace
              </span>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${STATUS_BADGE_CLASS[event.status]}`}>
                {event.status}
              </span>
              <span className="text-[10px] text-text-secondary">Event ID: {event.id}</span>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-normal text-text-primary sm:text-2xl">{event.name}</h1>
          </div>
        </div>
      </div>

      {/* Manual Status Control */}
      <div className="-mt-2 flex flex-wrap items-center gap-2 border-b border-border-subtle pb-5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Set Status:</span>
        <button
          onClick={() => onSetDraft(event.id)}
          disabled={event.status === 'Draft'}
          className="rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-[11px] font-semibold text-text-secondary transition-all hover:bg-surface-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Draft
        </button>
        <button
          onClick={() => onSetPendingReview(event.id)}
          disabled={event.status === 'In Review'}
          className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-1.5 text-[11px] font-semibold text-warning transition-all hover:bg-warning hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Pending Review
        </button>
        <button
          onClick={() => onApproveEvent(event.id)}
          disabled={event.status === 'Active' || event.status === 'Completed'}
          className="flex items-center gap-1 rounded-lg border border-success/20 bg-success/5 px-3 py-1.5 text-[11px] font-semibold text-success transition-all hover:bg-success hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Accept</span>
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          disabled={event.status === 'Rejected'}
          className="flex items-center gap-1 rounded-lg border border-danger/20 bg-danger/5 px-3 py-1.5 text-[11px] font-semibold text-danger transition-all hover:bg-danger hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
          <span>Reject</span>
        </button>
      </div>

      <RejectReasonModal
        open={showRejectModal}
        title="Reject Event"
        onCancel={() => setShowRejectModal(false)}
        onConfirm={async (notes) => {
          const res = await onRejectEvent(event.id, notes);
          if (res.success) setShowRejectModal(false);
          return res;
        }}
      />

      {/* Tabs navigation panel */}
      <div className="flex space-x-1 overflow-x-auto border-b border-border-subtle">
        {([
          { id: 'overview', name: 'Live Tracker', icon: Activity },
          { id: 'tickets', name: 'Ticket Tiers', icon: Ticket },
          { id: 'details', name: 'Event Details', icon: FileEdit },
          { id: 'settings', name: 'Security Config', icon: Settings },
        ] satisfies { id: WorkspaceTab; name: string; icon: LucideIcon }[]).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'border-secondary bg-secondary/5 text-secondary' 
                  : 'border-transparent text-text-secondary hover:bg-surface hover:text-text-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Content tabs rendering */}
      {activeTab === 'overview' && (
        <WorkspaceLiveTrackerTab
          event={event}
          transactions={transactions.filter((tx) => tx.eventName === event.name)}
        />
      )}
      {activeTab === 'tickets' && (
        <WorkspaceTicketTiersTab ticketTiers={ticketTiers} onUpdateTiers={onUpdateTiers} onDeleteTier={onDeleteTier} />
      )}
      {activeTab === 'details' && (
        <WorkspaceDetailsTab event={event} onSaved={onDetailsSaved} />
      )}
      {activeTab === 'settings' && (
        <WorkspaceSettingsTab />
      )}
    </div>
  );
}
