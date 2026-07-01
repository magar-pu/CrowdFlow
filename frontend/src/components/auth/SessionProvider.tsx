"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { is_authenticated, set_user_from_api } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    async function restoreSession() {
      if (!is_authenticated) {
        try {
          const res = await fetch("/api/auth/me");
          const result = await res.json();
          if (result.success && result.data) {
            set_user_from_api(result.data);
          }
        } catch {
          // ignore network failure
        }
      }
    }
    restoreSession();
  }, [isMounted, is_authenticated, set_user_from_api]);

  return <>{children}</>;
}
