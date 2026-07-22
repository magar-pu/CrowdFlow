import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";
import { Delegation } from "@/lib/api/delegations";

export interface UserDelegations {
  owned: Delegation[]; // co-organizers this user has granted (as owner)
  received: Delegation[]; // events delegated to this user (as delegate)
}

// Super Admin read-only oversight of a user's co-organizer delegations.
export async function getUserDelegations(
  userId: string | number
): Promise<ApiResponse<UserDelegations>> {
  return apiRequest<UserDelegations>(`/api/v1/admin/users/${userId}/delegations`, {
    method: "GET",
  });
}

// Super Admin moderation revoke of any delegation.
export async function adminRevokeDelegation(
  delegationId: number
): Promise<ApiResponse<{ revoked: boolean }>> {
  return apiRequest<{ revoked: boolean }>(`/api/v1/admin/delegations/${delegationId}`, {
    method: "DELETE",
  });
}
