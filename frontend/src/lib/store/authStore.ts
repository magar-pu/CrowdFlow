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
};

/**
 * Automatically translates database role strings to client-friendly formats.
 * e.g., "Event Organizer" -> "verified_organizer", "Gate Scanner" -> "gate_scanner".
 */

export function normalizeUserRole(apiRole: string): string {
  if (DATABASE_ROLE_MAPPING[apiRole]) {
    return DATABASE_ROLE_MAPPING[apiRole];
  }
  return apiRole.toLowerCase().replace(/\s+/g, "_");
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
        set({ user: null, is_authenticated: false });
      },
    }),
    { name: "crowdflow_auth" }
  )
);