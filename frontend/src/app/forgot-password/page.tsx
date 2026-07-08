"use client";

/**
 * app/forgot-password/page.tsx
 *
 * Forgot Password page — AuthShell (brand header + glass card) wrapping
 * ForgotPasswordForm, plus a "Need assistance? Contact Support" line
 * below the card. Matches the crowdflow_forgot_password Stitch screen
 * end-to-end.
 *
 * on_submit currently simulates a network delay before the form swaps to
 * its success state (no redirect — the original screen keeps the user on
 * this page so they can see the confirmation). Once the Go backend
 * exists, replace the setTimeout below with a real
 * POST /api/v1/auth/forgot-password call.
 */

import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  async function handle_submit(email: string) {
    // TODO: replace with `await fetch('/api/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })`
    console.log("Password reset requested for:", email);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return (
    <AuthShell
      footer={
        <p className="font-label-sm text-label-sm text-text-secondary">
          Need assistance?{" "}
          <a href="/support" className="font-bold text-secondary hover:underline">
            Contact Support
          </a>
        </p>
      }
    >
      <ForgotPasswordForm on_submit={handle_submit} />
    </AuthShell>
  );
}