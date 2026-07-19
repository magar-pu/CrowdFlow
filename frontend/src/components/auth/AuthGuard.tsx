"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { getMe } from "@/lib/api/auth";

interface AuthGuardProps {
  children: React.ReactNode;
  /**
   * Optional role required to view the page/layout.
   * If the authenticated user does not have this role, they will be redirected.
   */
  requiredRole?: "user" | "verified_organizer" | "auditor" | "super_admin";
  /**
   * Redirect destination for unauthenticated users. Defaults to "/login".
   */
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requiredRole,
  redirectTo = "/login",
}: AuthGuardProps) {
  const router = useRouter();
  const { is_authenticated, user, set_user_from_api, logout } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // 1. Handle hydration and always re-verify the session against the server.
  // Persisted Zustand state (is_authenticated/role) is client-controlled and
  // can be edited in devtools/localStorage, so it must never be trusted for a
  // role check on its own - only skip verification when getMe() genuinely
  // can't be reached (network failure), falling back to persisted state.
  useEffect(() => {
    setIsHydrated(true);

    async function verifySession() {
      try {
        const result = await getMe();
        if (result.success && result.data) {
          set_user_from_api(result.data);
        } else if (is_authenticated) {
          // Server says the session is no longer valid but local state
          // still claims otherwise - clear it rather than trusting the stale copy.
          await logout();
        }
      } catch {
        // Network failure: fall back to whatever was persisted locally.
      }
      setCheckingSession(false);
    }

    verifySession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Perform authentication and role checks once session is verified
  useEffect(() => {
    if (!isHydrated || checkingSession) return;

    if (!is_authenticated) {
      router.replace(redirectTo);
      return;
    }

    if (requiredRole && user && user.role !== requiredRole && user.role !== "super_admin") {
      // If user doesn't match the specific role (super_admin bypasses role checks)
      router.replace("/");
    }
  }, [isHydrated, checkingSession, is_authenticated, user, requiredRole, redirectTo, router]);

  // 3. Show a sleek, premium loading screen while state is loading
  if (!isHydrated || checkingSession || !is_authenticated) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-surface-dim">
        <div className="flex flex-col items-center space-y-4">
          {/* Pulsing premium spinner */}
          <div className="relative flex h-12 w-12 items-center justify-center">
            <div className="absolute h-full w-full animate-ping rounded-full bg-primary/20 opacity-75"></div>
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
          <p className="text-sm font-medium text-label-muted animate-pulse">
            Verifying your session...
          </p>
        </div>
      </div>
    );
  }

  // 4. Render children if authenticated and meets role requirement
  if (requiredRole && user && user.role !== requiredRole && user.role !== "super_admin") {
    return null; // Let the redirect trigger in useEffect
  }

  return <>{children}</>;
}
