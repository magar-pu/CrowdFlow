"use client";

import Image from "next/image";
import Link from "next/link";
import { Send, Pencil, Shield, Lock } from "lucide-react"; // Using lucide-react for icons instead of material-symbols

export default function VerifyEmailPage() {
  return (
    <div className="bg-background text-text-primary min-h-screen flex flex-col">
      {/* Top Navigation Anchor (Minimal for Auth) */}
      <header className="bg-surface-white w-full py-4 px-margin-desktop shadow-sm fixed top-0 z-50">
        <div className="max-w-container-max mx-auto flex justify-between items-center">
          <Link href="/" className="font-headline-md text-headline-md font-bold text-primary hover:opacity-80 transition-opacity">
            CrowdFlow
          </Link>
          <div className="flex gap-stack-md items-center">
            <span className="font-label-md text-label-md text-text-secondary cursor-pointer hover:text-primary transition-colors">
              Support
            </span>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-margin-mobile">
        {/* Main Auth Container */}
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="glass-card rounded-xl p-8 md:p-10 shadow-xl border border-border-subtle relative overflow-hidden">
            {/* Subtle Shimmer Effect on Card */}
            <div className="absolute inset-0 shimmer opacity-5 pointer-events-none"></div>

            {/* Illustration Container */}
            <div className="mb-8 flex justify-center">
              <div className="relative w-48 h-48 flex items-center justify-center rounded-full bg-primary-fixed bg-opacity-30 group transition-transform duration-500 hover:scale-105">
                {/* Background pulse for the illustration */}
                <div className="absolute inset-0 rounded-full border-2 border-primary opacity-5 animate-ping"></div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-40 h-40 object-contain drop-shadow-2xl"
                  alt="A premium digital illustration of an envelope"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCApHR4ejYV5BwtHWfcz7PFlij7h0bYfqueimwByailhqRy12TIDTNoTUUA4QzTf0HF2-4jPK7jbRmDBrpCqMwnkUDhfxzLKSZz5F-EqS382CCasdrxdpfp5oau3AUsMLm5IfzZHg2ukmOYwqPSxtVA1Od7E4ljhTo0PMxlVU5MSakS3F2ZpLoIWYXoCoMZN_me5mRGiUF_YBXhB3Q_jdkG2KniOXCrhcbyZ7ZL8I1dE_v2K2NJMWv4LuPLySFrVoXv1EMMNEWf0EsS"
                />
              </div>
            </div>

            {/* Text Content */}
            <div className="text-center mb-10">
              <h1 className="font-headline-lg text-headline-lg text-primary mb-3">
                Verify Your Email
              </h1>
              <p className="font-body-md text-body-md text-text-secondary px-4">
                We've sent a verification link to your email address. Please
                click the link to confirm your account and access the dashboard.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <button className="w-full bg-primary text-on-primary py-4 rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-opacity-90 active:scale-[0.98] transition-all shadow-md group">
                <Send size={18} className="group-hover:rotate-12 transition-transform" />
                Resend Email
              </button>
              <button className="w-full border border-border-subtle text-secondary py-4 rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-surface-container-low active:scale-[0.98] transition-all">
                <Pencil size={18} />
                Change Email
              </button>
            </div>

            {/* Assistance Text */}
            <div className="mt-8 text-center">
              <p className="font-label-sm text-label-sm text-text-secondary">
                Didn't receive the email? Check your spam folder or{" "}
                <Link
                  href="/support"
                  className="text-secondary font-semibold hover:underline"
                >
                  contact support
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Security Trust Badges */}
          <div className="mt-8 flex justify-center gap-8 opacity-40 grayscale hover:grayscale-0 hover:opacity-80 transition-all duration-300">
            <div className="flex items-center gap-2">
              <Shield size={16} />
              <span className="font-label-sm text-label-sm">Secure Transfer</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock size={16} />
              <span className="font-label-sm text-label-sm">256-bit AES</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Anchor */}
      <footer className="w-full py-8 px-margin-desktop bg-surface-container-lowest border-t border-border-subtle flex flex-col md:flex-row justify-between items-center gap-stack-md">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-headline-sm text-headline-sm font-black text-primary">
            CrowdFlow
          </span>
          <p className="font-label-sm text-label-sm text-text-secondary">
            © 2024 CrowdFlow Enterprise. All rights reserved.
          </p>
        </div>
        <div className="flex gap-6">
          <Link
            href="/privacy"
            className="font-label-sm text-label-sm text-text-secondary hover:text-primary transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="font-label-sm text-label-sm text-text-secondary hover:text-primary transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            href="/security"
            className="font-label-sm text-label-sm text-text-secondary hover:text-primary transition-colors"
          >
            Security Compliance
          </Link>
        </div>
      </footer>
    </div>
  );
}
