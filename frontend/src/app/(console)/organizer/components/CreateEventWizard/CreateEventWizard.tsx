import React, { useState } from 'react';
import { CreateEventDraft } from '../../types';
import { Info, Save, ArrowRight } from 'lucide-react';
import StepBasicInfo from './StepBasicInfo';

interface CreateEventWizardProps {
  onCancel: () => void;
  /**
   * The cover file is passed separately from the draft: it can only be uploaded
   * once the event exists and has an id, so the caller creates the draft first
   * and then posts the file to that event's /cover endpoint.
   */
  onSubmitSuccess: (newEvent: CreateEventDraft, coverFile: File | null) => void | Promise<void>;
}

// This form only creates a DRAFT from the event's basic info. The venue, ticket
// tiers, layout and seating are all configured afterwards inside the event
// workspace (/organizer/events/[id]), which is where those endpoints live and
// persist — and submission to an auditor happens there via the publish gate,
// which refuses an event that still has no venue.
export default function CreateEventWizard({ onCancel, onSubmitSuccess }: CreateEventWizardProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Basic Info
  const [eventName, setEventName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const validate = (): boolean => {
    setErrorMsg(null);
    if (!eventName.trim()) { setErrorMsg("Event Name is required"); return false; }
    if (!category.trim()) { setErrorMsg("Category is required"); return false; }
    if (!description.trim()) { setErrorMsg("Description is required"); return false; }
    if (!startDate) { setErrorMsg("Start Date is required"); return false; }
    if (!startTime) { setErrorMsg("Start Time is required"); return false; }
    if (!endDate) { setErrorMsg("End Date is required"); return false; }
    if (!endTime) { setErrorMsg("End Time is required"); return false; }
    return true;
  };

  const buildDraftPayload = (): CreateEventDraft => ({
    name: eventName,
    category,
    description,
    date: `${startDate} - ${endDate}`,
    startDate,
    startTime,
    endDate,
    endTime,
    // Capacity is derived later from the seats you price in the workspace.
    capacity: 0,
    status: "Draft",
    // A picked file is uploaded after creation and overwrites this, so the
    // stock image only ever survives when no cover was chosen.
    image: coverFile ? "" : "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format",
  });

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmitSuccess(buildDraftPayload(), coverFile);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 text-left animate-fade-in">
      <section className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="font-mono text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">CREATOR WORKSPACE</span>
            <h2 className="font-sans text-xl font-bold text-text-primary mt-1">Create Event Draft</h2>
            <p className="flex items-center gap-1.5 text-xs text-text-secondary mt-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Save the basics first. You&apos;ll set the venue, tickets and seating in the workspace next.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-3.5 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary border border-border-subtle hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> {submitting ? 'Saving…' : 'Save Draft & Continue'}
            </button>
          </div>
        </div>
      </section>

      {errorMsg && (
        <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-lg text-xs font-semibold text-left">
          {errorMsg}
        </div>
      )}

      <main className="min-h-[200px]">
        <StepBasicInfo
          name={eventName} setName={setEventName}
          category={category} setCategory={setCategory}
          description={description} setDescription={setDescription}
          startDate={startDate} setStartDate={setStartDate}
          startTime={startTime} setStartTime={setStartTime}
          endDate={endDate} setEndDate={setEndDate}
          endTime={endTime} setEndTime={setEndTime}
          coverFile={coverFile} setCoverFile={setCoverFile}
        />
      </main>

      <footer className="flex justify-end items-center border-t border-border-subtle pt-6">
        <button
          onClick={handleSaveDraft}
          disabled={submitting}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" /> {submitting ? 'Saving…' : 'Save Draft & Continue Setup'} <ArrowRight className="w-4 h-4 text-white" />
        </button>
      </footer>
    </div>
  );
}
