import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Smart Auto-Redirect map for common URL typos and alias shortcuts
const SMART_REDIRECT_ALIASES: Record<string, string> = {
  "/event": "/events",
  "/ticket": "/profile",
  "/tickets": "/profile",
  "/order": "/profile",
  "/signin": "/login",
  "/signup": "/register",
  "/setting": "/profile",
  "/settings": "/profile",
  "/dashboard": "/organizer/dashboard",
  "/checkout": "/events",
  "/seat": "/events",
  "/seats": "/events",
};

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const hasSessionSignal = Boolean(accessToken);

  const { pathname } = request.nextUrl;
  const lowerPath = pathname.toLowerCase().replace(/\/$/, "");

  // 1. Smart Auto-Redirect for common typos & aliases
  if (SMART_REDIRECT_ALIASES[lowerPath]) {
    return NextResponse.redirect(new URL(SMART_REDIRECT_ALIASES[lowerPath], request.url));
  }

  const isProtectedPath =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auditor") ||
    pathname.startsWith("/organizer") ||
    pathname.startsWith("/venue-designer");

  const isAuthPath = pathname === "/login" || pathname === "/register";

  // 2. Unauthenticated users trying to access protected paths -> redirect to login
  if (isProtectedPath && !hasSessionSignal) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Already authenticated users visiting login/register -> redirect away
  if (isAuthPath && hasSessionSignal) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Global edge matcher excluding static assets & API routes
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
