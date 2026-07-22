import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Best-effort "is there a session?" signal for routing.
  // The access_token cookie lasts ~15m, while csrf_token and refresh_token
  // (scoped to /api/v1/auth) represent durable active sessions.
  const accessToken = request.cookies.get("access_token")?.value;
  const csrfToken = request.cookies.get("csrf_token")?.value;
  const hasSessionSignal = Boolean(accessToken || csrfToken);

  const { pathname } = request.nextUrl;

  const isProtectedPath =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auditor") ||
    pathname.startsWith("/organizer") ||
    pathname.startsWith("/venue-designer");

  const isAuthPath = pathname === "/login" || pathname === "/register";

  // 1. If user is unauthenticated (no access/csrf token signal at all) and tries to access private routes
  if (isProtectedPath && !hasSessionSignal) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If user is already authenticated and visits login/register, redirect to home/dashboard
  if (isAuthPath && hasSessionSignal) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Limit the middleware to run only on relevant routes to maintain high edge performance
export const config = {
  matcher: [
    "/profile/:path*",
    "/orders/:path*",
    "/checkout/:path*",
    "/admin/:path*",
    "/auditor/:path*",
    "/organizer/:path*",
    "/venue-designer/:path*",
    "/login",
    "/register",
  ],
};
