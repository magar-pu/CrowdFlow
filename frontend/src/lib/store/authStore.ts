/**
 * lib/store/authStore.ts
 *
 * Zustand auth store — support mock + real backend.
 * Setelah backend login sukses, panggil set_user_from_api()
 * untuk sync user ke store.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  user_id: string;
  full_name: string;
  email: string;
  role: "user" | "verified_organizer" | "auditor" | "super_admin";
  tier: "Free" | "Pro Tier" | "Enterprise";
  avatar_url: string;
}

interface AuthState {
  user: AuthUser | null;
  is_authenticated: boolean;
  /** Dipanggil setelah backend login sukses — sync user dari API response */
  set_user_from_api: (user: AuthUser) => void;
  /** Mock login — dipakai saat backend belum ready */
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      is_authenticated: false,

      set_user_from_api: (user: AuthUser) => {
        set({ user, is_authenticated: true });
      },

      login: async (email, password) => {
        await new Promise((r) => setTimeout(r, 1000));
        const found = MOCK_USERS.find(
          (u) => u.email === email && u.password === password
        );
        if (!found) {
          return { success: false, message: "Email atau password salah." };
        }
        const { password: _, ...user } = found;
        set({ user, is_authenticated: true });
        return { success: true, message: "Login berhasil!" };
      },

      logout: () => {
        set({ user: null, is_authenticated: false });
      },
    }),
    { name: "crowdflow_auth" }
  )
);