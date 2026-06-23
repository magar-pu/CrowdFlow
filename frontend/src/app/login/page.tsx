"use client";

/**
 * app/login/page.tsx
 *
 * Sign In page — AuthShell (brand header + card) wrapping SignInForm,
 * plus the "Don't have an account?" footer link. Matches the
 * crowdflow_sign_in Stitch screen end-to-end.
 *
 * on_submit currently simulates a network delay then redirects home.
 * Once the Go backend exists, replace the setTimeout below with a real
 * POST /api/v1/auth/login call, store the returned session token, and
 * redirect based on the response (e.g. to /dashboard for organizers).
 */

import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/SignInForm";
import { AuthFooterLink } from "@/components/auth/AuthFooterLink";

export default function SignInPage() {
  const router = useRouter();

  async function handle_submit(
    email: string,
    password: string,
    stay_signed_in: boolean
  ) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (result.success) {
        router.push("/");
      } else {
        alert(`Login failed: ${result.error.message}`);
      }
    } catch (error) {
      console.error("Network error during login:", error);
      alert("A network error occurred. Please check if the backend is running.");
    }
  }

  async function handle_google_success(token: string) {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const result = await res.json();

      if (result.success) {
        router.push("/");
      } else {
        alert(`Google authentication failed: ${result.error.message}`);
      }
    } catch (error) {
      console.error("Network error during Google sign-in:", error);
      alert("A network error occurred connecting to the backend.");
    }
  }

  function handle_google_error() {
    alert("Google Sign-In was closed or failed.");
  }

  return (
    <AuthShell>
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