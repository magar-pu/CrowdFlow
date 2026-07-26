import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Image as ImageIcon, X } from 'lucide-react';
import { listEventTypes, EventType } from '@/lib/api/eorganizer';

interface StepBasicInfoProps {
  name: string;
  setName: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  /**
   * The picked file itself, not just its name — the wizard uploads it to the
   * new event's /cover endpoint once the draft has an id.
   */
  coverFile: File | null;
  setCoverFile: (v: File | null) => void;
}

// Matches the backend's accepted set. The service sniffs the real content type
// regardless; this is a convenience check, not the guard.
const ACCEPTED_COVER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_COVER_BYTES = 10 * 1024 * 1024;

// Shown up front rather than only as an error after a rejected file. Derived
// from MAX_COVER_BYTES so the copy can't drift from the check. Kept identical
// to the workspace picker's wording so the rules read the same in both places.
const COVER_CRITERIA = `PNG, JPG/JPEG, or WebP · up to ${MAX_COVER_BYTES / (1024 * 1024)}MB`;

export default function StepBasicInfo({
  name, setName,
  category, setCategory,
  description, setDescription,
  startDate, setStartDate,
  startTime, setStartTime,
  endDate, setEndDate,
  endTime, setEndTime,
  coverFile, setCoverFile,
}: StepBasicInfoProps) {
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listEventTypes().then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setEventTypes(res.data);
      setTypesLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Preview is a local object URL for the picked file, revoked when replaced or
  // on unmount to avoid leaks. The file is held by the wizard and uploaded after
  // the draft is created, since the upload endpoint needs the new event's id.
  const applyCoverFile = (file: File) => {
    if (!ACCEPTED_COVER_TYPES.includes(file.type)) {
      setCoverError('Cover art must be a PNG, JPG, or WebP image.');
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      setCoverError(`Cover art must be ${MAX_COVER_BYTES / (1024 * 1024)}MB or smaller.`);
      return;
    }
    setCoverError(null);
    setCoverFile(file);
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const clearCover = () => {
    setCoverError(null);
    setCoverFile(null);
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  useEffect(() => {
    return () => { if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl); };
  }, [coverPreviewUrl]);

  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyCoverFile(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left animate-fade-in">
      <div className="lg:col-span-2 space-y-6">
        {/* Event Identity */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
          <h3 className="text-base font-bold text-text-primary border-b border-border-subtle pb-3">Event Identity</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Event Title</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" placeholder="e.g. Prambanan Rock Festival 2026" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={typesLoading} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                <option value="">{typesLoading ? 'Loading categories…' : '-- Select Category --'}</option>
                {eventTypes.map((t) => (
                  <option key={t.event_type_id} value={t.event_type}>{t.event_type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full p-3 text-xs bg-white border border-border-subtle rounded-lg outline-none resize-none" placeholder="e.g. Join us for a night of rock music featuring top local and international bands." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Event Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Event Start Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Event End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Event End Time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
            </div>
          </div>
        </div>

      </div>

      <div className="space-y-6">
        {/* Cover Image */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-text-primary">Event Cover Image</h3>
            {/* Stays visible after a file is picked, when the dropzone's own
                hint is replaced by the preview. */}
            <p className="text-[10px] text-text-secondary font-mono">{COVER_CRITERIA}</p>
          </div>

          <input
            ref={coverInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && applyCoverFile(e.target.files[0])}
          />

          {coverPreviewUrl ? (
            <div className="space-y-2">
              <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border-subtle bg-surface-container-low group">
                {/* Local object URL for the just-picked file — unoptimized so
                    Next doesn't try to run it through the image optimizer. */}
                <Image src={coverPreviewUrl} alt="Cover preview" fill unoptimized className="object-cover" />
                <button
                  type="button"
                  onClick={clearCover}
                  className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-black/60 text-white hover:bg-danger transition-colors cursor-pointer"
                  aria-label="Remove cover image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-text-primary truncate">{coverFile?.name}</span>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="shrink-0 font-semibold text-secondary hover:underline cursor-pointer"
                >
                  Replace
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingCover(true); }}
              onDragLeave={() => setIsDraggingCover(false)}
              onDrop={handleCoverDrop}
              onClick={() => coverInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                isDraggingCover ? 'border-secondary bg-secondary/5' : 'border-border-subtle hover:bg-surface-container-low'
              }`}
            >
              <ImageIcon className="w-6 h-6 text-on-surface-variant" />
              <p className="text-xs text-text-secondary font-medium text-center">Drag & drop cover art, or click to browse</p>
              <p className="text-[10px] text-on-surface-variant font-mono">{COVER_CRITERIA}</p>
            </div>
          )}

          {coverError && (
            <p className="flex items-start gap-1.5 text-[11px] text-danger">
              <X className="w-3.5 h-3.5 shrink-0 mt-px" /> {coverError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
