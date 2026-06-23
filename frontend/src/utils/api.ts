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
 * Custom fetch wrapper that automatically appends the Double-Submit CSRF token
 * to the headers of any state-changing request (POST, PUT, DELETE, PATCH).
 */
export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const isStateChanging = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

  const headers = new Headers(options.headers || {});

  if (isStateChanging) {
    const csrfToken = getCookie("csrf_token");
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
