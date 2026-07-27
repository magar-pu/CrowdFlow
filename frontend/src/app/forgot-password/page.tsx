"use client";

/**
 * app/forgot-password/page.tsx
 *
 * Dual-mode page:
 * 1. No token param → show "Enter Email" form (request reset link)
 * 2. With ?token=&email= → show "Set New Password" form (complete reset)
 */

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import {
  LockKeyhole,
  Eye,
  EyeOff,
  Loader2,
  CircleCheck,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

type ResetState = "idle" | "loading" | "success" | "error";

function ResetPasswordForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const router = useRouter();
  const [new_password, set_new_password] = useState("");
  const [confirm_password, set_confirm_password] = useState("");
  const [show_password, set_show_password] = useState(false);
  const [reset_state, set_reset_state] = useState<ResetState>("idle");
  const [error_msg, set_error_msg] = useState("");

  async function handle_reset(e: React.FormEvent) {
    e.preventDefault();
    if (reset_state === "loading") return;

    if (new_password.length < 8) {
      set_error_msg("Password must be at least 8 characters.");
      return;
    }
    if (new_password !== confirm_password) {
      set_error_msg("Passwords do not match.");
      return;
    }

    set_error_msg("");
    set_reset_state("loading");

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, new_password }),
      });

      const result = await res.json();

      if (result.success) {
        set_reset_state("success");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        set_error_msg(
          result.error?.message || "Failed to reset password. The link may have expired."
        );
        set_reset_state("error");
      }
    } catch {
      set_error_msg("Cannot connect to server. Please try again.");
      set_reset_state("error");
    }
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

      {reset_state === "success" ? (
        <div className="flex w-full flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CircleCheck size={28} />
          </div>
          <h2 className="mb-2 font-headline-lg text-headline-lg text-text-primary">
            Password Reset!
          </h2>
          <p className="mb-6 font-body-md text-body-md text-text-secondary">
            Your password has been successfully updated. Redirecting to
            login...
          </p>
        </div>
      ) : (
        <>
          <div className="mb-stack-lg space-y-stack-sm">
            <h2 className="font-headline-lg text-headline-lg text-text-primary">
              Set New Password
            </h2>
            <p className="mx-auto max-w-[300px] font-body-md text-body-md text-text-secondary">
              Enter your new password for{" "}
              <span className="font-semibold text-text-primary">{email}</span>
            </p>
          </div>

          {error_msg && (
            <div className="mb-4 w-full rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 font-body-sm text-body-sm text-danger">
              {error_msg}
            </div>
          )}

          <form className="w-full space-y-5" onSubmit={handle_reset}>
            {/* New Password */}
            <div className="group text-left">
              <label
                htmlFor="new_password"
                className="mb-2 block font-label-md text-label-md text-text-primary transition-colors group-focus-within:text-secondary"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="new_password"
                  type={show_password ? "text" : "password"}
                  required
                  minLength={8}
                  value={new_password}
                  onChange={(e) => set_new_password(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-lg border border-border-subtle bg-surface-white px-4 py-3 font-body-md text-body-md placeholder:text-outline transition-all focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
                <button
                  type="button"
                  onClick={() => set_show_password((s) => !s)}
                  aria-label={show_password ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-text-primary focus:outline-none"
                >
                  {show_password ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="group text-left">
              <label
                htmlFor="confirm_password"
                className="mb-2 block font-label-md text-label-md text-text-primary transition-colors group-focus-within:text-secondary"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm_password"
                  type={show_password ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirm_password}
                  onChange={(e) => set_confirm_password(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full rounded-lg border border-border-subtle bg-surface-white px-4 py-3 font-body-md text-body-md placeholder:text-outline transition-all focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={reset_state === "loading"}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 font-label-md text-label-md font-bold tracking-wide text-on-primary shadow-md transition-all duration-200 hover:bg-secondary hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {reset_state === "loading" ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        </>
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

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const hasResetToken = token && email;

  async function handle_submit(emailInput: string) {
    try {
      await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });
    } catch (err) {
      console.error("Failed to request password reset:", err);
    }
  }

  return (
    <AuthShell
      footer={
        <p className="font-label-sm text-label-sm text-text-secondary">
          Need assistance?{" "}
          <a
            href="/support"
            className="font-bold text-secondary hover:underline"
          >
            Contact Support
          </a>
        </p>
      }
    >
      {hasResetToken ? (
        <ResetPasswordForm token={token} email={email} />
      ) : (
        <ForgotPasswordForm on_submit={handle_submit} />
      )}
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordContent />
    </Suspense>
  );
}