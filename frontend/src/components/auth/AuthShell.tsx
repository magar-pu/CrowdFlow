/**
 * components/auth/AuthShell.tsx
 *
 * Shared wrapper for every auth page (Sign In, Sign Up, Forgot Password):
 * centered brand header (logo + tagline), a white card with Stripe-style
 * shadow, and the decorative corner icon. Matches crowdflow_sign_in /
 * crowdflow_sign_up / crowdflow_forgot_password Stitch markup exactly —
 * all three screens share this exact shell, differing only in card content.
 */

import { Ticket } from "lucide-react";

interface AuthShellProps {
  children: React.ReactNode;
  /** Rendered below the card, e.g. "Don't have an account? Create one" */
  footer?: React.ReactNode;
}

export function AuthShell({ children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-dim">
      <main className="relative z-10 flex flex-grow items-center justify-center px-margin-mobile py-stack-lg md:px-margin-desktop md:py-section-gap">
        <div className="w-full max-w-[480px]">
          {/* Brand header */}
          <div className="mb-stack-lg text-center">
            <div className="mb-2 inline-flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-md">
                <Ticket size={20} className="text-on-primary" />
              </div>
              <span className="font-headline-md text-headline-md font-bold tracking-tight text-primary">
                CrowdFlow
              </span>
            </div>
            <p className="font-label-md text-label-md uppercase tracking-widest text-text-secondary">
              Secure Ticketing. Seamless Events.
            </p>
          </div>

          {/* Auth card */}
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_20px_25px_-5px_rgba(0,0,0,0.05),0_10px_10px_-5px_rgba(0,0,0,0.02)]">
            {children}
          </div>

          {footer && <div className="mt-stack-lg text-center">{footer}</div>}

          {/* Secondary links */}
          <div className="mt-stack-lg flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            <a
              href="/privacy"
              className="font-label-sm text-label-sm text-text-secondary transition-colors hover:text-primary"
            >
              Privacy Policy
            </a>
            <span className="text-border-subtle">•</span>
            <a
              href="/terms"
              className="font-label-sm text-label-sm text-text-secondary transition-colors hover:text-primary"
            >
              Terms of Service
            </a>
            <span className="text-border-subtle">•</span>
            <a
              href="/support"
              className="font-label-sm text-label-sm text-text-secondary transition-colors hover:text-primary"
            >
              Help Center
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}