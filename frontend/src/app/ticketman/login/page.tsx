"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, KeyRound, ShieldAlert, ArrowRight, RefreshCw } from "lucide-react";
import { Turnstile } from "@/components/common/Turnstile";
import { loginTicketman } from "@/lib/api/ticketman";
import { useTicketmanStore } from "@/lib/store/ticketmanStore";

export default function TicketmanLoginPage() {
  const router = useRouter();
  const setSession = useTicketmanStore((s) => s.set_session);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !eventCode.trim()) return;
    if (!turnstileToken) {
      setError("Please complete the verification challenge.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await loginTicketman({
        email: email.trim(),
        password,
        eventCode: eventCode.trim().toUpperCase(),
        turnstileToken,
      });
      if (res.success && res.data) {
        setSession(res.data);
        router.replace("/ticketman/dashboard");
      } else {
        setError(res.error?.message || "Invalid email, password, or event code.");
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-surface-container-low font-sans text-text-primary">
      <div className="w-full max-w-sm bg-white border border-border-subtle rounded-3xl p-6 shadow-xl text-left space-y-5 animate-scale-in">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
          <Lock className="w-7 h-7" />
        </div>

        <div className="text-center space-y-1">
          <span className="text-[10px] font-mono font-bold text-primary tracking-widest uppercase">Ticketman Portal</span>
          <h2 className="text-lg font-bold text-text-primary tracking-tight">Gate Staff Sign In</h2>
          <p className="text-xs text-text-secondary leading-relaxed max-w-[260px] mx-auto">
            Sign in with the credentials issued by your event organizer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Email</label>
            <div className="relative">
              <Mail className="absolute top-3 left-3 w-4 h-4 text-on-surface-variant" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="username"
                className="w-full h-10 pl-9 pr-3 border border-border-subtle rounded-xl text-xs bg-white text-text-primary outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute top-3 left-3 w-4 h-4 text-on-surface-variant" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full h-10 pl-9 pr-3 border border-border-subtle rounded-xl text-xs bg-white text-text-primary outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Event Code</label>
            <div className="relative">
              <KeyRound className="absolute top-3 left-3 w-4 h-4 text-on-surface-variant" />
              <input
                type="text"
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value)}
                placeholder="e.g. CF-EVT-2026"
                className="w-full h-10 pl-9 pr-3 border border-border-subtle rounded-xl text-xs bg-white text-text-primary font-mono outline-none focus:border-primary transition-all uppercase"
              />
            </div>
          </div>

          <Turnstile onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-[11px] font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !email.trim() || !password.trim() || !eventCode.trim()}
            className="w-full h-10 bg-primary hover:bg-primary/95 disabled:bg-surface-container disabled:text-on-surface-variant text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
