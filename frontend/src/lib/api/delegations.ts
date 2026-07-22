import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";

// ---- Types (mirror backend internal/delegation delegationDTO) ----

export type DelegationScope = "all" | "specific";
export type DelegationStatus = "pending" | "active" | "declined" | "revoked";

export interface DelegationEvent {
  event_id: number;
  name: string;
}

export interface Delegation {
  id: number;
  owner_id: number;
  owner_name: string;
  owner_email: string;
  delegate_id: number;
  delegate_name: string;
  delegate_email: string;
  scope: DelegationScope;
  status: DelegationStatus;
  requested_by: number;
  approved_by?: number;
  note?: string;
  events: DelegationEvent[];
  created_at: string;
  decided_at?: string;
  updated_at: string;
}

export interface InviteCoOrganizerBody {
  delegate_email?: string;
  delegate_id?: number;
  scope: DelegationScope;
  event_ids?: number[];
  note?: string;
}

export interface RequestDelegationBody {
  owner_email?: string;
  owner_id?: number;
  scope: DelegationScope;
  event_ids?: number[];
  note?: string;
}

export interface EditScopeBody {
  scope: DelegationScope;
  event_ids?: number[];
}

const BASE = "/api/organizer/delegations";

// ---- Owner-driven ----

export async function listOwnerDelegations(): Promise<ApiResponse<Delegation[]>> {
  return apiRequest<Delegation[]>(BASE, { method: "GET" });
}

export async function inviteCoOrganizer(
  body: InviteCoOrganizerBody
): Promise<ApiResponse<Delegation>> {
  return apiRequest<Delegation>(BASE, { method: "POST", body: JSON.stringify(body) });
}

export async function editDelegationScope(
  id: number,
  body: EditScopeBody
): Promise<ApiResponse<Delegation>> {
  return apiRequest<Delegation>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export async function approveDelegation(id: number): Promise<ApiResponse<Delegation>> {
  return apiRequest<Delegation>(`${BASE}/${id}/approve`, { method: "POST" });
}

export async function declineDelegation(id: number): Promise<ApiResponse<Delegation>> {
  return apiRequest<Delegation>(`${BASE}/${id}/decline`, { method: "POST" });
}

export async function revokeDelegation(id: number): Promise<ApiResponse<{ revoked: boolean }>> {
  return apiRequest<{ revoked: boolean }>(`${BASE}/${id}`, { method: "DELETE" });
}

// ---- Delegate-driven ----

export async function listReceivedDelegations(): Promise<ApiResponse<Delegation[]>> {
  return apiRequest<Delegation[]>(`${BASE}/received`, { method: "GET" });
}

export async function requestDelegation(
  body: RequestDelegationBody
): Promise<ApiResponse<Delegation>> {
  return apiRequest<Delegation>(`${BASE}/request`, { method: "POST", body: JSON.stringify(body) });
}
