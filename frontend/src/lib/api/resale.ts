/**
 * lib/api/resale.ts
 *
 * Frontend API service for the Resale Marketplace.
 * All HTTP calls go through the centralized apiRequest wrapper
 * as mandated by the API clean code guidelines.
 */

import { apiRequest } from "@/utils/api";
import type { ApiResponse } from "@/types/api";
import type { ResaleListing } from "@/types/ticket";

// ─────────────────────────────────────────────────────────────────────────
// Response types matching backend DTOs
// ─────────────────────────────────────────────────────────────────────────

/** Matches ResaleListingDetailResponse from the backend */
export interface ResaleListingDetail extends ResaleListing {
  seller_name: string;
  tier_name: string;
  created_at: string;
  expires_at: string;
}

/** Payload for creating a new resale listing */
export interface CreateResaleListingBody {
  ticket_id: string;
  listing_price: number;
}

// ─────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────

/**
 * Fetch all active resale listings (public, paginated).
 */
export async function fetchResaleListings(
  limit = 20,
  offset = 0
): Promise<ApiResponse<ResaleListing[]>> {
  return apiRequest<ResaleListing[]>(
    `/api/resale/listings?limit=${limit}&offset=${offset}`
  );
}

/**
 * Fetch a single resale listing's full detail by UUID.
 */
export async function fetchResaleListingDetail(
  id: string
): Promise<ApiResponse<ResaleListingDetail>> {
  return apiRequest<ResaleListingDetail>(`/api/resale/listings/${id}`);
}

/**
 * Fetch the authenticated user's own resale listings.
 */
export async function fetchMyResaleListings(): Promise<
  ApiResponse<ResaleListing[]>
> {
  return apiRequest<ResaleListing[]>("/api/resale/my-listings");
}

/**
 * Create a new resale listing for an owned ticket.
 */
export async function createResaleListing(
  body: CreateResaleListingBody
): Promise<ApiResponse<ResaleListing>> {
  return apiRequest<ResaleListing>("/api/resale/listings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Cancel an active resale listing (owner only).
 */
export async function cancelResaleListing(
  id: string
): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/api/resale/listings/${id}`, {
    method: "DELETE",
  });
}
