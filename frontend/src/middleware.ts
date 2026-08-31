import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Smart Auto-Redirect map for common URL typos and alias shortcuts
const SMART_REDIRECT_ALIASES: Record<string, string> = {
  "/event": "/events",
  "/resale": "/",
  "/resale-marketplace": "/",
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
  // TWO cookies on purpose — do not "simplify" this to access_token alone.
  //
  // access_token lives ~15m (ACCESS_TOKEN_TTL), so the browser drops it after a
  // short idle and the edge would then bounce a perfectly valid session to
  // /login on the next navigation. csrf_token is the durable signal: Path=/,
  // MaxAge tied to the 30-day refresh token, and non-HttpOnly so middleware can
  // actually read it. The server expires it through clearAuthCookies on logout
  // and on any failed refresh, so it goes stale exactly when the session does.
  //
  // 4dbff21 introduced this pairing; 3f53c65 (an unrelated UI-routing change)
  // silently dropped the csrf_token half and reintroduced the 15-minute
  // phantom logout. API calls hid it, because utils/api.ts silently refreshes
  // on 401 — only navigation broke, which is why it read as random.
  //
  // This check is a HINT, not authorization. A lingering cookie over a dead
  // server session just means AuthGuard's getMe() 401s and redirects a beat
  // later; the real checks live in the Go middleware.
  const accessToken = request.cookies.get("access_token")?.value;
  const csrfToken = request.cookies.get("csrf_token")?.value;
  const hasSessionSignal = Boolean(accessToken || csrfToken);

  const { pathname } = request.nextUrl;
  const lowerPath = pathname.toLowerCase().replace(/\/$/, "");

  // 1. Resale feature hidden per product decision -> redirect to homepage
  if (pathname.startsWith("/resale")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. The buyer wallet existed only to settle resale payouts, so it went with
  // resale. Bank accounts (organizer payout destinations) live on /profile.
  if (pathname.startsWith("/profile/payments")) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  // 3. Smart Auto-Redirect for common typos & aliases
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
