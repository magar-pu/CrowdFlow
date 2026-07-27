"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Sparkles, MapPin, Percent, ImageIcon, FileText, CheckCircle } from 'lucide-react';
import { Venue, EventType } from '@/types/admin';
import { listVenues, listEventTypes, createEvent } from '@/lib/api/admin/eventService';
import Select from '@/components/ui/Select';

interface CreateEventViewProps {
  onBack: () => void;
  onCreated: () => void | Promise<void>;
}

const createEventSchema = z
  .object({
    title: z.string().trim().min(1, 'Event title is required'),
    description: z.string().optional(),
    venue_id: z.string().min(1, 'Select a venue'),
    event_type_id: z.string().min(1, 'Select a category'),
    starts_at: z.string().min(1, 'Start date & time is required'),
    ends_at: z.string().min(1, 'End date & time is required'),
    entertainment_tax_rate: z
      .string()
      .refine((v) => v !== '' && !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100, {
        message: 'Enter a valid tax rate between 0 and 100',
      }),
    entertainment_tax_passed_to_buyer: z.boolean(),
  })
  .refine((data) => new Date(data.ends_at).getTime() > new Date(data.starts_at).getTime(), {
    message: 'End date & time must be after the start date & time',
    path: ['ends_at'],
  });

type CreateEventFormValues = z.infer<typeof createEventSchema>;

const inputClass =
  'h-11 w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-60';
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary';
const errorClass = 'mt-1 text-[11px] font-semibold text-danger';
const cardClass = 'space-y-4 rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm';
const cardHeaderClass = 'flex items-center gap-2 border-b border-border-subtle pb-3 text-sm font-bold text-text-primary';

const DOCUMENT_PLACEHOLDERS = ['Izin Keramaian', 'Proposal Kegiatan', 'Fotokopi KTP Penanggung Jawab'];

