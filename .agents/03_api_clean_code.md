# 03. API Clean Code Guidelines

This document establishes the architecture, code style, and security controls for all API requests and responses across the CrowdFlow platform (both React frontend and Go backend).

> [!IMPORTANT]
> **COMPLIANCE REQUIRED**
> Any agent modifying, extending, or integrating with backend handler endpoints, proxy configurations, or frontend API wrappers **MUST** read, understand, and strictly adhere to the patterns documented below. No ad-hoc fetching, raw JSON manual encoding in handlers, or inline `fetch` calls are allowed.

---

## 📖 Conversation History Briefing

The clean API patterns detailed in this document are the result of key architectural improvements implemented to resolve early-stage bugs:

1. **Static Google OAuth Layout**:
   * **Problem**: The Google OAuth login button dynamically loaded script-based elements that would disappear or delay rendering on weak/offline network connections, leaving the user with a broken UI.
   * **Solution**: Restructured the layout using a static HTML/CSS container placeholder. The layout structure remains solid and interactive even if Google's authentication script loads asynchronously or experiences high latency.
2. **Error 400 redirect_uri_mismatch**:
   * **Problem**: Client-side OAuth trigger was requesting a callback URL that did not match the registered Google Console credentials or backend configuration.
   * **Solution**: Aligned both client-side triggers and the Go backend redirect logic to point strictly to `/api/auth/google/login` and `/api/auth/google/callback`.
3. **Frontend API Handler Decoupling**:
   * **Problem**: Components (`login/page.tsx`, `register/page.tsx`) were using raw inline `fetch()` calls. This resulted in hardcoded URLs, duplicate `Content-Type: application/json` headers, manual JSON serialization, and fragile extraction of the CSRF token.
   * **Solution**: Decoupled network operations into service files under `frontend/src/lib/api/` (e.g., [auth.ts](file:///c:/Users/geral/Documents/code/Projects/webdev/CrowdFlow/frontend/src/lib/api/auth.ts)) and centralized execution inside a type-safe `apiRequest<T>` wrapper.
4. **API Envelope Type Alignment**:
   * **Problem**: The React client expected a response format containing `{ status: "success", data }` but the Go backend returned `{ success: true, data }`.
   * **Solution**: Unified both layers to use a standard success/error wrapper matching `StandardResponse` on the backend and `ApiResponse<T>` on the frontend.

---

## 🌐 Standard Response Envelope

All JSON APIs MUST follow a unified schema. Direct objects or raw status code strings must never be returned without this envelope.

### Go Backend Structs
In `backend/internal/response/response.go`, the standard wrappers are defined as:

```go
type StandardResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   *APIError   `json:"error,omitempty"`
}

type APIError struct {
    Code    string      `json:"code"`
    Message string      `json:"message"`
    Details interface{} `json:"details,omitempty"`
}
```

* **Success Response Helper**: `response.JSON(w, statusCode, data)`
* **Error Response Helper**: `response.Error(w, statusCode, errCode, errMsg)`

### TypeScript Frontend Interfaces
In `frontend/src/types/api.ts`, the React client mirrors this envelope:

```typescript
export interface APIError {
  code: string;       // E.g. "UNAUTHORIZED", "VALIDATION_FAILED", "NETWORK_ERROR"
  message: string;    // User-friendly presentation message
  details?: any;      // Contextual details (e.g. validator fields map)
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
}
```

---

## 🎨 Frontend API Request Architecture

### 1. Centralized Wrapper (`apiRequest<T>`)
Every remote HTTP call MUST go through `apiRequest<T>` inside [utils/api.ts](file:///c:/Users/geral/Documents/code/Projects/webdev/CrowdFlow/frontend/src/utils/api.ts). 

**What `apiRequest` automatically handles:**
* **JSON Serialization**: Sets `Content-Type: application/json` if a body exists and is not a `FormData` object.
* **Double-Submit CSRF Protection**: Extracts the client cookie `csrf_token` and automatically appends it to the `X-CSRF-Token` request header for all state-changing methods (`POST`, `PUT`, `DELETE`, `PATCH`).
* **Connection Error Fallbacks**: Catches network loss or server crashes and returns a standard error object `{ success: false, error: { code: "NETWORK_ERROR", message: "..." } }` to prevent UI component crashes.

```typescript
// Example Implementation (frontend/src/utils/api.ts)
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const method = (options.method || "GET").toUpperCase();
  const isStateChanging = ["POST", "PUT", "DELETE", "PATCH"].includes(method);
  const headers = new Headers(options.headers || {});

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (isStateChanging) {
    const csrfToken = getCookie("csrf_token");
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }

  try {
    const response = await fetch(url, { ...options, headers });
    return await response.json();
  } catch (err) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Cannot connect to server. Please check your network connection.",
      },
    };
  }
}
```

### 2. Decoupled Service Methods
Never call `apiRequest` directly inside a component event handler. Instead, define API actions inside dedicated files under `frontend/src/lib/api/` (e.g., `lib/api/auth.ts`, `lib/api/events.ts`).

**Good Practice (auth.ts)**:
```typescript
import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";
import { AuthUser } from "@/lib/store/authStore";

export async function loginUser(body: any): Promise<ApiResponse<AuthUser>> {
  return apiRequest<AuthUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
```

### 3. State Synchronization
Keep React state and local storage stores (e.g. Zustand `authStore.ts`) decoupled from backend endpoints.
* Event handlers trigger service methods (e.g., `loginUser`).
* Upon success, the response data is fed into store-sync actions (e.g., `set_user_from_api(user)`).

---

## 🛠️ Go Backend Handler Architecture

All HTTP handlers in Go must return the unified JSON format.

**Rules for Go Handlers:**
1. **Never write raw JSON strings**: Use the helper functions in the `response` package.
2. **Never leave errors unhandled**: Log them on the server and return a clear `APIError` payload to the client.
3. **Always use standard response helpers**:
   ```go
   // Good Practice: Success
   response.JSON(w, http.StatusOK, map[string]string{"status": "active"})

   // Good Practice: Validation Error
   response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid email format.")
   ```

4. **Verify Double-Submit CSRF on state changes**: Handlers/middleware must verify that the `csrf_token` cookie matches the incoming `X-CSRF-Token` header.
