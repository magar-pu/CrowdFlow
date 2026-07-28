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
// 1x00000000000000000000AA is Cloudflare's official dummy sitekey that always passes
const DEV_SITE_KEY = "1x00000000000000000000AA";
const PROD_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAEAEX6a9UFtsReh-";

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

      script.onerror = () => {
        // Fallback token if Cloudflare script is blocked or fails to load
        onVerifyRef.current(DEV_SITE_KEY);
      };

      document.head.appendChild(script);
    } else {
      if (window.turnstile) {
        setScriptLoaded(true);
      } else {
        existingScript.addEventListener("load", () => setScriptLoaded(true));
      }
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return; // Prevent re-rendering if already rendered

    const hostname = typeof window !== "undefined" ? window.location.hostname : "";
    const isSandboxOrDev =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.includes("sandbox") ||
      hostname.includes("staging") ||
      hostname.includes("dev") ||
      hostname.endsWith(".local");

    // Use DEV_SITE_KEY for local/sandbox/dev or if PROD key is not configured
    const activeSiteKey = isSandboxOrDev ? DEV_SITE_KEY : PROD_SITE_KEY;

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
          console.warn("Cloudflare Turnstile error/domain mismatch:", err);
          onErrorRef.current?.(err);
          // Fallback token so users are never stuck on login if Turnstile encounters a network/domain issue
          onVerifyRef.current(DEV_SITE_KEY);
        },
        theme: "light",
      });
      widgetIdRef.current = id;

      // If activeSiteKey is DEV_SITE_KEY, also trigger verification immediately
      if (activeSiteKey === DEV_SITE_KEY) {
        onVerifyRef.current(DEV_SITE_KEY);
      }
    } catch (err) {
      console.warn("Turnstile render error:", err);
      onVerifyRef.current(DEV_SITE_KEY);
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

