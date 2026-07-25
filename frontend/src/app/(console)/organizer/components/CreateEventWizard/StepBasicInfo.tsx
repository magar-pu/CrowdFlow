import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { MapPin, Globe2, Image as ImageIcon, X } from 'lucide-react';
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
  locationType: 'physical' | 'virtual';
  setLocationType: (v: 'physical' | 'virtual') => void;
  address: string;
  setAddress: (v: string) => void;
  streamingLink: string;
  setStreamingLink: (v: string) => void;
  coverImageName: string | null;
  setCoverImageName: (v: string | null) => void;
}

export default function StepBasicInfo({
  name, setName,
  category, setCategory,
  description, setDescription,
  startDate, setStartDate,
  startTime, setStartTime,
  endDate, setEndDate,
  endTime, setEndTime,
  locationType, setLocationType,
  address, setAddress,
  streamingLink, setStreamingLink,
  coverImageName, setCoverImageName,
}: StepBasicInfoProps) {
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
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

  // Preview is a local object URL for the picked file. The file itself isn't
  // uploaded here (only its name is carried forward), so this stays component-
  // local and is revoked when replaced or on unmount to avoid leaks.
  const applyCoverFile = (file: File) => {
    setCoverImageName(file.name);
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const clearCover = () => {
    setCoverImageName(null);
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

        {/* Location Management */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
          <h3 className="text-base font-bold text-text-primary border-b border-border-subtle pb-3">Location Management</h3>

          <div className="inline-flex rounded-lg border border-border-subtle p-1 bg-surface-container-low">
            <button
              type="button"
              onClick={() => setLocationType('physical')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                locationType === 'physical' ? 'bg-primary text-on-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" /> Physical Venue
            </button>
            <button
              type="button"
              onClick={() => setLocationType('virtual')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                locationType === 'virtual' ? 'bg-primary text-on-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" /> Virtual / Online
            </button>
          </div>

          {locationType === 'physical' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Physical Address</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" placeholder="Street, city, state" />
                <p className="text-[10px] text-on-surface-variant">Pin will be geocoded automatically from the address above.</p>
              </div>
              <div className="relative h-32 rounded-lg border border-border-subtle overflow-hidden bg-[linear-gradient(0deg,transparent_24%,var(--color-border-subtle)_25%,var(--color-border-subtle)_26%,transparent_27%,transparent_74%,var(--color-border-subtle)_75%,var(--color-border-subtle)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,var(--color-border-subtle)_25%,var(--color-border-subtle)_26%,transparent_27%,transparent_74%,var(--color-border-subtle)_75%,var(--color-border-subtle)_76%,transparent_77%,transparent)] bg-[length:20px_20px] bg-surface-container-low flex items-center justify-center">
                <div className="flex flex-col items-center gap-1">
                  <MapPin className="w-6 h-6 text-secondary" />
                  <span className="text-[9px] font-mono font-bold text-text-secondary text-center px-2">{address || 'No address set'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Streaming Link</label>
              <input type="text" value={streamingLink} onChange={(e) => setStreamingLink(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" placeholder="https://stream.crowdflow.io/..." />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Cover Image */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
          <h3 className="text-sm font-bold text-text-primary">Event Cover Image</h3>

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
                <span className="font-medium text-text-primary truncate">{coverImageName}</span>
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
              <p className="text-[10px] text-on-surface-variant font-mono">PNG, JPG, WEBP</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
