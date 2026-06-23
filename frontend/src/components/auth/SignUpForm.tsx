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
import GoogleLogin from "./GoogleLogin";

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
  on_google_success: (token: string) => void;
  on_google_error: () => void;
}

export function SignUpForm({ on_submit, on_google_success, on_google_error }: SignUpFormProps) {
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

      {/* Social logins */}
      <div className="w-full flex justify-center mt-2">
        <GoogleLogin onSuccess={on_google_success} onError={on_google_error} />
      </div>
    </div>
  );
}