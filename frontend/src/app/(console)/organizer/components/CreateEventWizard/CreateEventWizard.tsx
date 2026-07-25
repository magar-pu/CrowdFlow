import React, { useState } from 'react';
import { EventItem } from '../../types';
import { Info, Save, ArrowRight } from 'lucide-react';
import StepBasicInfo from './StepBasicInfo';

interface CreateEventWizardProps {
  onCancel: () => void;
  onSubmitSuccess: (newEvent: Omit<EventItem, "id" | "sold" | "revenue">) => void;
}

// This form only creates a DRAFT from the event's basic info. Ticket tiers,
// venue layout and seating are configured afterwards inside the event
// workspace (/organizer/events/[id]), which is where those endpoints live and
// persist — and submission to an auditor happens there via the publish gate.
export default function CreateEventWizard({ onCancel, onSubmitSuccess }: CreateEventWizardProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Basic Info
  const [eventName, setEventName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationType, setLocationType] = useState<'physical' | 'virtual'>('physical');
  const [address, setAddress] = useState('');
  const [streamingLink, setStreamingLink] = useState('');
  const [coverImageName, setCoverImageName] = useState<string | null>(null);

  const validate = (): boolean => {
    setErrorMsg(null);
    if (!eventName.trim()) { setErrorMsg("Event Name is required"); return false; }
    if (!category.trim()) { setErrorMsg("Category is required"); return false; }
    if (!description.trim()) { setErrorMsg("Description is required"); return false; }
    if (!startDate) { setErrorMsg("Start Date is required"); return false; }
    if (!startTime) { setErrorMsg("Start Time is required"); return false; }
    if (!endDate) { setErrorMsg("End Date is required"); return false; }
    if (!endTime) { setErrorMsg("End Time is required"); return false; }
    if (locationType === 'physical' && !address.trim()) { setErrorMsg("Physical Address is required"); return false; }
    if (locationType === 'virtual' && !streamingLink.trim()) { setErrorMsg("Streaming Link is required"); return false; }
    return true;
  };

  const buildDraftPayload = (): Omit<EventItem, "id" | "sold" | "revenue"> => {
    const resolvedLocation = locationType === 'physical' ? address : streamingLink || 'Online Stream';
    return {
      name: eventName,
      category,
      description,
      date: `${startDate} - ${endDate}`,
      startDate,
      startTime,
      endDate,
      endTime,
      locationType,
      location: resolvedLocation,
      locationAddress: resolvedLocation,
      venueName: locationType === 'physical' ? address : 'Virtual Event',
      // Capacity is derived later from the seats you price in the workspace.
      capacity: 0,
      status: "Draft",
      image: coverImageName ? coverImageName : "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format",
    };
  };

  const handleSaveDraft = () => {
    if (!validate()) return;
    onSubmitSuccess(buildDraftPayload());
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
              Save the basics first. You&apos;ll add tickets, venue layout and seating in the next step.
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
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save Draft &amp; Continue
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
          locationType={locationType} setLocationType={setLocationType}
          address={address} setAddress={setAddress}
          streamingLink={streamingLink} setStreamingLink={setStreamingLink}
          coverImageName={coverImageName} setCoverImageName={setCoverImageName}
        />
      </main>

      <footer className="flex justify-end items-center border-t border-border-subtle pt-6">
        <button
          onClick={handleSaveDraft}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" /> Save Draft &amp; Continue Setup <ArrowRight className="w-4 h-4 text-white" />
        </button>
      </footer>
    </div>
  );
}
