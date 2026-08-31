# 06. Upload Limits and the VPS Edge nginx

Mandatory reading before changing any upload limit, or when an upload fails
with a 413 that no application log explains.

## The trap: there are TWO nginx configs, and only one is in this repo

`nginx/nginx.conf` in this repository configures the **nginx container inside
the compose stack**. It currently allows:

- `client_max_body_size 20m` at the http/server level (line ~29)
- `client_max_body_size 12m` on the upload location (line ~76)

That file is **not** the one rejecting large uploads in sandbox or production.

On the VPS there is a **second, edge nginx** running on the host, in front of
the compose stack, whose config lives outside this repository (typically
`/etc/nginx/nginx.conf` or `/etc/nginx/sites-available/<site>`). It still
carries the nginx default of **`client_max_body_size 1m`**.

## Why this is hard to diagnose

The edge proxy rejects the request **before it ever reaches the Go backend**.
Consequences, all of which have cost time already:

- The response is nginx's own **HTML** 413 page, not the JSON error shape the
  frontend expects, so the client-side error handling reports something
  misleading rather than "file too large".
- **Nothing appears in the backend logs**, because the backend never saw the
  request. Searching Go logs for the failure finds nothing and invites the
  wrong conclusion that the handler is broken.
- Editing `nginx/nginx.conf` in this repo and redeploying **changes nothing**,
  because the limit being hit is one layer further out.

## What this means for application-level limits

The application's own limits are currently:

| Layer | Limit | Where |
|---|---|---|
| Per file | 2MB / 5MB / 10MB, by document type | `backend/internal/organizer/service.go` `documentTypeLimits` |
| Cover image | 5MB | `backend/internal/event/handler.go` (x3) + `organizer/service.go` `maxCoverImageBytes` |
| Per request | 12MB | `backend/internal/organizer/service.go` `maxUploadRequestBytes` |
| Client-side mirror | same per-type limits / 12MB | `frontend/src/lib/documentUpload.ts` `DOCUMENT_TYPE_LIMITS` |
| Compose nginx | 12m / 20m | `nginx/nginx.conf` |
| **VPS edge nginx** | **1m** | **not in this repo — on the host** |

The effective ceiling in a deployed environment is the **smallest** of these.
While the edge stays at 1m, every limit above it is fiction: the app advertises
2-10MB depending on document type, validates the same in the browser, and the
edge rejects anything over 1MB.

1MB is below what an uncompressed phone photo of a KTP needs (2–4MB) even
after this repo's client-side compression shrinks it — a compressed KTP photo
lands around 150-300KB, comfortably under 1MB, but an unusually large or
already-compressed source can still land over it. This is not a
conservative-but-safe setting — it can still break a legitimate flow.

## Fixing it

On the VPS, in the **host** nginx config (not this repo's):

```nginx
# must be >= the app's maxUploadRequestBytes, with headroom for multipart overhead
client_max_body_size 12m;
```

Set it at the `http` block to cover every server, or on the specific
`location`/`server` handling `/api/`. Then:

```sh
sudo nginx -t && sudo systemctl reload nginx
```

Verify from outside the host, not from on it — a request that does not traverse
the edge proxy will not exercise the limit:

```sh
# expect 413 before the fix, a normal application response after
curl -s -o /dev/null -w '%{http_code}\n' -F "file=@some-2mb-file.pdf" https://<host>/api/...
```

## Rule when changing limits

Any change to `documentTypeLimits`, `maxCoverImageBytes`, or
`maxUploadRequestBytes` must be matched in **all** of:

1. `backend/internal/organizer/service.go` (the server's enforcement) and,
   for the cover image specifically, the three `event/handler.go` spots too
   — `maxCoverImageBytes`'s own comment says it must match them
2. `frontend/src/lib/documentUpload.ts` (`DOCUMENT_TYPE_LIMITS`, the mirror
   the UI validates and advertises with — it exists specifically so the
   hint text, the accept filter and the check cannot drift from the server)
   and the cover-image pickers' own `MAX_BYTES`/`MAX_COVER_BYTES` constants
3. `nginx/nginx.conf` (compose stack)
4. the **VPS edge nginx**, by hand, on each host

Miss item 4 and the change silently does nothing in the only environments that
matter.
