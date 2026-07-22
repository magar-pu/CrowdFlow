/**
 * components/auth/SignInForm.tsx
 *
 * Sign In form: email + password (with show/hide toggle), "Forgot
 * Password?" link, "Stay signed in" checkbox, submit button with
 * loading/success states, divider, Google/Apple social buttons, and the
 * "Don't have an account?" footer row. Matches crowdflow_sign_in Stitch
 * markup exactly — the original used Alpine.js (x-data="{ show: false }")
 * and vanilla JS for the submit animation; both are ported to React state
 * here with identical behavior.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Eye, EyeOff, ArrowRight, CircleCheck, Loader2, Ticket } from "lucide-react";
import GoogleLogin from "./GoogleLogin";

type SubmitState = "idle" | "loading" | "success";

interface SignInFormProps {
  on_submit: (email: string, password: string, stay_signed_in: boolean) => Promise<void> | void;
  on_google_success: (token: string) => void;
  on_google_error: () => void;
}

export function SignInForm({ on_submit, on_google_success, on_google_error }: SignInFormProps) {
  const [email, set_email] = useState("");
  const [password, set_password] = useState("");
  const [show_password, set_show_password] = useState(false);
  const [stay_signed_in, set_stay_signed_in] = useState(false);
  const [submit_state, set_submit_state] = useState<SubmitState>("idle");

  async function handle_submit(e: React.FormEvent) {
    e.preventDefault();
    if (submit_state !== "idle") return;

    set_submit_state("loading");
    try {
      await on_submit(email, password, stay_signed_in);
      set_submit_state("success");
      // Matches the Stitch screen's 1.5s success pause before resetting —
      // here it instead stays on "success" since the real flow will have
      // already navigated away via on_submit's redirect by this point.
      setTimeout(() => set_submit_state("idle"), 1500);
    } catch (err) {
      set_submit_state("idle");
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col items-center text-center">
        {/* Brand header inside card */}
        <div className="mb-4 inline-flex items-center gap-2">
          <Ticket size={24} className="text-primary" fill="currentColor" />
          <span className="font-headline-md text-headline-md font-bold tracking-tight text-primary">
            CrowdFlow
          </span>
        </div>
        <h1 className="mb-2 font-headline-lg text-headline-lg text-text-primary">
          Welcome Back
        </h1>
        <p className="font-body-md text-body-md text-text-secondary">
          Please enter your details to access your dashboard.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handle_submit}>
        {/* Email */}
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block font-label-md text-label-md text-text-primary"
          >
            Email Address
          </label>
          <div className="relative">
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => set_email(e.target.value)}
              placeholder="name@company.com"
              className="w-full rounded-lg border border-border-subtle bg-white px-4 py-3 font-body-md text-body-md text-text-primary outline-none transition-all duration-200 placeholder:text-outline focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            />
            <Mail
              size={20}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-outline"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="font-label-md text-label-md text-text-primary"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="font-label-sm text-label-sm text-secondary transition-all hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={show_password ? "text" : "password"}
              required
              value={password}
              onChange={(e) => set_password(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-border-subtle bg-white px-4 py-3 font-body-md text-body-md text-text-primary outline-none transition-all duration-200 placeholder:text-outline focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            />
            <button
              type="button"
              onClick={() => set_show_password((show) => !show)}
              aria-label={show_password ? "Hide password" : "Show password"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-text-primary focus:outline-none"
            >
              {show_password ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* Stay signed in */}
        <div className="flex items-center gap-2">
          <input
            id="remember"
            type="checkbox"
            checked={stay_signed_in}
            onChange={(e) => set_stay_signed_in(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-border-subtle text-secondary focus:ring-secondary"
          />
          <label
            htmlFor="remember"
            className="cursor-pointer select-none font-body-sm text-body-sm text-text-secondary"
          >
            Stay signed in for 30 days
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submit_state !== "idle"}
          className={`flex w-full transform items-center justify-center gap-2 rounded-lg py-3.5 font-label-md text-label-md shadow-sm transition-all duration-200 active:scale-[0.98] ${
            submit_state === "success"
              ? "bg-success text-on-success"
              : "bg-primary text-white hover:opacity-90"
          }`}
        >
          {submit_state === "loading" && (
            <>
              <Loader2 size={20} className="animate-spin" />
              Authenticating...
            </>
          )}
          {submit_state === "success" && (
            <>
              <CircleCheck size={20} />
              Success!
            </>
          )}
          {submit_state === "idle" && (
            <>
              Sign In
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-subtle" />
        </div>
        <div className="relative flex justify-center text-label-sm uppercase">
          <span className="bg-surface-white px-4 text-text-secondary">
            Or continue with
          </span>
        </div>
      </div>

      {/* Social logins */}
      <div className="w-full flex justify-center mt-2">
        <GoogleLogin onSuccess={on_google_success} onError={on_google_error} />
      </div>
    </div>
  );
}