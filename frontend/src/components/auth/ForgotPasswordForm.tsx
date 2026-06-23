/**
 * components/auth/ForgotPasswordForm.tsx
 *
 * Reset Password form: a single email field, submit button with a
 * loading state, and a swap to a success message once submitted —
 * matching the crowdflow_forgot_password Stitch screen's original
 * vanilla JS (#reset-form gets hidden, #success-message gets shown)
 * ported to React conditional rendering. The lock icon, decorative pulse
 * dot, and "Back to Login" link are all part of this component since
 * they're specific to this screen's card content (AuthShell only
 * supplies the outer brand header + card chrome).
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { LockKeyhole, Mail, CircleCheck, Loader2, ArrowLeft } from "lucide-react";

type SubmitState = "idle" | "loading" | "sent";

interface ForgotPasswordFormProps {
  on_submit: (email: string) => Promise<void> | void;
}

export function ForgotPasswordForm({ on_submit }: ForgotPasswordFormProps) {
  const [email, set_email] = useState("");
  const [submit_state, set_submit_state] = useState<SubmitState>("idle");

  async function handle_submit(e: React.FormEvent) {
    e.preventDefault();
    if (submit_state !== "idle") return;

    set_submit_state("loading");
    await on_submit(email);
    set_submit_state("sent");
  }

  return (
    <section className="flex flex-col items-center p-8 text-center md:p-10">
      {/* Icon */}
      <div className="relative mb-stack-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <LockKeyhole size={32} />
        </div>
        <div className="absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-full bg-secondary" />
      </div>

      {submit_state !== "sent" ? (
        <>
          <div className="mb-stack-lg space-y-stack-sm">
            <h2 className="font-headline-lg text-headline-lg text-text-primary">
              Reset Password
            </h2>
            <p className="mx-auto max-w-[280px] font-body-md text-body-md text-text-secondary">
              Enter your email address and we&apos;ll send a reset link.
            </p>
          </div>

          <form className="w-full space-y-6" onSubmit={handle_submit}>
            <div className="group text-left">
              <label
                htmlFor="email"
                className="mb-2 block font-label-md text-label-md text-text-primary transition-colors group-focus-within:text-secondary"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => set_email(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-lg border border-border-subtle bg-surface-white px-4 py-3 font-body-md text-body-md placeholder:text-outline transition-all focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-outline transition-colors group-focus-within:text-secondary">
                  <Mail size={20} />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submit_state === "loading"}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 font-label-md text-label-md font-bold tracking-wide text-on-primary shadow-md transition-all duration-200 hover:bg-secondary hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submit_state === "loading" ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>
        </>
      ) : (
        <div className="flex w-full flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CircleCheck size={28} />
          </div>
          <p className="mb-6 font-body-md text-body-md text-text-primary">
            Reset link sent! Please check your inbox for instructions.
          </p>
        </div>
      )}

      {/* Back to login */}
      <div className="mt-8 w-full border-t border-border-subtle pt-8">
        <Link
          href="/login"
          className="group inline-flex items-center gap-2 font-label-md text-label-md text-text-secondary transition-colors hover:text-primary"
        >
          <ArrowLeft
            size={18}
            className="transition-transform group-hover:-translate-x-1"
          />
          Back to Login
        </Link>
      </div>
    </section>
  );
}