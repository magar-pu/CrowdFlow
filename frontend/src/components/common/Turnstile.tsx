"use client";

import { useEffect, useRef, useState, memo } from "react";

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: any) => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (error?: any) => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

// Cloudflare Turnstile Site Keys
const PROD_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAEAEX6a9UFtsReh-";
const DEV_SITE_KEY = "1x00000000000000000000AA";

export const Turnstile = memo(function Turnstile({
  onVerify,
  onExpire,
  onError,
  className = "",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Store latest callbacks in refs so changing parent handlers never re-trigger render
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  }, [onVerify, onExpire, onError]);

  useEffect(() => {
    // Check if script is already present
    if (window.turnstile) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.getElementById("cf-turnstile-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;

      script.onload = () => {
        setScriptLoaded(true);
      };

      document.head.appendChild(script);
    } else {
      existingScript.addEventListener("load", () => setScriptLoaded(true));
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return; // Prevent re-rendering if already rendered

    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.startsWith("192.168."));

    const activeSiteKey = isLocalhost ? DEV_SITE_KEY : PROD_SITE_KEY;

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: activeSiteKey,
        callback: (token: string) => {
          onVerifyRef.current(token);
        },
        "expired-callback": () => {
          onExpireRef.current?.();
        },
        "error-callback": (err) => {
          onErrorRef.current?.(err);
        },
        theme: "light",
      });
      widgetIdRef.current = id;
    } catch (err) {
      console.warn("Turnstile render error:", err);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch (e) {}
      }
    };
  }, [scriptLoaded]);

  return (
    <div className={`my-3 flex justify-center ${className}`}>
      <div ref={containerRef} />
    </div>
  );
});

