"use client";

/**
 * app/register/page.tsx
 *
 * Sign Up page — brand header + registration card (SignUpForm) +
 * "Already have an account?" link. Matches the crowdflow_sign_up Stitch
 * screen, including its deliberate nav suppression ("Shell Suppression:
 * this is a focused transactional page") — no Navbar here, just the
 * AuthShell's minimal brand header.
 *
 * on_submit currently simulates a network delay then redirects to /login
 * (the original Stitch screen showed an alert "verify your email" — we
 * route to login instead since there's no real email step yet). Once the
 * Go backend exists, replace the setTimeout below with a real
 * POST /api/v1/auth/register call.
 */

import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm, type SignUpFormValues } from "@/components/auth/SignUpForm";
import { AuthFooterLink } from "@/components/auth/AuthFooterLink";

export default function SignUpPage() {
  const router = useRouter();

  async function handle_submit(values: SignUpFormValues) {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          full_name: values.full_name,
        }),
      });

      const result = await res.json();

      if (result.success) {
        router.push("/login");
      } else {
        alert(`Registration failed: ${result.error.message}`);
      }
    } catch (error) {
      console.error("Network error during registration:", error);
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
      <SignUpForm 
        on_submit={handle_submit} 
        on_google_success={handle_google_success}
        on_google_error={handle_google_error}
      />
      <AuthFooterLink
        prompt="Already have an account?"
        link_label="Sign In"
        href="/login"
      />
    </AuthShell>
  );
}