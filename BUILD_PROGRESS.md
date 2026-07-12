# 🍽️ Barcode Server — Build Progress

> নিয়ম: প্রতিটা পয়েন্টে **✅ টিক তখনই পড়বে যখন QA Reviewer agent যাচাই করে ১০০% ঠিক বলবে** (compile + run + endpoint টেস্ট + convention + security)।
> `🔄` = চলছে · `⏳` = বাকি · `✅` = QA-verified · `❌` = QA fail

**স্ট্যাক:** TypeScript · Express 4 · Mongoose 8 · Zod · JWT · bcryptjs · Cloudinary · SSLCommerz · MongoDB Atlas
**পদ্ধতি:** aptech-learning-server-এর হুবহু convention (modular controller/service/model/routes/interface/validation)

---

## Phase 0 — Setup ও Foundation  ✅ QA-VERIFIED
- ✅ প্রজেক্ট scaffold (`barcode_server/`, package.json, tsconfig)
- ✅ `.env` + `.env.example` + `.gitignore` (Mongo URL সেট করা)
- ✅ MongoDB connection (serverless-cached, `server.ts`) — Atlas live connected
- ✅ `app.ts` — helmet, CORS(5173), rate-limit, mongo-sanitize, parsers, health check
- ✅ middlewares: `auth` (JWT + authorize), `globalErrorHandler`, `validateRequest`
- ✅ config (`config/index.ts` — jwt/cloudinary/sslcommerz)
- ✅ `npm install` সফল (205 packages)
- ✅ `npm run build` (tsc) — ০ error
- ✅ সার্ভার চালু (port **5001**) + MongoDB Atlas-এ connect (আসল টেস্ট)

