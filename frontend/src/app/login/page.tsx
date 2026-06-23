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
    // TODO: replace with `await fetch('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password, stay_signed_in }) })`
    console.log("Sign in attempt:", { email, stay_signed_in });
    await new Promise((resolve) => setTimeout(resolve, 1200));
    router.push("/");
  }

  return (
    <AuthShell>
      <SignInForm on_submit={handle_submit} />
      <AuthFooterLink
        prompt="Don't have an account?"
        link_label="Create an account"
        href="/register"
      />
    </AuthShell>
  );
}