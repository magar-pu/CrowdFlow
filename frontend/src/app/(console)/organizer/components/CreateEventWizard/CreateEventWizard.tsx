import React, { useMemo, useState } from 'react';
import { TicketTier, DocumentStatus, EventItem, SavedVenue, VenueElement } from '../../types';
import { Check, Info, Ticket, Map, Eye, Send, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import StepBasicInfo from './StepBasicInfo';
import StepTickets from './StepTickets';
import StepVenueDesigner from './StepVenueDesigner';
import StepPreview from './StepPreview';
import StepReview from './StepReview';

interface CreateEventWizardProps {
  onCancel: () => void;
  onSubmitSuccess: (newEvent: Omit<EventItem, "id" | "sold" | "revenue">) => void;
}

type StepKey = 'basic' | 'venue' | 'tickets' | 'preview' | 'review';

const STEP_DEFS: { key: StepKey; label: string; icon: LucideIcon }[] = [
  { key: 'basic', label: 'Basic Info', icon: Info },
  { key: 'venue', label: 'Venue', icon: Map },
  { key: 'tickets', label: 'Tickets', icon: Ticket },
  { key: 'preview', label: 'Preview', icon: Eye },
  { key: 'review', label: 'Review', icon: Send },
];

export default function CreateEventWizard({ onCancel, onSubmitSuccess }: CreateEventWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);

  // Step 1: Basic Info
  const [eventName, setEventName] = useState('New Corporate Conference 2024');
  const [category, setCategory] = useState('Conference');
  const [description, setDescription] = useState('Join us for keynotes and workshop labs.');
  const [startDate, setStartDate] = useState('2024-12-15');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('2024-12-16');
  const [endTime, setEndTime] = useState('17:00');
  const [locationType, setLocationType] = useState<'physical' | 'virtual'>('physical');
  const [address, setAddress] = useState('747 Howard St, San Francisco, CA');
  const [streamingLink, setStreamingLink] = useState('');
  const [coverImageName, setCoverImageName] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentStatus[]>([
    { name: 'venue-permit-2024.pdf', type: 'PDF', status: 'VERIFIED', category: 'Permits & Licenses' },
    { name: 'catering-vendor-contract.pdf', type: 'PDF', status: 'READY', category: 'Vendor & Venue Contracts' },
  ]);

  // Step 2: Venue & Layout
  const [venue, setVenue] = useState('Moscone Center, SF');
  const [savedVenues, setSavedVenues] = useState<SavedVenue[]>([
    { id: 'v-1', name: 'Moscone Center, SF', city: 'San Francisco, CA', capacity: 900 },
    { id: 'v-2', name: 'Metropolis Convention Center', city: 'New York, NY', capacity: 1200 },
    { id: 'v-3', name: 'The Brickwork Hub', city: 'Austin, TX', capacity: 650 },
  ]);
  const [venueElements, setVenueElements] = useState<VenueElement[]>([
    { id: 'el-stage', kind: 'infra', subtype: 'Stage', label: 'Stage', x: 140, y: 20 },
    { id: 'el-vip', kind: 'zone', subtype: 'VIP', label: 'VIP Zone', capacity: 100, x: 20, y: 90 },
    { id: 'el-ga', kind: 'zone', subtype: 'Festival', label: 'Festival Floor', capacity: 400, x: 180, y: 90 },
  ]);

  // Step 3: Tickets
  const [tiers, setTiers] = useState<TicketTier[]>([
    { id: 't-1', name: 'VIP Pass', price: 299, sold: 0, capacity: 100, maxPerOrder: 4, salesStart: '2024-10-01', salesEnd: '2024-12-14', zoneId: 'el-vip', zoneName: 'VIP Zone' },
    { id: 't-2', name: 'Standard Ticket', price: 99, sold: 0, capacity: 400, maxPerOrder: 6, salesStart: '2024-10-01', salesEnd: '2024-12-14', zoneId: 'el-ga', zoneName: 'Festival Floor' }
  ]);

  // Step 5: Review
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [organizerContact, setOrganizerContact] = useState('organizer@crowdflow.io');
  const [certified, setCertified] = useState(false);
  const [agreedGuidelines, setAgreedGuidelines] = useState(false);

  // Virtual events skip the venue design step entirely.
  const activeSteps = useMemo(
    () => STEP_DEFS.filter(s => !(s.key === 'venue' && locationType === 'virtual')),
    [locationType]
  );
  const clampedIndex = Math.min(stepIndex, activeSteps.length - 1);
  const currentKey = activeSteps[clampedIndex].key;

  const handleContinue = () => {
    setStepIndex(i => Math.min(activeSteps.length - 1, i + 1));
  };

  const handleBack = () => {
    setStepIndex(i => Math.max(0, i - 1));
  };

  const handleEditStep = (key: StepKey) => {
    const idx = activeSteps.findIndex(s => s.key === key);
    if (idx >= 0) setStepIndex(idx);
  };

  const buildEventPayload = (status: EventItem['status']): Omit<EventItem, "id" | "sold" | "revenue"> => {
    const totalCapacity = tiers.reduce((acc, curr) => acc + curr.capacity, 0);
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
      venueName: locationType === 'physical' ? venue : 'Virtual Event',
      capacity: totalCapacity,
      status,
      image: coverImageName ? coverImageName : "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format"
    };
  };

  const handleSubmit = () => {
    onSubmitSuccess(buildEventPayload("Scheduled"));
  };

  const handleSaveDraft = () => {
    onSubmitSuccess(buildEventPayload("Draft"));
  };

  return (
    <div className="space-y-8 pb-12 text-left animate-fade-in">
      <section className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <span className="font-mono text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">CREATOR WORKSPACE</span>
            <h2 className="font-sans text-xl font-bold text-text-primary mt-1">Deploy New Event Instance</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary border border-border-subtle hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save as Draft
            </button>
            <button
              onClick={onCancel}
              className="px-3.5 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary border border-border-subtle hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
            >
              Cancel Wizard
            </button>
          </div>
        </div>

        <div className="relative flex justify-between items-center max-w-2xl mx-auto px-4 gap-2">
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-surface-container -z-10"></div>
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-secondary -z-10 transition-all duration-300" style={{ width: `${(clampedIndex / (activeSteps.length - 1)) * 100}%` }}></div>

          {activeSteps.map((item, idx) => {
            const isCompleted = clampedIndex > idx;
            const isActive = clampedIndex === idx;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                disabled={clampedIndex < idx}
                onClick={() => setStepIndex(idx)}
                className="flex flex-col items-center gap-1.5 focus:outline-none shrink-0 cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                  isCompleted ? 'bg-secondary border-secondary text-white' :
                  isActive ? 'bg-white border-primary text-text-primary ring-4 ring-border-subtle font-bold' :
                  'bg-white border-border-subtle text-on-surface-variant'
                }`}>
                  {isCompleted ? <Check className="w-4 h-4 text-white" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-[10px] font-bold tracking-tight ${
                  isActive ? 'text-text-primary font-bold' : 'text-on-surface-variant'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <main className="min-h-[200px]">
        {currentKey === 'basic' && (
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
            documents={documents} setDocuments={setDocuments}
          />
        )}
        {currentKey === 'venue' && (
          <StepVenueDesigner
            venue={venue} setVenue={setVenue}
            savedVenues={savedVenues} setSavedVenues={setSavedVenues}
            elements={venueElements} setElements={setVenueElements}
          />
        )}
        {currentKey === 'tickets' && (
          <StepTickets tiers={tiers} setTiers={setTiers} zones={venueElements.filter(e => e.kind === 'zone')} />
        )}
        {currentKey === 'preview' && (
          <StepPreview
            eventName={eventName} category={category} description={description}
            startDate={startDate} locationType={locationType}
            venue={venue} address={address}
            tiers={tiers} coverImageName={coverImageName}
          />
        )}
        {currentKey === 'review' && (
          <StepReview
            eventName={eventName} category={category}
            startDate={startDate} startTime={startTime} endDate={endDate} endTime={endTime}
            locationType={locationType} address={address} streamingLink={streamingLink}
            venue={venue} tiers={tiers} documents={documents}
            visibility={visibility} setVisibility={setVisibility}
            organizerContact={organizerContact} setOrganizerContact={setOrganizerContact}
            certified={certified} setCertified={setCertified}
            agreedGuidelines={agreedGuidelines} setAgreedGuidelines={setAgreedGuidelines}
            onEditStep={handleEditStep}
            onSubmit={handleSubmit}
          />
        )}
      </main>

      {currentKey !== 'review' && (
        <footer className="flex justify-between items-center border-t border-border-subtle pt-6">
          <button
            onClick={handleBack}
            disabled={clampedIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary border border-border-subtle hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save as Draft
            </button>
            <button
              onClick={handleContinue}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Continue <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
