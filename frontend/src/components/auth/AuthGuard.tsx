"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";

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
  const { is_authenticated, user } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // 1. Handle hydration to avoid Server-Side Rendering (SSR) mismatches
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // 2. Perform authentication and role checks once hydrated
  useEffect(() => {
    if (!isHydrated) return;

    if (!is_authenticated) {
      router.replace(redirectTo);
      return;
    }

    if (requiredRole && user && user.role !== requiredRole && user.role !== "super_admin") {
      // If user doesn't match the specific role (super_admin bypasses role checks)
      router.replace("/");
    }
  }, [isHydrated, is_authenticated, user, requiredRole, redirectTo, router]);

  // 3. Show a sleek, premium loading screen while state is loading
  if (!isHydrated || !is_authenticated) {
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
