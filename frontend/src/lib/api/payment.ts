import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";

/** One ticket's attendee capture, submitted with the order. */
export interface AttendeeInput {
  /** Present only for an assigned-seating slot; absent for GA. */
  seat_id?: number;
  ticket_tier_id: number;
  full_name: string;
  nik: string;
  email: string;
  phone: string;
  /** yyyy-mm-dd */
  dob: string;
}

export interface CreateOrderRequest {
  event_id: number;
  payment_method?: string; // "virtual_account" | "qris" | "credit_card"
  /**
   * The hold being paid for. Required: the backend re-derives the price from
   * this server-side and ignores cart_items for anything money-related, so an
   * order without it is rejected rather than priced from the browser.
   */
  hold_token: string;
  cart_items: {
    cart_item_id: string;
    ticket_category_id: string;
    ticket_category_name: string;
    sale_channel: string;
    unit_face_value: number;
    quantity: number;
    currency: string;
  }[];
  /**
   * One entry per ticket in the hold — the backend rejects the order unless
   * this exactly covers every seat/GA unit the hold contains. Written to
   * order_attendees, which ticket issuance later reads to mint one ticket
   * per attendee.
   */
  attendees: AttendeeInput[];
}

/**
 * cart_items above is display data only. The server prices the order from the
 * hold, so editing these values client-side changes what Snap shows but not
 * what is charged.
 */

export interface CreateOrderResponse {
  order_id: string;
  snap_token: string;
}

export async function createOrder(body: CreateOrderRequest): Promise<ApiResponse<CreateOrderResponse>> {
  return apiRequest<CreateOrderResponse>("/api/v1/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
