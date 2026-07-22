import { ApiResponse } from "../types/api";

/**
 * Utility function to get a cookie value by name on the client side.
 */
export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
  return undefined;
}

// Endpoints where a 401 must NOT trigger a silent refresh: bad credentials on
// login/register, and the refresh call itself (avoids infinite recursion).
function isAuthBootstrap(url: string): boolean {
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/refresh")
  );
}

// A single in-flight refresh shared across all callers, so a burst of parallel
// 401s triggers exactly one POST /auth/refresh instead of a refresh storm.
let inflightRefresh: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (inflightRefresh) {
    return inflightRefresh;
  }

  inflightRefresh = (async () => {
    try {
      const headers = new Headers();
      // Refresh is a state-changing POST, so it needs the double-submit CSRF
      // token. The csrf cookie outlives the access token by design.
      const csrfToken = getCookie("csrf_token");
      if (csrfToken) {
        headers.set("X-CSRF-Token", csrfToken);
      }
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers,
      });
      return res.ok;
    } catch {
      return false;
    }
  })();

  // Clear the shared handle once it settles so the next 401 can refresh again.
  inflightRefresh.finally(() => {
    inflightRefresh = null;
  });

  return inflightRefresh;
}

/**
 * Custom fetch wrapper that automatically appends the Double-Submit CSRF token,
 * sets JSON Content-Type headers, parses standard response envelopes, and catches network errors.
 *
 * On a 401 it attempts one silent token refresh (serialized across callers) and
 * replays the original request once. If the refresh fails, the original 401 is
 * returned and route guards (AuthGuard / edge middleware) handle redirection.
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  isRetry = false
): Promise<ApiResponse<T>> {
  const method = (options.method || "GET").toUpperCase();
  const isStateChanging = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

  const headers = new Headers(options.headers || {});

  // 1. Auto-inject Content-Type if writing JSON data
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // 2. Auto-inject CSRF double-submit token for state changes
  if (isStateChanging) {
    const csrfToken = getCookie("csrf_token");
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 3. Silent refresh: on a 401 from a normal call, rotate the access token
    //    once via the refresh cookie, then replay the original request.
    if (response.status === 401 && !isRetry && !isAuthBootstrap(url)) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return apiRequest<T>(url, options, true);
      }
      // Refresh failed: fall through and return the 401 body so callers/guards
      // (AuthGuard, edge middleware) can react.
    }

    if (!response.ok) {
      const text = await response.text();
      try {
        return JSON.parse(text) as ApiResponse<T>;
      } catch {
        return {
          success: false,
          error: {
            code: "SERVER_ERROR",
            message: "Invalid JSON from server: " + text.substring(0, 50),
          },
        } as ApiResponse<T>;
      }
    }

    const result: ApiResponse<T> = await response.json();
    return result;
  } catch (err: unknown) {
    console.error("API Request threw an error:", err);
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Cannot connect to server. Please check your network connection.",
      },
    };
  }
}
