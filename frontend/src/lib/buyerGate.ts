/**
 * lib/buyerGate.ts
 *
 * Client-side mirror of the backend's purchase gate (RequireBuyer,
 * backend/internal/middleware/buyer.go): only accounts resolving to the
 * platform "User" role may buy tickets. Organizer, auditor and Super Admin
 * accounts cannot, with no exception.
 *
 * This is a UI convenience only — it exists so purchase CTAs can show a
 * reason instead of failing silently or acting as a dead button. The actual
 * enforcement is server-side (POST /booking/holds, POST /orders); this check
 * can be stale for the same reason any client role read can (see
 * RequireBuyer's JWT-vs-DB comment) and must never be trusted as security.
 *
 * Message text matches the backend's 403 body verbatim so the two surfaces
 * never disagree about why a purchase was blocked.
 */

import type { AuthUser } from "@/lib/store/authStore";

export const BUYER_BLOCKED_MESSAGE =
  "This account can't buy tickets. Organizer, auditor and staff accounts are for managing events — sign in with a personal account to purchase.";

/**
 * True when the signed-in user is allowed to purchase, or when nobody is
 * signed in yet (the signed-out case is handled separately by each page's
 * existing login-redirect flow, not by this gate).
 */
export function canPurchase(user: AuthUser | null): boolean {
  if (!user) return true;
  return user.role === "user";
}
