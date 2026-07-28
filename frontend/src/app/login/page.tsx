/**
 * app/login/page.tsx
 *
 * Merged: backend API (teammate) + Zustand authStore (frontend).
 *
 * Flow:
 * 1. Coba POST /api/auth/login (backend teammate)
 * 2. Kalau sukses → sync user ke Zustand via set_user_from_api → redirect
 * 3. Kalau backend belum ready (network error) → fallback ke mock login
 * 4. Google OAuth tetap ada, sync ke Zustand juga setelah sukses
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/SignInForm";
import { AuthFooterLink } from "@/components/auth/AuthFooterLink";
import { useAuthStore, getRoleLandingPath } from "@/lib/store/authStore";
import { loginUser } from "@/lib/api/auth";

const BACKEND_READY = true; // Flip ke true setelah Go backend live

function SignInPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, is_authenticated, login, set_user_from_api, logout } = useAuthStore();
  const [error_message, set_error_message] = useState("");
  const [success_message, set_success_message] = useState("");

  // Redirect away if already authenticated (respecting ?from= query param)
  useEffect(() => {
    if (is_authenticated && user) {
      const from = searchParams.get("from");
      const validFrom = from && !from.startsWith("/login") && !from.startsWith("/register") ? from : null;
      router.replace(validFrom || getRoleLandingPath(user.role));
    }
  }, [is_authenticated, user, router, searchParams]);

  // Check URL query parameters for Google OAuth callback errors and registration success
  useEffect(() => {
    const error = searchParams.get("error");
    const provider = searchParams.get("provider");
    const registered = searchParams.get("registered");
    
    if (error === "PROVIDER_MISMATCH") {
      if (provider === "native") {
        set_error_message("This email is registered using a password. Please sign in with your email and password.");
      }
    } else if (registered === "true") {
      set_success_message("Registration successful! Please sign in using your credentials.");
    }
  }, [searchParams]);

  async function handle_submit(
    email: string,
    password: string,
    _stay_signed_in: boolean
  ) {
    set_error_message("");
    set_success_message("");

    if (BACKEND_READY) {
      // ── Path A: Real backend ──────────────────────────────────────
      const result = await loginUser({ email, password });

      if (result.success && result.data) {
        // Sync user from API response to Zustand
        set_user_from_api(result.data);

        const from = searchParams.get("from");
        const validFrom = from && !from.startsWith("/login") && !from.startsWith("/register") ? from : null;
        const targetPath = validFrom || getRoleLandingPath(result.data.role ?? "");
        router.push(targetPath);
      } else {
        set_error_message(result.error?.message ?? "Login failed.");
        throw new Error(result.error?.message);
      }
    } else {
      // ── Path B: Mock login (backend not ready) ──────────────────
      const result = await login(email, password);
      if (!result.success) {
        set_error_message(result.message);
        throw new Error(result.message);
      }
      const from = searchParams.get("from");
      const validFrom = from && !from.startsWith("/login") && !from.startsWith("/register") ? from : null;
      router.push(validFrom || "/");
    }
  }

  async function handle_google_success(token: string) {
    set_error_message("");
    set_success_message("");
    try {
      const res = await fetch("/api/v1/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const result = await res.json();

      if (result.success) {
        // Sync Google user to Zustand as well
        set_user_from_api(result.data);
        const from = searchParams.get("from");
        const validFrom = from && !from.startsWith("/login") && !from.startsWith("/register") ? from : null;
        const targetPath = validFrom || getRoleLandingPath(result.data?.role ?? "");
        router.push(targetPath);
      } else {
        set_error_message(result.error?.message ?? "Google login failed.");
      }
    } catch {
      set_error_message("Cannot connect to server during Google Sign-In.");
    }
  }

  function handle_google_error() {
    set_error_message("Google Sign-In was cancelled or failed.");
  }

  return (
    <AuthShell>
      {error_message && (
        <div className="mx-8 mt-6 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 font-body-sm text-body-sm text-danger">
          {error_message}
        </div>
      )}
      {success_message && (
        <div className="mx-8 mt-6 rounded-lg border border-success/20 bg-success/5 px-4 py-3 font-body-sm text-body-sm text-success">
          {success_message}
        </div>
      )}
      <SignInForm
        on_submit={handle_submit}
        on_google_success={handle_google_success}
        on_google_error={handle_google_error}
      />
      <AuthFooterLink
        prompt="Don't have an account?"
        link_label="Create an account"
        href="/register"
      />
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInPageContent />
    </Suspense>
  );
}