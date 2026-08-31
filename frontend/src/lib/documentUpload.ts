/**
 * Shared rules for every document upload in the console.
 *
 * Three surfaces file documents — the /business application wizard, the
 * Business Documents card in organizer Settings (KTP, NPWP, NIB, SIUP), and the
 * per-event Documents tab in the event workspace — hitting different backend
 * routes that all enforce the SAME limits (organizer/service.go:
 * documentTypeLimits per-type caps, maxUploadRequestBytes 12MB per request,
 * isValidDocumentType for the format set).
 *
 * The Settings card previously advertised "up to 10MB each" while checking
 * nothing, so an oversized file uploaded in full before being rejected, and the
 * event tab carried its own private copy of the constants. One module so the
 * hint text, the accept filter and the check cannot disagree with each other or
 * with the server.
 */

// Mirrors documentTypeLimits in backend/internal/organizer/service.go, key
// for key. 2MB for KTP/PIC_ID/NPWP/NIB/SIUP/BUSINESS_LICENSE: that is exactly
// what Indonesia's own DJP Online (NPWP) and OSS (NIB) portals accept for the
// same document, and ten times what SSCASN accepts for a KTP (200KB) — every
// organizer already has documents that fit. 5MB for the permits, which are
// scanned government paperwork and sometimes multi-page. 10MB for the event
// proposal, the one document that is meant to be a long-form write-up rather
// than a scanned form.
export const DOCUMENT_TYPE_LIMITS: Record<string, number> = {
  KTP: 2 * 1024 * 1024,
  PIC_ID: 2 * 1024 * 1024,
  NPWP: 2 * 1024 * 1024,
  NIB: 2 * 1024 * 1024,
  SIUP: 2 * 1024 * 1024,
  BUSINESS_LICENSE: 2 * 1024 * 1024,
  CROWD_PERMIT: 5 * 1024 * 1024,
  VENUE_PERMIT: 5 * 1024 * 1024,
  EVENT_PROPOSAL: 10 * 1024 * 1024,
};

// Used only if a type isn't in the table above — should never happen for a
// type the backend actually accepts, but keeps this module total (a known
// safe answer) instead of throwing if the two sides ever drift for a moment.
const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;

export function maxFileBytesForType(type: string): number {
  return DOCUMENT_TYPE_LIMITS[type] ?? DEFAULT_MAX_FILE_BYTES;
}

export function maxFileMBForType(type: string): number {
  return maxFileBytesForType(type) / (1024 * 1024);
}

// Mirrors maxUploadRequestBytes — the cap on a whole multipart request. Only
// the wizard can breach this without breaching any single per-file cap,
// because only the wizard sends several files at once.
export const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
export const MAX_REQUEST_MB = MAX_REQUEST_BYTES / (1024 * 1024);

// One accept list, both derived from the format set so the input filter
// cannot drift from what the server actually accepts. WebP is included
// because the backend accepts it.
export const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";
export const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/** Per-slot hint text: the limit that applies to THIS document type, not a generic one. */
export function criteriaSingleForType(type: string): string {
  return `PDF, PNG, JPG/JPEG, or WebP · up to ${maxFileMBForType(type)}MB`;
}

/** Same, plus the combined-request half — for surfaces where several files upload together. */
export function criteriaForType(type: string): string {
  return `PDF, PNG, JPG/JPEG, or WebP · up to ${maxFileMBForType(type)}MB per file, ${MAX_REQUEST_MB}MB total`;
}

export function formatSize(bytes: number): string {
  if (bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Rejects a file the server would reject anyway, before it is uploaded.
 *
 * The browser's `type` is trusted only to say no early — it comes from the file
 * extension and is spoofable. The backend re-sniffs the real bytes with
 * http.DetectContentType, which is the check that actually protects anything.
 * An empty `type` (unknown extension) is passed through rather than guessed at.
 *
 * `type` is the DOCUMENT type (KTP, EVENT_PROPOSAL, ...), not the MIME type —
 * it selects which per-type limit applies. Callers should run the file
 * through compressImageIfNeeded() first: this function only checks, it does
 * not shrink anything.
 */
export function validateDocument(file: File, type: string): string | null {
  if (file.size === 0) {
    return "That file is empty.";
  }
  const maxBytes = maxFileBytesForType(type);
  if (file.size > maxBytes) {
    return `That file is ${formatSize(file.size)} — the limit is ${maxFileMBForType(type)}MB per file.`;
  }
  if (file.type && !ACCEPTED_MIME.includes(file.type)) {
    return "Unsupported format. Upload a PDF, PNG, JPG/JPEG, or WebP.";
  }
  return null;
}

// ============================================================================
// Client-side image compression
// ============================================================================
//
// A phone photo of a document is routinely 3-6MB — comfortably over even the
// most generous per-type cap above — while the actual information on the page
// (a NIK, a signature, a permit stamp) needs nowhere near that many pixels to
// stay legible. Downscaling and re-encoding before upload turns "reject and
// ask the user to go compress it themselves" into "just works".
//
// PDFs are never touched: a canvas cannot re-encode a PDF, and a corrupted
// NIB is worse than a large one. Only the three raster formats this module
// accepts are eligible.

const COMPRESSIBLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Longest edge after downscaling. Measured against a synthetic KTP-photo
 * test image: at this size + quality, small print (a 16-digit NIK) stays
 * cleanly readable while a typical phone photo shrinks 10-16x. */
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_JPEG_QUALITY = 0.8;

/**
 * Downscales and re-encodes an image file as JPEG before upload. Always
 * re-encodes eligible images (not just ones over the dimension threshold),
 * but only returns the result if it's actually smaller than the input — an
 * already-small, already-compressed source is left untouched rather than
 * risking a pointless quality loss for a larger file.
 *
 * Never throws and never returns an empty/blank file: any failure along the
 * way (decode error, canvas unavailable, etc.) falls back to the original
 * file, unmodified, so upload can proceed and the size check downstream
 * makes the final call.
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (!COMPRESSIBLE_IMAGE_TYPES.has(file.type)) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    try {
      const { width, height } = bitmap;
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;

      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", IMAGE_JPEG_QUALITY)
      );
      if (!blob || blob.size >= file.size) {
        return file;
      }

      const newName = file.name.replace(/\.[^./\\]+$/, "") + ".jpg";
      return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
    } finally {
      bitmap.close();
    }
  } catch (err) {
    console.warn("Image compression failed, uploading the original file instead:", err);
    return file;
  }
}
