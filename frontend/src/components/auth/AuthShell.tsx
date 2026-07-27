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
import { Navbar } from "@/components/layout/Navbar";
import { FloatingTicketsBackground } from "./FloatingTicketsBackground";

interface AuthShellProps {
  children: React.ReactNode;
  /** Rendered below the card, e.g. "Don't have an account? Create one" */
  footer?: React.ReactNode;
}

export function AuthShell({ children, footer }: AuthShellProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes cardEntrance {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes blobPulse {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
            50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          }
          @keyframes spinSlow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `
      }} />
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-surface-white bg-gradient-to-br from-surface-white via-surface-dim/20 to-surface-bright">
        {/* Animated Background */}
        <FloatingTicketsBackground />

        {/* Top Navbar */}
        <div className="z-50 w-full">
          <Navbar isTransparentOnTop={false} />
        </div>

        {/* Main Content */}
        <main className="relative z-10 flex flex-grow items-center justify-center px-4 pt-24 pb-12">

          <div
            className="relative w-full max-w-[440px]"
            style={{ animation: 'cardEntrance 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' }}
          >
            {/* Glowing Blob Behind Card */}
            <div
              className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface-dim blur-[80px]"
              style={{ animation: 'blobPulse 8s ease-in-out infinite' }}
            />

            {/* The Peeking Ticket */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 rotate-[35deg] z-20 drop-shadow-md transition-transform duration-500 hover:rotate-[15deg] hover:scale-110">
              <Ticket size={48} className="text-primary" fill="currentColor" />
            </div>

            {/* Auth card Wrapper with Clean Static Border */}
            <div className="relative z-10 w-full rounded-[24px] border border-slate-200/80 bg-white/90 backdrop-blur-3xl p-0 shadow-[0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden">
              {children}
            </div>

            {footer && (
              <div
                className="mt-6 text-center"
                style={{ animation: 'cardEntrance 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s forwards', opacity: 0 }}
              >
                {footer}
              </div>
            )}

            {/* Secondary links */}
            <div
              className="mt-8 flex flex-wrap items-center justify-center gap-4 text-center"
              style={{ animation: 'cardEntrance 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s forwards', opacity: 0 }}
            >
              <a href="/privacy" className="font-label-sm text-label-sm text-text-secondary transition-all hover:text-primary hover:underline">
                Privacy Policy
              </a>
              <a href="/terms" className="font-label-sm text-label-sm text-text-secondary transition-all hover:text-primary hover:underline">
                Terms of Service
              </a>
              <a href="/support" className="font-label-sm text-label-sm text-text-secondary transition-all hover:text-primary hover:underline">
                Help Center
              </a>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}