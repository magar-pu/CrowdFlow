import { ApiResponse } from "../types";

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

  // 3. Prefix relative URLs with API URL in browser context if needed,
  // but since Nginx handles /api/ or Next.js rewrites it, we can call /api/v1 directly.
  const apiURL = process.env.NEXT_PUBLIC_API_URL || "";
  const requestUrl = url.startsWith("/") ? `${apiURL}${url}` : url;

  try {
    const response = await fetch(requestUrl, {
      ...options,
      headers,
    });

    const result: ApiResponse<T> = await response.json();
    return result;
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Cannot connect to server. Please check your network connection.",
      },
    };
  }
}