## Phase 1 — Authentication  ✅ QA-VERIFIED
- ✅ User model (bcrypt pre-save hash, `id` transform, password `select:false`)
- ✅ `POST /auth/register` — **client role block, সবসময় 'user'** (security #5, live-proven)
- ✅ `POST /auth/login` — bcrypt compare, JWT issue → `{ user, token }`
- ✅ `GET /auth/me` — session hydration (authMiddleware, fresh DB re-read)
- ✅ `POST /auth/logout`
- ✅ JWT middleware + role guard (`authorize`) — 401/403/200 matrix confirmed
- ✅ `GET /users` + `GET /users/:id` (Admin only, no password leak)
- ✅ seedAdmin script (admin@barcode.com / admin123)
- ✅ QA টেস্ট: register→login→me flow আসল DB-তে কাজ করে
- ✅ QA টেস্ট: `/admin-signup` role escalation আর সম্ভব নয়
- ✅ hardening: duplicate-email race → clean 409 (QA note fixed)

## Phase 2 — Menu ও Branches (public read)  ✅ QA-VERIFIED
- ✅ Food model (numeric id, Map branchPrices/branchStocks, variations, defaults)
- ✅ `GET /foods` (+ ?category=)
- ✅ `GET /foods/popular?limit=` (admin-pinned আগে, তারপর rating)
- ✅ `GET /foods/search?q=` (regex-escaped)
- ✅ `GET /foods/:id` (404 handled — NaN id guard যোগ করা হয়েছে)
- ✅ Branch model (numeric id, manager/capacity/features)
- ✅ `GET /branches` (+ ?limit=)
- ✅ `GET /branches/search?q=`
- ✅ `GET /branches/:id` (404 — NaN id guard)
- ✅ `GET /branches/:branchId/menu` (branch-scoped foods)
- ✅ **ডেটা পরিষ্কার করে seed**: mojito dedupe (14→12 foods), Chicago address সরানো, dup নাম fix, contact/typo clean, 22 branches
- ✅ app.ts-এ route যোগ; `seed:data` script
- ✅ QA: সব endpoint live test + ডেটা পরিষ্কার নিশ্চিত

## Phase 3 — Cart → Orders  ✅ QA-VERIFIED
- ✅ Coupon model + `POST /coupons/validate` (৳ মুদ্রা) + admin list/create/delete + seed (3)
- ✅ Order model (canonical status enum, ObjectId→id, chat, rider fields)
- ✅ `POST /orders` — **সার্ভারে দাম/কুপন পুনঃগণনা, client টাকা উপেক্ষা** (#7/N1)
- ✅ **paymentStatus সার্ভার-নিয়ন্ত্রিত** (client "Paid" উপেক্ষা) (N1)
- ✅ **checkout-এ stock reserve**, Reject-এ ফেরত, double-reject safe (N2)
- ✅ `GET /orders` — admin সব / user শুধু নিজের; `?active=` (fix N4)
- ✅ `GET /orders/:id` — **ownership যাচাই (IDOR fix #6)**
- ✅ `PATCH /orders/:id/status` — canonical enum, rider ছাড়া delivery guard (#15), system chat
- ✅ `POST /orders/:id/messages` — ownership, sender+senderName সার্ভারে derive (impersonation রোধ)
- ✅ Food service: server-side দাম/স্টক helper
- ✅ app.ts route + coupon seed
- ✅ QA: 100% পাস (money/payment/IDOR/guard/stock/double-reject সব verified)
- ✅ hardening: senderName derive, quantity int, coupon ≤100% cap, dead const সরানো
## Phase 4 — Admin CRUD  ✅ QA-VERIFIED
- ✅ Foods CRUD (`POST/PATCH/PUT/DELETE /foods`) + `PATCH /foods/:id/stock` (atomic numeric id, branches→branchIds, Map, variations)
- ✅ Branches CRUD (features comma-string→array)
- ✅ Hero slides CRUD (`GET` public, admin write; featuredFoodId coerce)
- ✅ About: `GET`/`PUT` core + timeline & leadership **stable id দিয়ে** add/update/delete (#4.10 fix, index নয়)
- ✅ Settings `GET`/`PUT`(merge)/`POST reset` — **overwrite নয়, merge** (N23)
- ✅ সব admin write endpoint-এ authorize('admin') guard + Zod validation (hero/settings/about সহ)
- ✅ hero seed (3); app.ts route
- ✅ **atomic Counter দিয়ে id race fix** (QA MEDIUM — 5 concurrent create verified)
- ✅ QA: functional 100% + id-race fix + Zod gap fix
## Phase 5 — Riders ও Delivery  ✅ QA-VERIFIED
- ✅ **Unified rider identity** — rider = User(role:'rider'), vehicle/riderStatus (N7 fix)
- ✅ `GET /riders` (admin), `GET /riders/:id`, `PATCH /riders/:id/status`
- ✅ rider-application: **multipart upload** (photo image + license PDF → **private disk**, Cloudinary পরে swap)
- ✅ `GET /rider-applications` (admin) + `/documents` + **auth-gated file stream** `/documents/:type`
- ✅ `POST /rider-applications/:id/approve` — **atomic promote user→rider** (#13), reject
- ✅ Order rider flow: `assign-rider` (admin), `accept-rider` (rider), `reject-rider` → **auto-reassign** (login-অক্ষম rider এড়ায়, N7)
- ✅ delivery guard এখন কাজ করে (rider accept-এর পর OFD/Delivered)
- ✅ file upload error 400; app.ts route + rider seed (2)
- ✅ **QA MEDIUM fix: KYC docs public ছিল → private দিরে + admin-auth stream** — completed: (1) app.ts এ `/uploads/riders` public mount block (404 guard), (2) legacy `uploads/riders/*` ফাইল `private-uploads/riders`-এ migrate, (3) magic-byte content validation (ext নয়, আসল bytes). Live re-verified: public `/uploads/riders/<f>` → **401/404 (no file)**, no-auth stream **401**, user **403**, admin **200** (image/png + application/pdf), spoofed upload **400**
- ✅ QA: functional 100% + security fix
## Phase 6 — Analytics (আসল হিসাব)  ✅ QA-VERIFIED
- ✅ `GET /analytics/summary` — **আসল orders থেকে** revenue/orders + branch/dish count + MoM change (N5 fix)
- ✅ `GET /analytics/revenue-by-branch` — order aggregation, branch join, shortName
- ✅ `GET /analytics/orders-by-category` — **order item category snapshot** (food-delete safe, §2.2 fix)
- ✅ `GET /analytics/revenue-trend?months=` — মাসভিত্তিক real revenue (months clamp 1..36)
- ✅ `GET /analytics/top-dishes?limit=` — item snapshot aggregation (limit sanitize, deleted food টিকে থাকে)
- ✅ সব admin-only; Rejected order বাদ
- ✅ QA: real computation verified (exact before/after delta) + edge fixes (limit 500, months clamp, deleted-food snapshot)
## Phase 7 — Payment (SSLCommerz)  ✅ QA-VERIFIED
- ✅ SSLCommerz service (demo/sandbox mode — store_id খালি হলে auto-demo; key দিলে real API)
- ✅ `POST /payments/init` — **amount সার্ভারের order.total থেকে** (client দেয় না), ownership, already-paid guard
- ✅ `POST /payments/ipn` — gateway callback; **paymentStatus এখানেই সার্ভারে Paid হয়** (client "Paid" পাঠাতে পারে না, N1); real mode-এ validate + **amount/currency যাচাই**
- ✅ `GET /payments/status/:orderId` — owner/admin
- ✅ app.ts route; config-এ sslcommerz আছে
- ✅ **prod-demo guard** (production-এ store key ছাড়া free-payment demo বন্ধ) + real-mode amount verify (QA MEDIUM ×2 fix)
- ✅ QA: N1 verified (paymentStatus শুধু IPN-এ Paid, client পথ নেই) + production hardening
## Phase 8 — Frontend wiring + fixes — ⏳ পরে

---

### 📋 QA Reviewer লগ
| তারিখ | Phase | রায় | নোট |
|------|-------|-----|-----|
| 2026-07-09 | 0+1 | ✅ PASS (100%) | tsc 0 error · 18 live endpoint test পাস · role-escalation live-blocked · কোনো password leak নেই · convention মেলে। ২টি LOW note: dev stack (prod-safe), JWT role staleness (পরের phase)। duplicate-race 409 fix করা হয়েছে। |
| 2026-07-09 | 2 | ✅ PASS (100% after fix) | QA প্রথমে FAIL দেয় — `/foods/abc` ও `/branches/abc` 500 (NaN CastError)। fix: Number.isFinite guard → এখন 404। ডেটা পরিষ্কার source+live মিলিয়ে ১০০% নিশ্চিত (mojito dedupe, Chicago, dup নাম, contact, typo)। route ordering, defaults, convention সব পাস। |
| 2026-07-09 | 3 | ✅ PASS (100%) | ৯টা security fix code+live verified: money recompute (0.02 underpay ignored), coupon re-validate, paymentStatus forced Pending, stock reserve+double-reject safe, IDOR 403, list scoping, status guard #15, chat sender unspoofable। ৮টা LOW note — ৪টা fix করা (senderName derive, quantity int, coupon cap, dead const)। বাকি (atomic $inc stock, rider-scoping) পরের phase। |
| 2026-07-09 | 4 | ✅ PASS (100% after fix) | functional সব PASS (auth, numeric id, #4.10 stable-id, N23 merge, Map persist, validation, route ordering)। QA MEDIUM: `max+1` id race → 5 concurrent create-এ E11000 500। fix: atomic Counter collection + seed-এ counter init → 5 concurrent verified unique। LOW: hero/settings/about-এ Zod নেই → validation ফাইল যোগ করা হলো (verified 400)। |
| 2026-07-09 | 5 | ✅ PASS (100% after fix) | functional সব PASS (unified identity N7, approve-promote #13, multipart upload, assign/accept/reject auto-reassign, guard #15)। QA MEDIUM security: rider KYC PDF/ছবি public static-এ auth ছাড়া 200। fix: private-uploads দিরে + admin-auth stream route (/documents/:type) → public 404, no-auth 401, user 403, admin 200 verified + magic-byte content validation। ৪টা LOW (non-atomic promote, Busy toggle, rider self-scope) পরের hardening। |
| 2026-07-09 | 6 | ✅ PASS (100% after fix) | core N5 verified: সব metric আসল order থেকে exact delta-তে নড়ে (fake seeded নয়), Rejected excluded। QA MEDIUM: `top-dishes?limit=0/-1/abc` → 500 (unsanitized $limit) → sanitize করা। LOW-MED: food delete-এ orders-by-category/top-dishes থেকে বাদ পড়ত → **order item-এ category snapshot** যোগ করে fix (delete-এর পরও টিকে থাকে verified)। months clamp 1..36। |
| 2026-07-09 | 7 | ✅ PASS (demo scope + N1) | N1 verified: paymentStatus শুধু IPN handler-এ Paid হয় (validity gate-এর পর), client পথ নেই — creation-এ Pending, init-এ Pending, `{amount:1}` উপেক্ষা করে order.total ব্যবহার। ownership/already-paid/404/idempotent সব পাস। QA MEDIUM ×2: (1) real-mode IPN amount যাচাই করত না → amount/currency check যোগ; (2) demo mode prod-এ auto-active → isProdDemo() guard যোগ (503)। demo trust-callback dev-only limitation documented। |
| 2026-07-09 | 8 | 🔄 চলছে | Favorites (per-user #23) + global Search backend যোগ (backend সম্পূর্ণ)। Frontend wiring শুরু: .env, apiClient envelope unwrap, authService/favoritesService swap। |
