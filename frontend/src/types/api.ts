/**
 * types/api.ts
 *
 * Mirrors the Go backend's standard response envelope so mock services and
 * real services can share the exact same unwrapping logic later.
 *
 *   Success: { "status": "success", "data": {...} }
 *   Error:   { "error": "Unauthorized", "message": "..." }
 */

export interface ApiSuccessResponse<T> {
    status: "success";
    data: T;
  }
  
  export interface ApiErrorResponse {
    error: string; // short machine-readable code/title, e.g. "Unauthorized"
    message: string; // human-readable detail for display
  }
  
  export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
  
  /** Narrowing helper — checks the discriminant without relying on a `status` field on the error shape. */
  export function isApiError<T>(
    response: ApiResponse<T>
  ): response is ApiErrorResponse {
    return "error" in response;
  }