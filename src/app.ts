import cors, { CorsOptions } from 'cors';
import express, { Application, Request, Response } from 'express';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

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

// ✅ Security: Rate Limiting (global — 500 req / 15min / IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // dev-friendly; reduce to ~100 in production
  standardHeaders: true,
  legacyHeaders: false,
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

// Global error handler
app.use(globalErrorHandler);

export default app;
