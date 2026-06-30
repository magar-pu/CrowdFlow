/**
 * types/api.ts
 *
 * Mirrors the Go backend's standard response envelope so mock services and
 * real services can share the exact same unwrapping logic later.
 *
 *   Success: { "status": "success", "data": {...} }
 *   Error:   { "error": "Unauthorized", "message": "..." }
 */

export interface APIError {
  code: string;       // short machine-readable code, e.g. "UNAUTHORIZED", "VALIDATION_FAILED"
  message: string;    // human-readable detail for display
  details?: any;      // optional structured validation error details
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
}