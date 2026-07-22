import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";

export interface CreateOrderRequest {
  event_id: number;
  payment_method?: string; // "virtual_account" | "qris" | "credit_card"
  cart_items: {
    cart_item_id: string;
    ticket_category_id: string;
    ticket_category_name: string;
    sale_channel: string;
    unit_face_value: number;
    quantity: number;
    currency: string;
  }[];
}

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
