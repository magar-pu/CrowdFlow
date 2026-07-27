"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Sparkles, MapPin, Percent, Save, History } from 'lucide-react';
import { Event, Venue, EventType, EventStatusLogEntry } from '@/types/admin';
import { getEvent, updateEvent, listVenues, listEventTypes, listEventStatusLog } from '@/lib/api/admin/eventService';
import Select from '@/components/ui/Select';

const STATUS_LABEL: Record<EventStatusLogEntry['toStatus'], string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

interface WorkspaceDetailsTabProps {
  event: Event;
  onSaved: () => void | Promise<void>;
}

const detailsSchema = z
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

type DetailsFormValues = z.infer<typeof detailsSchema>;

const inputClass =
  'h-11 w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-60';
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary';
const errorClass = 'mt-1 text-[11px] font-semibold text-danger';
const cardClass = 'space-y-4 rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm';
const cardHeaderClass = 'flex items-center gap-2 border-b border-border-subtle pb-3 text-sm font-bold text-text-primary';

// toDatetimeLocal converts an ISO timestamp from the API into the value
// shape <input type="datetime-local"> expects (no timezone, no seconds).
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function WorkspaceDetailsTab({ event, onSaved }: WorkspaceDetailsTabProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [statusLog, setStatusLog] = useState<EventStatusLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const locked = event.status === 'In Review';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
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
      setLoading(true);
      setLoadError(null);

      const [eventRes, venuesRes, eventTypesRes, statusLogRes] = await Promise.all([
        getEvent(event.id),
        listVenues(),
        listEventTypes(),
        listEventStatusLog(event.id),
      ]);

      if (eventRes.success && eventRes.data) {
        const d = eventRes.data;
        reset({
          title: d.title,
          description: d.description ?? '',
          venue_id: d.venue?.venue_id ? String(d.venue.venue_id) : '',
          event_type_id: d.event_type_id ? String(d.event_type_id) : '',
          starts_at: toDatetimeLocal(d.starts_at),
          ends_at: toDatetimeLocal(d.ends_at),
          entertainment_tax_rate: String(d.entertainment_tax_rate ?? 0),
          entertainment_tax_passed_to_buyer: d.entertainment_tax_passed_to_buyer ?? false,
        });
      } else {
        setLoadError(eventRes.error?.message ?? 'Failed to load event details');
      }

      if (venuesRes.success && venuesRes.data) setVenues(venuesRes.data);
      if (eventTypesRes.success && eventTypesRes.data) setEventTypes(eventTypesRes.data);
      if (statusLogRes.success && statusLogRes.data) setStatusLog(statusLogRes.data);

      setLoading(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, [event.id, event.status]);

  const onSubmit = async (data: DetailsFormValues) => {
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);

    const result = await updateEvent(event.id, {
      title: data.title.trim(),
      description: data.description?.trim() || '',
      venue_id: Number(data.venue_id),
      event_type_id: Number(data.event_type_id),
      starts_at: new Date(data.starts_at).toISOString(),
      ends_at: new Date(data.ends_at).toISOString(),
      entertainment_tax_rate: Number(data.entertainment_tax_rate),
      entertainment_tax_passed_to_buyer: data.entertainment_tax_passed_to_buyer,
    });

    setIsSubmitting(false);

    if (result.success) {
      setSubmitSuccess(true);
      await onSaved();
    } else {
      setSubmitError(result.error?.message ?? 'Failed to save event details');
    }
  };

  if (loading) {
    return <div className="py-24 text-center text-sm text-text-secondary">Loading event details...</div>;
  }

  return (
    <div className="space-y-6">
      {locked && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-xs font-semibold text-warning">
          <Lock className="h-4 w-4 shrink-0" />
          <span>This event is In Review. Details are locked until an admin approves or rejects it.</span>
        </div>
      )}
      {loadError && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-xs font-semibold text-danger">
          {loadError}
        </div>
      )}
      {submitError && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-xs font-semibold text-danger">
          {submitError}
        </div>
      )}
      {submitSuccess && (
        <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-xs font-semibold text-success">
          Event details saved.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <fieldset disabled={locked || isSubmitting} className="space-y-6">
          <div className={cardClass}>
            <h3 className={cardHeaderClass}>
              <Sparkles className="h-4.5 w-4.5 text-secondary" />
              <span>Core Details</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Event Title</label>
                <input type="text" className={inputClass} {...register('title')} />
                {errors.title && <p className={errorClass}>{errors.title.message}</p>}
              </div>

              <div>
                <label className={labelClass}>Category</label>
                <Select selectSize="md" invalid={!!errors.event_type_id} {...register('event_type_id')}>
                  <option value="">Select a category</option>
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
                  className="w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  {...register('description')}
                />
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className={cardHeaderClass}>
              <MapPin className="h-4.5 w-4.5 text-secondary" />
              <span>Schedule &amp; Venue</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Venue</label>
                <Select selectSize="md" invalid={!!errors.venue_id} {...register('venue_id')}>
                  <option value="">Select a venue</option>
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

          <div className={cardClass}>
            <h3 className={cardHeaderClass}>
              <Percent className="h-4.5 w-4.5 text-secondary" />
              <span>Entertainment Tax</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Entertainment Tax Rate (%)</label>
                <input type="number" step="0.01" min="0" max="100" className={inputClass} {...register('entertainment_tax_rate')} />
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
                className="h-4 w-4 rounded border-border-subtle text-secondary focus:ring-secondary cursor-pointer disabled:cursor-not-allowed"
                {...register('entertainment_tax_passed_to_buyer')}
              />
            </div>
          </div>
        </fieldset>

        {!locked && (
          <div className="flex justify-end border-t border-border-subtle pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-11 items-center gap-1 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-on-primary hover:bg-primary-container cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </form>

      {/* Status History */}
      <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border-subtle pb-4">
          <History className="h-4.5 w-4.5 text-secondary" />
          <div>
            <h2 className="text-base font-bold text-text-primary">Status History</h2>
            <p className="text-xs text-text-secondary">Every Draft / Pending Review / Accept / Reject action taken on this event.</p>
          </div>
        </div>

        <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {statusLog.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-subtle py-10 text-center text-xs text-text-secondary">
              No status changes recorded yet.
            </div>
          ) : (
            statusLog.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-4 rounded-lg border border-border-subtle bg-surface p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-white text-xs font-bold text-secondary">
                    {entry.actorName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-text-primary">{entry.actorName}</span>
                      <span className="rounded-full border border-secondary/20 bg-secondary/5 px-2 py-0.5 text-[9px] font-medium text-secondary">
                        {STATUS_LABEL[entry.fromStatus]} → {STATUS_LABEL[entry.toStatus]}
                      </span>
                    </div>
                    {entry.notes && <p className="mt-1 text-[10px] text-text-secondary">{entry.notes}</p>}
                  </div>
                </div>
                <span className="shrink-0 text-[10px] text-text-secondary">{entry.createdAt}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
