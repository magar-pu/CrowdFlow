import React, { useState } from "react";
import { Settings, Trash2, Ticket, AlertTriangle, Archive, Undo2 } from "lucide-react";
import WorkspaceCoverImage from "./WorkspaceCoverImage";
import Select from "@/components/ui/Select";

interface WorkspaceSettingsProps {
  eventId: number;
  eventName: string;
  /** The event's persisted fields, so the form opens on real values. */
  initial: {
    category: string;
    description: string;
    startDate: string;
    /** Persisted cover_image_url, if the event has one. */
    image?: string;
  };
  /** Cover art is locked once the event is with an auditor. */
  coverReadOnly?: boolean;
  /** Fired after a cover upload so the workspace can refetch. */
  onCoverUploaded?: () => void;
  /** Saves the General Event Info card; resolves false when the save failed. */
  onSaveGeneral: (values: { name: string; category: string; description: string; startDate: string }) => Promise<boolean>;
  /** Deletes the event for real. Only drafts can be deleted. */
  onDeleteEvent: () => Promise<boolean>;
  canDelete: boolean;
  /** Returns a pending_review event to draft. */
  onWithdrawEvent: () => Promise<boolean>;
  canWithdraw: boolean;
  /** Hides a terminal event without deleting it. */
  onArchiveEvent: () => Promise<boolean>;
  canArchive: boolean;
  /** Restores an archived event back to active status. */
  isArchived?: boolean;
  onUnarchiveEvent?: () => Promise<boolean>;
}

export default function WorkspaceSettings({
  eventId,
  eventName,
  initial,
  onSaveGeneral,
  onDeleteEvent,
  canDelete,
  onWithdrawEvent,
  canWithdraw,
  onArchiveEvent,
  canArchive,
  isArchived = false,
  onUnarchiveEvent,
  coverReadOnly = false,
  onCoverUploaded
}: WorkspaceSettingsProps) {
  const [name, setName] = useState(eventName);
  const [category, setCategory] = useState(initial.category);
  const [description, setDescription] = useState(initial.description);
  const [eventDate, setEventDate] = useState(initial.startDate);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [unarchiving, setUnarchiving] = useState(false);

  // No Location field here: the venue is set in the Venue tab, which persists it.
  // This one was hardcoded and never read or saved.


  // Title, category, description and date are real columns on the event.
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSaveGeneral({ name, category, description, startDate: eventDate });
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await onDeleteEvent();
    setDeleting(false);
  };

  const handleWithdraw = async () => {
    if (!confirm(`Withdraw "${name}" from review? It goes back to draft and you will need to submit it again.`)) return;
    setWithdrawing(true);
    await onWithdrawEvent();
    setWithdrawing(false);
  };

  // No confirm(): archiving is reversible and non-destructive, unlike the two
  // above. The Events list has an Archived view to restore from.
  const handleArchive = async () => {
    setArchiving(true);
    await onArchiveEvent();
    setArchiving(false);
  };

  const handleUnarchive = async () => {
    if (!onUnarchiveEvent) return;
    setUnarchiving(true);
    await onUnarchiveEvent();
    setUnarchiving(false);
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Event Info */}
        <form onSubmit={handleSaveGeneral} className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Settings className="w-4 h-4 text-secondary" /> General Event Info
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Event Title</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Category</label>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>Conference</option>
                <option>Festival</option>
                <option>Workshop</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full p-3 border border-border-subtle rounded-lg text-xs bg-white outline-none resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Date</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>

        <div className="space-y-6">
          <WorkspaceCoverImage
            eventId={eventId}
            currentUrl={initial.image}
            readOnly={coverReadOnly}
            onUploaded={() => onCoverUploaded?.()}
          />

        {/* Ticket Rules */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-2">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Ticket className="w-4 h-4 text-secondary" /> Ticket Rules
          </h4>
          <p className="text-[10px] text-text-secondary">
            Price, allocation and max purchase per order are set per ticket type, in the Tickets tab.
          </p>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Danger Zone */}
        <div className="bg-danger/5 border border-danger/20 rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-danger flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </h4>
          {canWithdraw && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-text-primary">Withdraw from Review</p>
                <p className="text-[10px] text-text-secondary">
                  Return this event to draft so you can edit it. Only possible until an auditor picks it up.
                </p>
              </div>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-text-primary transition-colors cursor-pointer shrink-0"
              >
                <Undo2 className="w-3.5 h-3.5" /> {withdrawing ? 'Withdrawing…' : 'Withdraw'}
              </button>
            </div>
          )}

          <div className={`flex items-center justify-between gap-3 ${canWithdraw ? 'pt-3 border-t border-danger/20' : ''}`}>
            <div>
              <p className="text-xs font-semibold text-text-primary">
                {isArchived ? "Unarchive Event" : "Archive Event"}
              </p>
              <p className="text-[10px] text-text-secondary">
                {isArchived
                  ? "Restore this event back to your active events list."
                  : canArchive
                    ? "Hide this event from your active list. Nothing is deleted and the review history is kept — you can restore it later."
                    : "Only a draft or rejected event can be archived. Withdraw it from review first."}
              </p>
            </div>
            {isArchived ? (
              <button
                type="button"
                onClick={handleUnarchive}
                disabled={unarchiving}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
              >
                <Undo2 className="w-4 h-4 text-white" /> {unarchiving ? 'Unarchiving…' : 'Unarchive Event'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleArchive}
                disabled={!canArchive || archiving}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-text-primary transition-colors cursor-pointer shrink-0"
              >
                <Archive className="w-3.5 h-3.5" /> {archiving ? 'Archiving…' : 'Archive'}
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-danger/20">
            <div>
              <p className="text-xs font-semibold text-danger">Delete Event</p>
              <p className="text-[10px] text-text-secondary">
                {canDelete
                  ? 'Permanently remove this event and all associated data.'
                  : canWithdraw
                    ? 'Only a draft can be deleted. Withdraw this event from review first.'
                    : 'Only a draft can be deleted. This event has been reviewed, so its history is kept — archive it instead.'}
              </p>
            </div>
            <button
              onClick={handleDelete}
              disabled={!canDelete || deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-danger hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" /> {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
