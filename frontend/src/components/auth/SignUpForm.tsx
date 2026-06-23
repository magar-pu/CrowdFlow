/**
 * components/auth/SignUpForm.tsx
 *
 * Registration form: Full Name, Email, Phone (country code + number),
 * Password (with live strength meter + show/hide), Confirm Password,
 * Terms & Conditions checkbox, submit button with loading/success
 * states, divider, and Google/Apple social buttons. Matches
 * crowdflow_sign_up Stitch markup exactly — the original used vanilla JS
 * for password strength + the submit animation; both are ported to React
 * state here with identical behavior.
 *
 * One addition beyond the original Stitch markup: client-side validation
 * that confirm_password matches password before allowing submit. The
 * original screen had a Confirm Password field with no matching check at
 * all, which would let mistyped passwords through silently.
 */

"use client";

import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  CircleCheck,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

type SubmitState = "idle" | "loading" | "success";

const COUNTRY_CODES = [
  { value: "+62", label: "🇮🇩 +62" },
  { value: "+1", label: "🇺🇸 +1" },
  { value: "+44", label: "🇬🇧 +44" },
  { value: "+65", label: "🇸🇬 +65" },
  { value: "+91", label: "🇮🇳 +91" },
];

export interface SignUpFormValues {
  full_name: string;
  email: string;
  country_code: string;
  phone_number: string;
  password: string;
}

interface SignUpFormProps {
  on_submit: (values: SignUpFormValues) => Promise<void> | void;
}

export function SignUpForm({ on_submit }: SignUpFormProps) {
  const [full_name, set_full_name] = useState("");
  const [email, set_email] = useState("");
  const [country_code, set_country_code] = useState("+62");
  const [phone_number, set_phone_number] = useState("");
  const [password, set_password] = useState("");
  const [confirm_password, set_confirm_password] = useState("");
  const [show_password, set_show_password] = useState(false);
  const [agreed_to_terms, set_agreed_to_terms] = useState(false);
  const [submit_state, set_submit_state] = useState<SubmitState>("idle");
  const [confirm_error, set_confirm_error] = useState("");

  async function handle_submit(e: React.FormEvent) {
    e.preventDefault();
    if (submit_state !== "idle") return;

    if (password !== confirm_password) {
      set_confirm_error("Passwords don't match.");
      return;
    }
    set_confirm_error("");

    set_submit_state("loading");
    await on_submit({ full_name, email, country_code, phone_number, password });
    set_submit_state("success");

    setTimeout(() => set_submit_state("idle"), 1500);
  }

  return (
    <div className="p-8 md:p-10">
      <form className="space-y-6" onSubmit={handle_submit}>
        {/* Full Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="fullName"
            className="block font-label-md text-label-md text-text-primary"
          >
            Full Name
          </label>
          <div className="relative">
            <User
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              id="fullName"
              type="text"
              required
              value={full_name}
              onChange={(e) => set_full_name(e.target.value)}
              placeholder="Enter your full name"
              className="w-full rounded-lg border border-border-subtle bg-white py-3 pl-10 pr-4 text-body-md outline-none transition-[border-color,box-shadow] duration-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block font-label-md text-label-md text-text-primary"
          >
            Email Address
          </label>
          <div className="relative">
            <Mail
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => set_email(e.target.value)}
              placeholder="name@company.com"
              className="w-full rounded-lg border border-border-subtle bg-white py-3 pl-10 pr-4 text-body-md outline-none transition-[border-color,box-shadow] duration-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label
            htmlFor="phone"
            className="block font-label-md text-label-md text-text-primary"
          >
            Phone Number
          </label>
          <div className="flex gap-2">
            <div className="relative w-28 shrink-0">
              <select
                id="countryCode"
                value={country_code}
                onChange={(e) => set_country_code(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border-subtle bg-white px-3 py-3 text-body-md outline-none transition-[border-color,box-shadow] duration-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10"
              >
                {COUNTRY_CODES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary"
              />
            </div>
            <div className="relative flex-grow">
              <Phone
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                id="phone"
                type="tel"
                required
                value={phone_number}
                onChange={(e) => set_phone_number(e.target.value)}
                placeholder="Mobile number"
                className="w-full rounded-lg border border-border-subtle bg-white py-3 pl-10 pr-4 text-body-md outline-none transition-[border-color,box-shadow] duration-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10"
              />
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block font-label-md text-label-md text-text-primary"
          >
            Password
          </label>
          <div className="relative">
            <Lock
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              id="password"
              type={show_password ? "text" : "password"}
              required
              value={password}
              onChange={(e) => set_password(e.target.value)}
              placeholder="Create a strong password"
              className="w-full rounded-lg border border-border-subtle bg-white py-3 pl-10 pr-10 text-body-md outline-none transition-[border-color,box-shadow] duration-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10"
            />
            <button
              type="button"
              onClick={() => set_show_password((show) => !show)}
              aria-label={show_password ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
            >
              {show_password ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <PasswordStrengthMeter password={password} />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="block font-label-md text-label-md text-text-primary"
          >
            Confirm Password
          </label>
          <div className="relative">
            <ShieldCheck
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              id="confirmPassword"
              type={show_password ? "text" : "password"}
              required
              value={confirm_password}
              onChange={(e) => {
                set_confirm_password(e.target.value);
                if (confirm_error) set_confirm_error("");
              }}
              placeholder="Repeat your password"
              className={`w-full rounded-lg border bg-white py-3 pl-10 pr-4 text-body-md outline-none transition-[border-color,box-shadow] duration-200 focus:ring-2 ${
                confirm_error
                  ? "border-danger focus:border-danger focus:ring-danger/10"
                  : "border-border-subtle focus:border-secondary focus:ring-secondary/10"
              }`}
            />
          </div>
          {confirm_error && (
            <p className="font-label-sm text-label-sm text-danger">
              {confirm_error}
            </p>
          )}
        </div>

        {/* Terms */}
        <div className="flex items-start gap-3">
          <div className="flex h-5 items-center">
            <input
              id="terms"
              type="checkbox"
              required
              checked={agreed_to_terms}
              onChange={(e) => set_agreed_to_terms(e.target.checked)}
              className="h-4 w-4 rounded border-border-subtle text-secondary focus:ring-secondary"
            />
          </div>
          <label htmlFor="terms" className="font-body-sm text-body-sm text-text-secondary">
            I agree to the{" "}
            <a href="/terms" className="font-medium text-secondary hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="font-medium text-secondary hover:underline">
              Privacy Policy
            </a>
            .
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submit_state !== "idle" || !agreed_to_terms}
          className={`flex w-full items-center justify-center gap-2 rounded-lg py-4 font-label-md text-label-md shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
            submit_state === "success"
              ? "bg-success text-on-success"
              : "bg-primary text-on-primary hover:opacity-90"
          }`}
        >
          {submit_state === "loading" && (
            <>
              <Loader2 size={20} className="animate-spin" />
              Creating account...
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
              Create Account
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-subtle" />
        </div>
        <div className="relative flex justify-center text-label-sm">
          <span className="bg-surface-white px-4 font-label-sm text-text-secondary">
            Or sign up with
          </span>
        </div>
      </div>

      {/* Social */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          className="flex items-center justify-center gap-3 rounded-lg border border-border-subtle py-3 transition-colors hover:bg-surface active:scale-[0.98]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span className="font-label-md text-label-md text-text-primary">
            Google
          </span>
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-3 rounded-lg border border-border-subtle py-3 transition-colors hover:bg-surface active:scale-[0.98]"
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