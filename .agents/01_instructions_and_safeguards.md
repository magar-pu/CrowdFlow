# 01. Instructions and Safeguards

This document defines the operational directives, architectural boundaries, and protection mechanisms of the CrowdFlow Event Ticketing and Venue Management platform.

---

## 🎯 Scope of Features

### In-Scope
* **Authentication**: Email/password native login (bcrypt) and Google OAuth 2.0 with JWT credentials. Secure state handling using `HttpOnly` access cookies and client-accessible Double-Submit `csrf_token` cookies.
* **Event & Venue Management**: High-fidelity models for events, seating arrangements, and ticket inventories.
* **High-Concurrency Booking Flow**: Real-time seat reservation leveraging a Redis-based locking layer to guarantee seat exclusivity before database entry.
* **Proxy Routing**: Reverse-proxy configurations via Nginx on standard ports (`80` / `443`).

### Next Feature / Deferred
* **Payment Integration**: Webhook receivers and payment processing via Midtrans or Xendit for local Indonesian rails (E-wallets, Virtual Accounts, QRIS).
* **Secondary Marketplace**: Ticket resale rules and peer-to-peer exchange ledger updates.

---

## 🔒 Operational Constraints & Network Security

* **Exposed Interfaces**: Only the `nginx` container is permitted to publish ports (`80` for HTTP and `443` for HTTPS) to the host interface. No direct external access to Node.js, Go backend, PostgreSQL, or Redis is allowed.
* **Network Isolation**: All services reside inside the custom bridge network (`crowdflow-net`). Backend services address each other via Docker DNS resolution (e.g. `http://backend:8080`, `redis://redis:6379`).

---

## 🛡️ Invisible-First Bot Prevention

To mitigate ticket scalping, high-speed automated checkout scripts, and inventory denial attacks, the checkout and ticketing routes enforce a three-layered defensive sieve:

### 1. Cloudflare Turnstile Telemetry
* Required on state-changing endpoints `/api/tickets/reserve` and `/api/checkout`.
* The client passes the Turnstile token in the request header.
* The Go backend validates the token via HTTP request to `https://challenges.cloudflare.com/turnstile/v0/siteverify` using the private secret key and client's real IP.

### 2. Client-Side Proof-of-Work (PoW) Puzzles
* For high-demand drops, requests must contain a puzzle resolution payload.
* The server issues a challenge nonce and a difficulty metric $D$.
* The client's browser must compute a nonce $N$ such that $\text{SHA-256}(\text{challenge} + N)$ starts with $D$ leading zeros.
* Verified instantly on the backend in $O(1)$ time, throttling automated scripting tools by forcing compute tax.

### 3. Checkout HTML Honeypots
* Forms contain visually hidden inputs (e.g., `name="phone_number_verification_confirm"` styled with `position: absolute; left: -9999px;` or `display: none;`).
* Human users ignore these fields. Scripted bots automatically populate them.
* If any honeypot input contains a value upon submission, the backend drops the request and flags the IP with `400 Bad Request` without querying the database or Redis.

(This feature will be discussed later on, need to implement it in the frontend as well)

---

## 👤 Multi-Tier Role-Based Access Control (RBAC)

The platform supports fine-grained access levels segmented between platform-wide roles and event-level administration roles.

### Roles Matrix
* **Super Admin**: Full global system state control, organizer provisioning, global fee structure updates, and database configuration access.
* **Organizer**: Management of assigned events, venue layout design, ticket tier generation, check-in scanner allocations, and payout reports.
* **Auditor**: Read-only financial statements, transaction history logs, and system audit trails for taxation and compliance.

### Ternary Unique Tuple Constraint
To prevent conflicts of interest and duplicate roles on individual events, the `user_roles` database schema enforces specific partial unique constraints:

```sql
-- Prevents a user from having duplicate role assignments for the same event
CREATE UNIQUE INDEX idx_user_roles_event 
ON public.user_roles (user_id, event_id, role_id) 
WHERE (event_id IS NOT NULL);

-- Enforces unique platform-wide roles for users
CREATE UNIQUE INDEX idx_user_roles_platform 
ON public.user_roles (user_id, role_id) 
WHERE (event_id IS NULL);
```

Note that roles of the same name but for different events are allowed to exist in the database, and custom roles will be added later on (even though the database schema already support it)
