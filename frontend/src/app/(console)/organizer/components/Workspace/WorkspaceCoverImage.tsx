import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, X, Loader2 } from "lucide-react";
import { uploadEventCover } from "@/lib/api/eorganizer";

interface WorkspaceCoverImageProps {
  eventId: number;
  /** The event's persisted cover_image_url, if it has one. */
  currentUrl?: string;
  /** Fired after a successful upload so the workspace can refetch the event. */
  onUploaded?: (url: string) => void;
  /** Locked while the event sits with an auditor. */
  readOnly?: boolean;
}

// Mirrors the service-side check so an obviously wrong file is rejected before
// it costs a round trip. The backend still sniffs the real type — this is a
// convenience, not the guard.
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

// Rendered wherever the picker is shown, so the rules are visible BEFORE a file
// is chosen rather than only in an error after a rejected upload. Derived from
// MAX_BYTES so the text can't drift from the check. Note .jpg and .jpeg are the
// same image/jpeg type — both are listed because users think of them as
// different formats.
const MAX_MB = MAX_BYTES / (1024 * 1024);
const CRITERIA = `PNG, JPG/JPEG, or WebP · up to ${MAX_MB}MB`;

export default function WorkspaceCoverImage({
  eventId,
  currentUrl,
  onUploaded,
  readOnly = false,
}: WorkspaceCoverImageProps) {
  const [isDragging, setIsDragging] = useState(false);
  // Local object URL for the file being uploaded, shown until the persisted
  // URL comes back so the card never flashes empty mid-upload.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Set only by a successful upload here. Kept separate from `currentUrl`
  // rather than synced into state, so the card shows the new image immediately
  // without waiting for the parent's refetch to land.
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke on replace/unmount so picked files don't leak.
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const applyFile = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      setError("Cover art must be a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Cover art must be ${MAX_MB}MB or smaller.`);
      return;
    }

    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });

    // Unlike the creation wizard, which only carried the file NAME forward, the
    // file is uploaded here and the event points at the stored object.
    setUploading(true);
    const res = await uploadEventCover(eventId, file);
    setUploading(false);

    if (res.success && res.data) {
      setUploadedUrl(res.data.imageUrl);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      onUploaded?.(res.data.imageUrl);
      return;
    }

    // Drop the optimistic preview so the card keeps showing whatever is
    // actually persisted rather than an image that never uploaded.
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setError(res.error?.message ?? "Failed to upload cover image.");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (readOnly || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  };

  const shownUrl = previewUrl ?? uploadedUrl ?? currentUrl;
  const canEdit = !readOnly && !uploading;

  return (
    <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-secondary" /> Event Cover Image
          </h4>
          {/* Always visible, not just in the empty dropzone — the rules matter
              most when replacing an existing image. */}
          <p className="text-[10px] text-text-secondary font-mono">{CRITERIA}</p>
        </div>
        {uploading && (
          <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-text-secondary shrink-0">
            <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so picking the same file twice still fires onChange.
          e.target.value = "";
          if (file) applyFile(file);
        }}
      />

      {shownUrl ? (
        <div className="space-y-2">
          <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border-subtle bg-surface-container-low">
            {/* unoptimized: blob: previews can't be optimized, and the stored
                URL lives on a bucket host that isn't in next.config
                remotePatterns. */}
            <Image src={shownUrl} alt="Event cover" fill unoptimized className="object-cover" />
            {uploading && <div className="absolute inset-0 bg-white/50" />}
          </div>
          {canEdit && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs font-semibold text-secondary hover:underline cursor-pointer"
              >
                Replace image
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); if (canEdit) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => canEdit && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed transition-colors ${
            canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
          } ${isDragging ? 'border-secondary bg-secondary/5' : 'border-border-subtle hover:bg-surface-container-low'}`}
        >
          <ImageIcon className="w-6 h-6 text-on-surface-variant" />
          <p className="text-xs text-text-secondary font-medium text-center">Drag &amp; drop cover art, or click to browse</p>
          <p className="text-[10px] text-on-surface-variant font-mono">{CRITERIA}</p>
        </div>
      )}

      {error && (
        <p className="flex items-start gap-1.5 text-[11px] text-danger">
          <X className="w-3.5 h-3.5 shrink-0 mt-px" /> {error}
        </p>
      )}
      {readOnly && (
        <p className="text-[10px] text-text-secondary">
          The cover image is locked while this event is under review.
        </p>
      )}
    </div>
  );
}
