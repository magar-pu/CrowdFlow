import React, { useRef, useState } from 'react';
import { DocumentStatus } from '../../types';
import { Bold, Italic, List, Link2, MapPin, Globe2, Image as ImageIcon, UploadCloud, X, FileText } from 'lucide-react';

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
  documents: DocumentStatus[];
  setDocuments: (v: DocumentStatus[]) => void;
}

const DOC_CATEGORIES: DocumentStatus['category'][] = [
  'Permits & Licenses',
  'Vendor & Venue Contracts',
  'Artist & Talent Agreements',
  'Supporting Documents',
];

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
  documents, setDocuments,
}: StepBasicInfoProps) {
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setCoverImageName(file.name);
  };

  const handleDocDrop = (e: React.DragEvent, cat: DocumentStatus['category']) => {
    e.preventDefault();
    setDraggingCategory(null);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setDocuments([...documents, { name: file.name, type: file.type || 'FILE', status: 'READY', category: cat }]);
  };

  const handleDocRemove = (idx: number) => {
    setDocuments(documents.filter((_, i) => i !== idx));
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
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none cursor-pointer">
                <option value="Conference">Conference</option>
                <option value="Festival">Festival</option>
                <option value="Workshop">Workshop</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Description</label>
            <div className="border border-border-subtle rounded-lg overflow-hidden">
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border-subtle bg-surface-container-low">
                <button type="button" title="Bold" className="p-1.5 rounded text-text-secondary hover:bg-white hover:text-text-primary transition-colors cursor-pointer">
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button type="button" title="Italic" className="p-1.5 rounded text-text-secondary hover:bg-white hover:text-text-primary transition-colors cursor-pointer">
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button type="button" title="List" className="p-1.5 rounded text-text-secondary hover:bg-white hover:text-text-primary transition-colors cursor-pointer">
                  <List className="w-3.5 h-3.5" />
                </button>
                <button type="button" title="Link" className="p-1.5 rounded text-text-secondary hover:bg-white hover:text-text-primary transition-colors cursor-pointer">
                  <Link2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full p-3 text-xs bg-white outline-none resize-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Start Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">End Time</label>
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
        {/* Credentials & Documents */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
          <h3 className="text-sm font-bold text-text-primary">Credentials & Documents</h3>

          <div className="space-y-4">
            {DOC_CATEGORIES.map((cat) => (
              <div key={cat} className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase block">{cat}</label>
                <label
                  onDragOver={(e) => { e.preventDefault(); setDraggingCategory(cat ?? null); }}
                  onDragLeave={() => setDraggingCategory(null)}
                  onDrop={(e) => handleDocDrop(e, cat)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer transition-colors ${
                    draggingCategory === cat ? 'border-secondary bg-secondary/5' : 'border-border-subtle hover:bg-surface-container-low'
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setDocuments([...documents, { name: file.name, type: 'PDF/DOCX', status: 'READY', category: cat }]);
                    }}
                  />
                  <UploadCloud className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                  <span className="text-[10px] text-on-surface-variant font-mono">Upload PDF / DOCX</span>
                </label>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-border-subtle space-y-3">
            {documents.length === 0 ? (
              <p className="text-[10px] text-on-surface-variant font-mono">No documents uploaded yet.</p>
            ) : (
              documents.map((doc, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-text-primary truncate">{doc.name}</p>
                      <span className="text-[9px] text-on-surface-variant font-mono">{doc.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full font-mono text-[8px] font-bold ${
                      doc.status === 'VERIFIED' ? 'bg-success/10 text-success' : 'bg-secondary/10 text-secondary'
                    }`}>
                      {doc.status}
                    </span>
                    <button onClick={() => handleDocRemove(idx)} className="text-on-surface-variant hover:text-danger transition-colors cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cover Image */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
          <h3 className="text-sm font-bold text-text-primary">Event Cover Image</h3>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingCover(true); }}
            onDragLeave={() => setIsDraggingCover(false)}
            onDrop={handleCoverDrop}
            onClick={() => coverInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
              isDraggingCover ? 'border-secondary bg-secondary/5' : 'border-border-subtle hover:bg-surface-container-low'
            }`}
          >
            <input
              ref={coverInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && setCoverImageName(e.target.files[0].name)}
            />
            <ImageIcon className="w-6 h-6 text-on-surface-variant" />
            <p className="text-xs text-text-secondary font-medium text-center">Drag & drop cover art, or click to browse</p>
            <p className="text-[10px] text-on-surface-variant font-mono">PNG, JPG, WEBP</p>
          </div>
          {coverImageName && (
            <div className="flex items-center justify-between px-3 py-2 bg-surface-container-low border border-border-subtle rounded-lg text-xs">
              <span className="font-medium text-text-primary truncate">{coverImageName}</span>
              <button onClick={() => setCoverImageName(null)} className="text-on-surface-variant hover:text-danger transition-colors cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
