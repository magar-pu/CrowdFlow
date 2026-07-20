import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  const { pathname } = request.nextUrl;

  // 1. Define path groupings
  const isProtectedPath =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auditor") ||
    pathname.startsWith("/organizer");

  const isAuthPath = pathname === "/login" || pathname === "/register";

  // 2. If user is unauthenticated and tries to access private routes, redirect to login
  if (isProtectedPath && !token) {
    const loginUrl = new URL("/login", request.url);
    // Persist original destination to redirect back after login if desired
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. If user is already authenticated and visits login/register, redirect to home
  if (isAuthPath && token) {
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
    "/login",
    "/register",
  ],
};
