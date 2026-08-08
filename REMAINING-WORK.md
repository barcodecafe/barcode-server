# Remaining work — barcode-server

Written 2026-08-09, after the performance and data-loading fixes landed in
production (`f357d9b`, `610af8f`).

**None of these were reported by the client.** All five were found while
investigating the reported problems. The client's five complaints — empty admin
orders, the fleet spinner, slow dashboards, slow customer site, data going
blank — are fixed and verified live.

Ordered by how much damage they can do, not by effort.

---

## 1. 🔴 Sockets have no authentication, and every event is broadcast to everyone

**Severity: high — this is a live privacy leak, not a performance issue.**

**Where:** `src/server.ts:55-135`, plus every `io.emit` in
`src/app/modules/order/order.controller.ts` (lines 46-48, 177-178, 227, 231,
254-256) and `src/app/modules/rider/rider.controller.ts:98`.

**What is wrong**

Socket.IO is initialised with `cors: { origin: '*' }` and no handshake auth. The
client sends a token (`services/socket.js` supplies one in `auth`), but the
server never reads it. Every connected socket is anonymous and equal.

Every notification is `io.emit(...)`, which delivers to *all* connected clients.
There is not a single `socket.join()` or room in the codebase. So:

- `order_created` / `order_updated` carry the whole order — **customer name,
  phone number and delivery address** — to every open browser on the site,
  including ordinary customers browsing the menu.
- `new_chat_message` broadcasts every order's conversation to everyone.
- Any anonymous client can *emit* `create_order`, `order_status_updated`,
  `order_updated` or `send_message`, and the server rebroadcasts the raw,
  unvalidated payload to every dashboard.

**What to do**

1. Authenticate the handshake: verify the JWT in `io.use((socket, next) => …)`
   and attach the user to `socket.data`. Reject sockets without a valid token
   for anything beyond public events.
2. Replace broadcasts with rooms:
   - `admins` — joined by admin/super_admin sockets; receives `order_created`,
     `order_updated`, `pending_count_updated`.
   - `rider:<riderId>` — receives that rider's assignments only.
   - `order:<orderId>` — the customer who owns it, the assigned rider, and
     admins; receives `new_chat_message` and status changes for that order.
3. Stop trusting client-emitted mutations. `create_order`,
   `order_status_updated` and `order_updated` should not be re-broadcast from a
   client payload at all — the REST controllers already emit after they have
   written to the database, which is the only trustworthy source.
4. Restrict the socket CORS origin to `config.client_url`, matching the HTTP
   CORS list in `app.ts`.

**Watch out:** the client currently relies on receiving these events globally.
`context/OrderContext.jsx`, `layouts/RiderLayout.jsx`, `pages/rider/RiderOrders.jsx`,
`pages/admin/AdminOrders.jsx` and `pages/admin/AdminRidersFleet.jsx` all
subscribe. Moving to rooms needs the client to connect *after* login so the
handshake carries a token, and to reconnect when the session changes.

---

## 2. 🟡 Rider chat messages disappear a few seconds after being sent

**Where:** `src/app/modules/order/order.service.ts` — `LIST_PROJECTION` excludes
`chatHistory`; the rider list poll then overwrites the freshly-sent message.

**What is wrong**

Order list endpoints deliberately drop `chatHistory` (it is large and the tables
do not show it). The rider page merges a sent message into its local state, then
its next poll replaces that order object with one that has no `chatHistory` —
so the message visibly vanishes. `pages/rider/RiderOrders.jsx:53` reads
`chatOrder?.chatHistory?.length`, which is therefore always 0.

This may be part of what the client meant by "data goes blank and comes back".

**What to do**

Add `GET /api/orders/:id/messages` and have the chat panel read from it, rather
than depending on the list carrying chat history. Keep the list lean.

---

## 3. 🟡 CORS allows every `*.vercel.app` origin with credentials

**Where:** `src/app.ts` — the `allowedOrigins` array contains `/\.vercel\.app$/`
and `corsOptions` sets `credentials: true`.

**What is wrong**

Any deployment on `vercel.app` — including one an attacker controls — can make
credentialed cross-origin requests to this API. The regex was presumably added
for preview deployments.

**What to do**

Remove the wildcard and list the real origins in `CLIENT_URL` (comma-separated;
`app.ts` already splits it). If preview deployments are genuinely needed, match
the exact project subdomain rather than the whole of `vercel.app`.

**Blocked on:** knowing which domains are actually in use.

---

## 4. 🟡 Order images are stored at full resolution

**Where:** the `foods`, `branches`, `brands` and `heroslides` collections.

**What is wrong**

List payloads are fixed (35 MB → 33 KB) because images now load separately and
cache for a year. But the images themselves are unoptimised: a single dish photo
is ~760 KB, so a first visit to `/menu` still transfers ~7.3 MB of images.

**What to do**

Resize and re-encode on upload (and once over the existing rows) to roughly
100-150 KB at a sensible display size. `sharp` on the upload path plus a one-off
migration script. Cloudinary is already configured and would also do this.

Note the URLs carry `?v=<updatedAt>`, so re-encoding an image changes its URL
and no stale copy can be served from cache.

---

## 5. Pagination on the remaining list endpoints

`GET /api/orders` reads `?limit` / `?page` now. These still return everything:
`/api/users`, `/api/foods`, `/api/coupons`, `/api/riders`,
`/api/rider-applications`, `/api/analytics/top-customers` (whose default limit
of 0 means "all customers").

Low urgency — the indexes added in `f357d9b` make these fast — but the payloads
grow without bound.

---

See `REMAINING-WORK.md` in **barcode-client** for the front-end items.
