"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { getMe } from "@/lib/api/auth";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { set_user_from_api } = useAuthStore();
  const hasRestored = useRef(false);

  useEffect(() => {
    // Only attempt session restoration ONCE per page session
    if (hasRestored.current) return;
    hasRestored.current = true;

    async function restoreSession() {
      try {
        const result = await getMe();
        if (result.success && result.data) {
          set_user_from_api(result.data);
        } else {
          useAuthStore.setState({ user: null, is_authenticated: false });
        }
      } catch {
        useAuthStore.setState({ user: null, is_authenticated: false });
      }
    }

    restoreSession();
  }, [set_user_from_api]);

  return <>{children}</>;
}
