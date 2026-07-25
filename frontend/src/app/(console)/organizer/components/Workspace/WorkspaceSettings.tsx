import React, { useState } from "react";
import { Settings, Trash2, Ticket, AlertTriangle, Archive } from "lucide-react";
import WorkspaceCoverImage from "./WorkspaceCoverImage";

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
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${checked ? 'bg-primary' : 'bg-surface-container'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`}></span>
    </button>
  );
}

export default function WorkspaceSettings({
  eventId,
  eventName,
  initial,
  onSaveGeneral,
  onDeleteEvent,
  canDelete,
  coverReadOnly = false,
  onCoverUploaded
}: WorkspaceSettingsProps) {
  const [name, setName] = useState(eventName);
  const [category, setCategory] = useState(initial.category);
  const [description, setDescription] = useState(initial.description);
  const [eventDate, setEventDate] = useState(initial.startDate);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // No Location field here: the venue is set in the Venue tab, which persists it.
  // This one was hardcoded and never read or saved.

  const [refundPolicy, setRefundPolicy] = useState('Full refund up to 7 days before');
  const [resaleEnabled, setResaleEnabled] = useState(false);

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
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none cursor-pointer">
                <option>Conference</option>
                <option>Festival</option>
                <option>Workshop</option>
              </select>
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
        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Ticket className="w-4 h-4 text-secondary" /> Ticket Rules
          </h4>
          <p className="text-[10px] text-text-secondary">
            Max purchase per order is set per ticket type, in the Tickets tab.
          </p>
          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Refund Policy</label>
            <select value={refundPolicy} onChange={(e) => setRefundPolicy(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none cursor-pointer">
              <option>Full refund up to 7 days before</option>
              <option>Full refund up to 24 hours before</option>
              <option>No refunds</option>
            </select>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <div>
              <p className="text-xs font-semibold text-text-primary">Official Resale</p>
              <p className="text-[10px] text-text-secondary">Enable a price-capped resale marketplace.</p>
            </div>
            <Toggle checked={resaleEnabled} onChange={setResaleEnabled} />
          </div>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Danger Zone */}
        <div className="bg-danger/5 border border-danger/20 rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-danger flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </h4>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-primary">Archive Event</p>
              <p className="text-[10px] text-text-secondary">Hide this event from all dashboards without deleting data.</p>
            </div>
            <button
              onClick={() => alert(`"${name}" has been archived.`)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle hover:bg-surface-container-low rounded-lg text-xs font-semibold text-text-primary transition-colors cursor-pointer shrink-0"
            >
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-danger/20">
            <div>
              <p className="text-xs font-semibold text-danger">Delete Event</p>
              <p className="text-[10px] text-text-secondary">
                {canDelete
                  ? 'Permanently remove this event and all associated data.'
                  : 'Only a draft can be deleted. This event has already been submitted.'}
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
