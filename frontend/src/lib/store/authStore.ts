/**
 * lib/store/authStore.ts
 *
 * Zustand auth store — support mock + real backend.
 * Setelah backend login sukses, panggil set_user_from_api()
 * untuk sync user ke store.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { logoutUser } from "@/lib/api/auth";

export interface AuthUser {
  user_id: string;
  full_name: string;
  email: string;
  role: "user" | "verified_organizer" | "auditor" | "super_admin" | "gate_scanner";
  tier: "Free" | "Pro Tier" | "Enterprise";
  avatar_url: string;
}

interface AuthState {
  user: AuthUser | null;
  is_authenticated: boolean;
  /** Called after successful backend login — syncs user from API response */
  set_user_from_api: (user: any) => void;
  /** Mock login — used when backend is not ready */
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  /** Local-only reset for when the server has already invalidated the session. */
  clear_session: () => void;
}

const MOCK_USERS: (AuthUser & { password: string })[] = [
  {
    user_id: "usr_001",
    full_name: "Richie Obhasa",
    email: "richie@crowdflow.com",
    password: "password123",
    role: "verified_organizer",
    tier: "Pro Tier",
    avatar_url: "",
  },
  {
    user_id: "usr_002",
    full_name: "Andra Rizki",
    email: "andra@crowdflow.com",
    password: "password123",
    role: "user",
    tier: "Free",
    avatar_url: "",
  },
  {
    user_id: "usr_admin",
    full_name: "Super Admin",
    email: "admin@crowdflow.com",
    password: "admin123",
    role: "super_admin",
    tier: "Enterprise",
    avatar_url: "",
  },
];

// Map backend/database custom legacy role names to client-side expected roles
const DATABASE_ROLE_MAPPING: Record<string, string> = {
  "Event Organizer": "verified_organizer",
  "Organizer": "verified_organizer",
  "organizer": "verified_organizer",
  "event_organizer": "verified_organizer",
  "Super Admin": "super_admin",
  "Admin": "super_admin",
  "admin": "super_admin",
  "superadmin": "super_admin",
  "Auditor": "auditor",
  "auditor": "auditor",
  "User": "user",
  "user": "user",
  "Customer": "user",
};

/**
 * Automatically translates database role strings to client-friendly formats.
 * e.g., "Event Organizer" -> "verified_organizer", "Super Admin" -> "super_admin".
 */
export function normalizeUserRole(apiRole: string): string {
  if (!apiRole) return "user";
  const trimmed = apiRole.trim();
  if (DATABASE_ROLE_MAPPING[trimmed]) {
    return DATABASE_ROLE_MAPPING[trimmed];
  }
  const slug = trimmed.toLowerCase().replace(/[\s-]+/g, "_");
  if (DATABASE_ROLE_MAPPING[slug]) {
    return DATABASE_ROLE_MAPPING[slug];
  }
  return slug;
}

/**
 * Single source of truth for where a role lands after login. Accepts a raw
 * or normalized role string; normalizes it, then maps to that role's console
 * home. Every other role (user, gate_scanner, unknown) lands on the public
 * home page.
 */
export function getRoleLandingPath(role: string): string {
  switch (normalizeUserRole(role)) {
    case "super_admin":
      return "/admin";
    case "verified_organizer":
      return "/organizer";
    case "auditor":
      return "/auditor";
    default:
      return "/";
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      is_authenticated: false,

      set_user_from_api: (apiUser: any) => {
        if (!apiUser) return;

        const user: AuthUser = {
          user_id: apiUser.user_id || apiUser.id || "",
          full_name: apiUser.full_name || "",
          email: apiUser.email || "",
          role: normalizeUserRole(apiUser.role || "User") as AuthUser["role"],
          tier: apiUser.tier || "Free",
          avatar_url: apiUser.avatar_url || "",
        };

        set({ user, is_authenticated: true });
      },

      login: async (email, password) => {
        await new Promise((r) => setTimeout(r, 1000));
        const found = MOCK_USERS.find(
          (u) => u.email === email && u.password === password
        );
        if (!found) {
          return { success: false, message: "Incorrect email or password." };
        }
        const { password: _, ...user } = found;
        set({ user, is_authenticated: true });
        return { success: true, message: "Login successful!" };
      },

      logout: async () => {
        try {
          await logoutUser();
        } catch (e) {
          // ignore session cleanup failure
        }
        if (typeof document !== "undefined") {
          document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
          document.cookie = "csrf_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
          document.cookie = "refresh_token=; path=/api/v1/auth; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
          document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
        }
        set({ user: null, is_authenticated: false });
      },

      /**
       * Drop the local session without calling the server.
       *
       * For when the server has already told us the session is gone — a failed
       * token refresh. This state is persisted to localStorage, so without it
       * `is_authenticated` outlived the server session: /login saw the stale
       * flag, bounced straight back to `?from=`, that page hit another 401, and
       * the two ping-ponged. Calling logout() here instead would fire a request
       * that is guaranteed to fail on a session that no longer exists.
       */
      clear_session: () => set({ user: null, is_authenticated: false }),
    }),
    { name: "crowdflow_auth" }
  )
);