export default function CreateEventView({ onBack, onCreated }: CreateEventViewProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [pickersLoading, setPickersLoading] = useState(true);
  const [pickersError, setPickersError] = useState<string | null>(null);

  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: '',
      description: '',
      venue_id: '',
      event_type_id: '',
      starts_at: '',
      ends_at: '',
      entertainment_tax_rate: '0',
      entertainment_tax_passed_to_buyer: false,
    },
  });

  useEffect(() => {
    (async () => {
      setPickersLoading(true);
      setPickersError(null);

      const [venuesRes, eventTypesRes] = await Promise.all([listVenues(), listEventTypes()]);

      if (venuesRes.success && venuesRes.data) {
        setVenues(venuesRes.data);
      } else {
        setPickersError(venuesRes.error?.message ?? 'Failed to load venues');
      }

      if (eventTypesRes.success && eventTypesRes.data) {
        setEventTypes(eventTypesRes.data);
      } else {
        setPickersError((prev) => prev ?? eventTypesRes.error?.message ?? 'Failed to load event types');
      }

      setPickersLoading(false);
    })();
  }, []);

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCoverImageFile(file);
    setCoverImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const onSubmit = async (data: CreateEventFormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);

    const fd = new FormData();
    fd.append(
      'event_data',
      JSON.stringify({
        title: data.title.trim(),
        description: data.description?.trim() || '',
        venue_id: Number(data.venue_id),
        event_type_id: Number(data.event_type_id),
        starts_at: new Date(data.starts_at).toISOString(),
        ends_at: new Date(data.ends_at).toISOString(),
        entertainment_tax_rate: Number(data.entertainment_tax_rate),
        entertainment_tax_passed_to_buyer: data.entertainment_tax_passed_to_buyer,
      })
    );
    if (coverImageFile) {
      fd.append('cover_image', coverImageFile);
    }

    const result = await createEvent(fd);
    setIsSubmitting(false);

    if (result.success) {
      await onCreated();
    } else {
      setSubmitError(result.error?.message ?? 'Failed to create event. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header breadcrumb & info — mirrors EventWorkspaceView's header pattern */}
      <div className="flex items-center gap-4 border-b border-border-subtle pb-5">
        <button
          onClick={onBack}
          className="rounded-lg border border-border-subtle bg-surface-white p-2.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <span className="rounded-full border border-secondary/20 bg-secondary/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary">
            New Event
          </span>
          <h1 className="mt-1 text-xl font-bold tracking-normal text-text-primary sm:text-2xl">Create New Event</h1>
          <p className="mt-1 text-sm text-text-secondary">Add the core details needed for event management.</p>
        </div>
      </div>

      {submitError && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-xs font-semibold text-danger">
          {submitError}
        </div>
      )}
      {pickersError && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-xs font-semibold text-danger">
          {pickersError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Core Details */}
        <div className={cardClass}>
          <h3 className={cardHeaderClass}>
            <Sparkles className="h-4.5 w-4.5 text-secondary" />
            <span>Core Details</span>
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Event Title</label>
              <input
                type="text"
                placeholder="e.g. Neon Nights Festival"
                className={inputClass}
                {...register('title')}
              />
              {errors.title && <p className={errorClass}>{errors.title.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Category</label>
              <Select selectSize="md" invalid={!!errors.event_type_id} disabled={pickersLoading} {...register('event_type_id')}>
                <option value="">{pickersLoading ? 'Loading categories...' : 'Select a category'}</option>
                {eventTypes.map((t) => (
                  <option key={t.event_type_id} value={t.event_type_id}>
                    {t.event_type}
                  </option>
                ))}
              </Select>
              {errors.event_type_id && <p className={errorClass}>{errors.event_type_id.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                rows={3}
                placeholder="Tell us what this event is about..."
                className="w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20"
                {...register('description')}
              />
            </div>
          </div>
        </div>

        {/* Schedule & Venue */}
        <div className={cardClass}>
          <h3 className={cardHeaderClass}>
            <MapPin className="h-4.5 w-4.5 text-secondary" />
            <span>Schedule &amp; Venue</span>
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Venue</label>
              <Select selectSize="md" invalid={!!errors.venue_id} disabled={pickersLoading} {...register('venue_id')}>
                <option value="">{pickersLoading ? 'Loading venues...' : 'Select a venue'}</option>
                {venues.map((v) => (
                  <option key={v.venue_id} value={v.venue_id}>
                    {v.name} — {v.city}, {v.province}
                  </option>
                ))}
              </Select>
              {errors.venue_id && <p className={errorClass}>{errors.venue_id.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Starts</label>
              <input type="datetime-local" className={inputClass} {...register('starts_at')} />
              {errors.starts_at && <p className={errorClass}>{errors.starts_at.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Ends</label>
              <input type="datetime-local" className={inputClass} {...register('ends_at')} />
              {errors.ends_at && <p className={errorClass}>{errors.ends_at.message}</p>}
            </div>
          </div>
        </div>

        {/* Financials */}
        <div className={cardClass}>
          <h3 className={cardHeaderClass}>
            <Percent className="h-4.5 w-4.5 text-secondary" />
            <span>Entertainment Tax</span>
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Entertainment Tax Rate (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className={inputClass}
                {...register('entertainment_tax_rate')}
              />
              {errors.entertainment_tax_rate && <p className={errorClass}>{errors.entertainment_tax_rate.message}</p>}
            </div>
          </div>

          <div className="flex items-start justify-between rounded-lg border border-border-subtle bg-surface p-4">
            <div className="max-w-md">
              <h4 className="text-xs font-bold text-text-primary">Pass Tax to Buyer</h4>
              <p className="mt-0.5 text-xs text-text-secondary">
                Add the entertainment tax on top of the ticket price at checkout instead of absorbing it.
              </p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border-subtle text-secondary focus:ring-secondary cursor-pointer"
              {...register('entertainment_tax_passed_to_buyer')}
            />
          </div>
        </div>

        {/* Cover Image */}
        <div className={cardClass}>
          <h3 className={cardHeaderClass}>
            <ImageIcon className="h-4.5 w-4.5 text-secondary" />
            <span>Cover Image</span>
          </h3>
          <input
            type="file"
            accept="image/*"
            onChange={handleCoverImageChange}
            className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-on-primary hover:file:bg-primary-container file:cursor-pointer cursor-pointer"
          />
          {coverImagePreview && (
            <img
              src={coverImagePreview}
              alt="Cover preview"
              className="h-44 w-full rounded-lg border border-border-subtle object-cover"
            />
          )}
        </div>

        {/* Supporting Documents — disabled placeholders, no backend wiring yet */}
        <div className={cardClass}>
          <h3 className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <FileText className="h-4.5 w-4.5 text-secondary" />
              <span>Supporting Documents</span>
            </span>
            <span className="rounded-full border border-border-subtle bg-surface px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-text-secondary">
              Coming soon
            </span>
          </h3>
          <p className="text-xs text-text-secondary">
            Permit and identity document uploads will be required here once document review is available.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {DOCUMENT_PLACEHOLDERS.map((name) => (
              <div key={name}>
                <label className={labelClass}>{name}</label>
                <input type="file" disabled className={inputClass} />
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="min-h-11 rounded-lg border border-border-subtle px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || pickersLoading}
            className="flex min-h-11 items-center gap-1 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-on-primary hover:bg-primary-container cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle className="h-4 w-4" />
            <span>{isSubmitting ? 'Creating Event...' : 'Create Event'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
