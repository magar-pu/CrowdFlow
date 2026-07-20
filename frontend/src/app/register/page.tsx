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

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm, type SignUpFormValues } from "@/components/auth/SignUpForm";
import { AuthFooterLink } from "@/components/auth/AuthFooterLink";
import { registerUser } from "@/lib/api/auth";

export default function SignUpPage() {
  const router = useRouter();
  const [error_message, set_error_message] = useState("");

  async function handle_submit(values: SignUpFormValues) {
    set_error_message("");
    const result = await registerUser({
      email: values.email,
      password: values.password,
      full_name: values.full_name,
    });

    if (result.success) {
      router.push("/login?registered=true");
    } else {
      set_error_message(result.error?.message ?? "Registration failed.");
    }
  }

  async function handle_google_success(token: string) {
    set_error_message("");
    try {
      const res = await fetch("/api/v1/auth/google", {
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
        set_error_message(result.error?.message ?? "Google Sign-In failed.");
      }
    } catch (error) {
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