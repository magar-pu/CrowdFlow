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
import { Mail, Eye, EyeOff, ArrowRight, CircleCheck, Loader2 } from "lucide-react";

type SubmitState = "idle" | "loading" | "success";

interface SignInFormProps {
  on_submit: (email: string, password: string, stay_signed_in: boolean) => Promise<void> | void;
}

export function SignInForm({ on_submit }: SignInFormProps) {
  const [email, set_email] = useState("");
  const [password, set_password] = useState("");
  const [show_password, set_show_password] = useState(false);
  const [stay_signed_in, set_stay_signed_in] = useState(false);
  const [submit_state, set_submit_state] = useState<SubmitState>("idle");

  async function handle_submit(e: React.FormEvent) {
    e.preventDefault();
    if (submit_state !== "idle") return;

    set_submit_state("loading");
    await on_submit(email, password, stay_signed_in);
    set_submit_state("success");

    // Matches the Stitch screen's 1.5s success pause before resetting —
    // here it instead stays on "success" since the real flow will have
    // already navigated away via on_submit's redirect by this point.
    setTimeout(() => set_submit_state("idle"), 1500);
  }

  return (
    <div className="p-8 md:p-10">
      <div className="mb-8">
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
              : "bg-primary text-on-primary hover:bg-on-surface-variant"
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
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          className="flex items-center justify-center gap-3 rounded-lg border border-border-subtle px-4 py-3 transition-colors duration-200 hover:bg-surface-container-low"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
            />
            <path
              fill="#FF3D00"
              d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
            />
            <path
              fill="#1976D2"
              d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
            />
          </svg>
          <span className="font-label-md text-label-md text-text-primary">
            Google
          </span>
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-3 rounded-lg border border-border-subtle px-4 py-3 transition-colors duration-200 hover:bg-surface-container-low"
        >
          <svg width="18" height="20" viewBox="0 0 814 1000" aria-hidden="true">
            <path
              fill="#000000"
              d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-163.9-39.5c-76.7 0-103.9 40.8-166.2 40.8s-105.5-57-150.4-126.4C46.5 769.5 0 627.6 0 493.4c0-216.6 140.8-331.6 279.2-331.6 65.9 0 130.5 41.3 175.9 41.3 44.1 0 113.7-44.1 195.2-44.1 31.6 0 145.5 2.8 207.2 122.3-2.7 1.6-86.6 51.1-86.6 144.6zM561.5 220.8c44-52.4 76-126.4 76-208.4 0-12.6-1-25.4-3.3-35.6-71.4 2.6-156.5 47.6-208.4 109.4-39.2 47.4-79.5 121.4-79.5 197.4 0 13.4 2 26.8 3.3 31.5 5.5 1.2 14.3 2.6 23.1 2.6 64.1 0 145.1-43.4 188.8-96.9z"
            />
          </svg>
          <span className="font-label-md text-label-md text-text-primary">
            Apple
          </span>
        </button>
      </div>
    </div>
  );
}