/**
 * Shared rules for every document upload in the console.
 *
 * Three surfaces file documents — the /business application wizard, the
 * Business Documents card in organizer Settings (KTP, NPWP, NIB, SIUP), and the
 * per-event Documents tab in the event workspace — hitting different backend
 * routes that all enforce the SAME limits (organizer/service.go:
 * maxDocumentBytes 10MB per file, maxUploadRequestBytes 12MB per request,
 * isValidDocumentType for the format set).
 *
 * The Settings card previously advertised "up to 10MB each" while checking
 * nothing, so an oversized file uploaded in full before being rejected, and the
 * event tab carried its own private copy of the constants. One module so the
 * hint text, the accept filter and the check cannot disagree with each other or
 * with the server.
 */

// Mirrors maxDocumentBytes in backend/internal/organizer/service.go.
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
// Mirrors maxUploadRequestBytes — the cap on a whole multipart request. Only
// the wizard can breach this without breaching the per-file cap, because only
// the wizard sends several files at once.
export const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
export const MAX_FILE_MB = MAX_FILE_BYTES / (1024 * 1024);
export const MAX_REQUEST_MB = MAX_REQUEST_BYTES / (1024 * 1024);

// One accept list and one criteria string, both derived from the constants
// above so the input filter, the on-screen hint and the error text cannot
// drift apart. WebP is included because the backend accepts it.
export const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";
export const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const CRITERIA = `PDF, PNG, JPG/JPEG, or WebP · up to ${MAX_FILE_MB}MB per file, ${MAX_REQUEST_MB}MB total`;
// The single-file surfaces have no combined limit to explain, so they get the
// per-file half of the sentence only.
export const CRITERIA_SINGLE = `PDF, PNG, JPG/JPEG, or WebP · up to ${MAX_FILE_MB}MB each`;

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
 */
export function validateDocument(file: File): string | null {
  if (file.size === 0) {
    return "That file is empty.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return `That file is ${formatSize(file.size)} — the limit is ${MAX_FILE_MB}MB per file.`;
  }
  if (file.type && !ACCEPTED_MIME.includes(file.type)) {
    return "Unsupported format. Upload a PDF, PNG, JPG/JPEG, or WebP.";
  }
  return null;
}
