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

/**
 * Custom fetch wrapper that automatically appends the Double-Submit CSRF token,
 * sets JSON Content-Type headers, parses standard response envelopes, and catches network errors.
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
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

    if (!response.ok) {
      console.log("API response not ok:", response.status, response.statusText);
      const text = await response.text();
      console.log("API response body:", text);
      try {
        return JSON.parse(text) as ApiResponse<T>;
      } catch (e) {
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
