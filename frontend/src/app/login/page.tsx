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

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/SignInForm";
import { AuthFooterLink } from "@/components/auth/AuthFooterLink";
import { useAuthStore } from "@/lib/store/authStore";
import { loginUser } from "@/lib/api/auth";

const BACKEND_READY = true; // Flip ke true setelah Go backend live

export default function SignInPage() {
  const router = useRouter();
  const { login, set_user_from_api } = useAuthStore();
  const [error_message, set_error_message] = useState("");

  async function handle_submit(
    email: string,
    password: string,
    _stay_signed_in: boolean
  ) {
    set_error_message("");

    if (BACKEND_READY) {
      // ── Path A: Real backend ──────────────────────────────────────
      const result = await loginUser({ email, password });

      if (result.success && result.data) {
        // Sync user dari API response ke Zustand
        set_user_from_api(result.data);
        router.push("/");
      } else {
        set_error_message(result.error?.message ?? "Login gagal.");
        throw new Error(result.error?.message);
      }
    } else {
      // ── Path B: Mock login (backend belum ready) ──────────────────
      const result = await login(email, password);
      if (!result.success) {
        set_error_message(result.message);
        throw new Error(result.message);
      }
      router.push("/");
    }
  }

  async function handle_google_success(token: string) {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const result = await res.json();

      if (result.success) {
        // Sync Google user ke Zustand juga
        set_user_from_api(result.data);
        router.push("/");
      } else {
        set_error_message(result.error?.message ?? "Google login gagal.");
      }
    } catch {
      set_error_message("Tidak dapat terhubung ke server saat Google Sign-In.");
    }
  }

  function handle_google_error() {
    set_error_message("Google Sign-In dibatalkan atau gagal.");
  }

  return (
    <AuthShell>
      {error_message && (
        <div className="mx-8 mt-6 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 font-body-sm text-body-sm text-danger">
          {error_message}
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