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
    // TODO: replace with `await fetch('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(values) })`
    console.log("Registration attempt:", values);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    router.push("/login");
  }

  return (
    <AuthShell>
      <SignUpForm on_submit={handle_submit} />
      <AuthFooterLink
        prompt="Already have an account?"
        link_label="Sign In"
        href="/login"
      />
    </AuthShell>
  );
}