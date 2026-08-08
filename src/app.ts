import cors, { CorsOptions } from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import path from 'path';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import jwt from 'jsonwebtoken';

import config from './app/config';
import { AuthRoutes } from './app/modules/auth/auth.routes';
import { UserRoutes } from './app/modules/user/user.routes';
import { FoodRoutes } from './app/modules/food/food.routes';
import { BranchRoutes } from './app/modules/branch/branch.routes';
import { BrandRoutes } from './app/modules/brand/brand.routes';
import { RegionRoutes } from './app/modules/region/region.routes';
import { CouponRoutes } from './app/modules/coupon/coupon.routes';
import { OrderRoutes } from './app/modules/order/order.routes';
import { HeroRoutes } from './app/modules/hero/hero.routes';
import { AboutRoutes } from './app/modules/about/about.routes';
import { SettingsRoutes } from './app/modules/settings/settings.routes';
import { RiderRoutes } from './app/modules/rider/rider.routes';
import { RiderApplicationRoutes } from './app/modules/riderApplication/riderApplication.routes';
import { AnalyticsRoutes } from './app/modules/analytics/analytics.routes';
import { PaymentRoutes } from './app/modules/payment/payment.routes';
import { FavoritesRoutes } from './app/modules/favorites/favorites.routes';
import { SearchRoutes } from './app/modules/search/search.routes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';

const app: Application = express();

// 🔁 Behind a reverse proxy (Coolify / nginx / Traefik), req.ip is the PROXY's
// address unless this is set — which made every rate limiter below key on a
// single IP, so the whole site shared one 500-request budget and one busy rider
// could 429 every other user.
//
// Defaults to one hop (Coolify/Traefik). Override with TRUST_PROXY if a CDN
// sits in front as well — see the note in config/index.ts.
app.set('trust proxy', config.trust_proxy);

// ✅ Security: Helmet (HTTP headers)
app.use(helmet());

// ✅ Security: CORS
const allowedOrigins: (string | RegExp)[] = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  /\.vercel\.app$/,
];
// Production frontend URL(s) from env — comma-separated, e.g. CLIENT_URL=https://app.example.com,https://www.example.com
if (config.client_url) {
  config.client_url.split(',').forEach((o) => {
    const trimmed = o.trim();
    if (trimmed) allowedOrigins.push(trimmed);
  });
}
const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true,
};
app.use(cors(corsOptions));

// 🔁 Restore the /api path prefix when a reverse proxy has stripped it.
//
// Serving this API from https://<domain>/api makes the proxy forward /branches
// instead of /api/branches, so every route 404s with "Cannot GET /branches".
// Restoring the prefix here lets the same build run at a domain root or behind a
// path prefix without caring which.
//
// This matters beyond convenience: SSLCommerz's firewall rejects a payment
// session whose callback URLs are on an unregistered host, so the API has to be
// reachable on the registered domain — which is exactly the path-prefix setup.
//
// Everything the app serves outside /api is listed here and passes through
// untouched; anything else is assumed to be an API call missing its prefix.
// `/health` is listed so load-balancer probes don't get rewritten into
// `/api/health`, 404, and burn a slot in the rate limiter below.
const PROXY_PASSTHROUGH_PREFIXES = ['/api', '/uploads', '/health', '/favicon.ico'];
app.use((req: Request, _res: Response, next: NextFunction) => {
  const isRoot = req.url === '/' || req.url.startsWith('/?');
  const isPassthrough = PROXY_PASSTHROUGH_PREFIXES.some(
    (p) => req.url === p || req.url.startsWith(`${p}/`) || req.url.startsWith(`${p}?`),
  );
  if (!isRoot && !isPassthrough) req.url = `/api${req.url}`;
  next();
});

// ✅ Security: Rate Limiting (global)
//
// Keyed per authenticated USER, falling back to IP for anonymous traffic. IP
// alone is the wrong unit here: riders and staff routinely share one mobile
// carrier NAT or one office connection, so an IP-only budget let one person's
// dashboard lock out everyone behind the same address. The token is verified
// (not just decoded) so nobody can mint fresh buckets with a forged `sub`.
const rateLimitKey = (req: Request): string => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], config.jwt.access_secret) as {
        _id?: string;
      };
      if (decoded?._id) return `u:${decoded._id}`;
    } catch {
      // fall through to IP — an invalid token is anonymous traffic
    }
  }
  // ipKeyGenerator normalizes IPv6 into a /64 subnet so a single host can't
  // rotate through its address space to get unlimited buckets.
  return `ip:${ipKeyGenerator(req.ip ?? '')}`;
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKey,
  // CORS preflights carry no credentials and do no work — counting them just
  // halves everyone's real budget.
  skip: (req) => req.method === 'OPTIONS',
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api', globalLimiter);

// ✅ Security: Auth Rate Limiting (stricter — only counts failed attempts)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // dev-friendly; reduce to ~10 in production
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ✅ Security: the gateway's fail/cancel return URLs must stay public, but each
// call can cost us an outbound verification request to SSLCommerz. Cap them so
// an anonymous caller can't burn the merchant's gateway quota. A real customer
// hits these at most a couple of times per checkout.
const gatewayReturnLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/payments/fail', gatewayReturnLimiter);
app.use('/api/payments/cancel', gatewayReturnLimiter);

// ✅ Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🔒 Rider KYC documents (license PDF + applicant photo) are PII and must NEVER be served
// from the public static mount. They live in private-uploads/riders and are streamed only via
// the admin-authenticated GET /api/rider-applications/:id/documents/:type route. This guard
// (placed before the static mount) blocks the legacy public path so any file that ever lands
// under uploads/riders stays private.
app.use('/uploads/riders', (_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// ✅ Serve locally-uploaded PUBLIC files (food/hero/about images — dev fallback before Cloudinary)
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'), {
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  })
);

// ✅ Security: NoSQL Injection Prevention
app.use(mongoSanitize());

// ─── Application Routes ─────────────────────────────────────
app.use('/api/auth', AuthRoutes);
app.use('/api/users/me/favorites', FavoritesRoutes); // ⚠️ /api/users এর আগে (route precedence)
app.use('/api/users', UserRoutes);
app.use('/api/foods', FoodRoutes);
app.use('/api/branches', BranchRoutes);
app.use('/api/brands', BrandRoutes);
app.use('/api/regions', RegionRoutes);
app.use('/api/coupons', CouponRoutes);
app.use('/api/orders', OrderRoutes);
app.use('/api/hero-slides', HeroRoutes);
app.use('/api/about', AboutRoutes);
app.use('/api/settings', SettingsRoutes);
app.use('/api/riders', RiderRoutes);
app.use('/api/rider-applications', RiderApplicationRoutes);
app.use('/api/analytics', AnalyticsRoutes);
app.use('/api/payments', PaymentRoutes);
app.use('/api/search', SearchRoutes);

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Barcode Restaurant Server is running! 🍽️🚀' });
});
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, status: 'ok' });
});

// Global error handler
app.use(globalErrorHandler);

export default app;
