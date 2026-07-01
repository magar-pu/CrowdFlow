# Authentication, Routing, and Security Patterns

Future agents working on this codebase must adhere to the following authentication and routing design rules established in this session:

## 1. Google OAuth 2.0 Flow (Backend Redirect)
* All authentication flows must route through the Go backend.
* For Google OAuth, the frontend must redirect the browser to the backend (`/api/auth/google/login`), which handles the redirect to Google.
* The Google OAuth callback (`/api/auth/google/callback`) is processed on the backend. After exchanging credentials and setting HttpOnly secure cookies, the backend performs role-based redirects.

## 2. Role-Based Dynamic Redirects
* When a user logs in (either via native credentials or Google OAuth):
  * **Organizers and Admins** (`"Event Organizer"`, `"Super Admin"`) must be dynamically routed to `/dashboard`.
  * **Standard Users** must be dynamically routed to `/`.
* This dynamic routing must be implemented in both:
  * Backend Google callback handlers (HTTP redirects).
  * Frontend login page form submit handlers (client router pushes).

## 3. User Enumeration Mitigation (Security)
* Never expose whether a given email address exists or which login provider (Google OAuth vs. native password) it uses on credential login.
* The native login endpoint (`POST /api/auth/login`) must return a generic `"invalid email or password"` error for any mismatch (including email-not-found, incorrect password, or provider mismatches like trying to log in natively with a Google-registered account).

## 4. UI Error & Notification Cards (Design System)
* Never use browser `alert()` popups for authentication feedback.
* **Errors & Validation Mismatches**: Render styled inline warning cards with danger red styling:
  `className="mx-8 mt-6 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 font-body-sm text-body-sm text-danger"`
* **Successful Actions**: Render styled success cards with green styling:
  `className="mx-8 mt-6 rounded-lg border border-success/20 bg-success/5 px-4 py-3 font-body-sm text-body-sm text-success"`

## 5. Global Session Restoration
* To ensure the Navbar user profile bar renders immediately on public routes (like the landing page `/`), the application uses an app-wide `<SessionProvider>` client wrapper inside the root `layout.tsx`.
* The `SessionProvider` queries `/api/auth/me` on mount to restore and initialize the authenticated Zustand user state.
* The `AuthGuard` remains responsible for checking route-level authorization and blocking rendering of protected child components for unauthorized user roles.
