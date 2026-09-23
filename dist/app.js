"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("./app/config"));
const auth_routes_1 = require("./app/modules/auth/auth.routes");
const user_routes_1 = require("./app/modules/user/user.routes");
const food_routes_1 = require("./app/modules/food/food.routes");
const branch_routes_1 = require("./app/modules/branch/branch.routes");
const brand_routes_1 = require("./app/modules/brand/brand.routes");
const region_routes_1 = require("./app/modules/region/region.routes");
const coupon_routes_1 = require("./app/modules/coupon/coupon.routes");
const order_routes_1 = require("./app/modules/order/order.routes");
const hero_routes_1 = require("./app/modules/hero/hero.routes");
const about_routes_1 = require("./app/modules/about/about.routes");
const settings_routes_1 = require("./app/modules/settings/settings.routes");
const policy_routes_1 = require("./app/modules/policy/policy.routes");
const rider_routes_1 = require("./app/modules/rider/rider.routes");
const riderApplication_routes_1 = require("./app/modules/riderApplication/riderApplication.routes");
const analytics_routes_1 = require("./app/modules/analytics/analytics.routes");
const payment_routes_1 = require("./app/modules/payment/payment.routes");
const favorites_routes_1 = require("./app/modules/favorites/favorites.routes");
const search_routes_1 = require("./app/modules/search/search.routes");
const images_routes_1 = require("./app/modules/images/images.routes");
const review_routes_1 = require("./app/modules/review/review.routes");
const feedback_routes_1 = require("./app/modules/feedback/feedback.routes");
const addon_routes_1 = require("./app/modules/addon/addon.routes");
const category_routes_1 = require("./app/modules/category/category.routes");
const notification_routes_1 = require("./app/modules/notification/notification.routes");
const swagger_routes_1 = require("./app/docs/swagger.routes");
const globalErrorHandler_1 = __importDefault(require("./app/middlewares/globalErrorHandler"));
const app = (0, express_1.default)();
// 🔁 Behind a reverse proxy (Coolify / nginx / Traefik), req.ip is the PROXY's
// address unless this is set — which made every rate limiter below key on a
// single IP, so the whole site shared one 500-request budget and one busy rider
// could 429 every other user.
//
// Defaults to one hop (Coolify/Traefik). Override with TRUST_PROXY if a CDN
// sits in front as well — see the note in config/index.ts.
app.set('trust proxy', config_1.default.trust_proxy);
// ✅ Security: Helmet (HTTP headers)
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
}));
// ✅ Security: CORS
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://www.barcoderestaurantgroup.com',
];
// Production frontend URL(s) from env — comma-separated, e.g. CLIENT_URL=https://app.example.com,https://www.example.com
if (config_1.default.client_url) {
    config_1.default.client_url.split(',').forEach((o) => {
        const trimmed = o.trim().replace(/\/+$/, '');
        if (trimmed && !allowedOrigins.includes(trimmed)) {
            allowedOrigins.push(trimmed);
        }
    });
}
const corsOptions = {
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
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
const PROXY_PASSTHROUGH_PREFIXES = ['/api', '/uploads', '/health', '/favicon.ico', '/api-docs'];
app.use((req, _res, next) => {
    const isRoot = req.url === '/' || req.url.startsWith('/?');
    const isPassthrough = PROXY_PASSTHROUGH_PREFIXES.some((p) => req.url === p || req.url.startsWith(`${p}/`) || req.url.startsWith(`${p}?`));
    if (!isRoot && !isPassthrough)
        req.url = `/api${req.url}`;
    next();
});
// ✅ Security: Rate Limiting (global)
//
// Keyed per authenticated USER, falling back to IP for anonymous traffic. IP
// alone is the wrong unit here: riders and staff routinely share one mobile
// carrier NAT or one office connection, so an IP-only budget let one person's
// dashboard lock out everyone behind the same address. The token is verified
// (not just decoded) so nobody can mint fresh buckets with a forged `sub`.
const rateLimitKey = (req) => {
    var _a;
    const authHeader = req.headers.authorization;
    if (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')) {
        try {
            const decoded = jsonwebtoken_1.default.verify(authHeader.split(' ')[1], config_1.default.jwt.access_secret);
            if (decoded === null || decoded === void 0 ? void 0 : decoded._id)
                return `u:${decoded._id}`;
        }
        catch (_b) {
            // fall through to IP — an invalid token is anonymous traffic
        }
    }
    // ipKeyGenerator normalizes IPv6 into a /64 subnet so a single host can't
    // rotate through its address space to get unlimited buckets.
    return `ip:${(0, express_rate_limit_1.ipKeyGenerator)((_a = req.ip) !== null && _a !== void 0 ? _a : '')}`;
};
// The public catalogue: read-only, non-sensitive, identical for every visitor.
//
// These are the endpoints an anonymous customer hits just to look at the menu,
// so they must not share the same budget as real API traffic. A soak test made
// the problem concrete: behind one IP — which is what a mobile carrier NAT
// looks like — anonymous visitors exhausted the shared allowance and every
// subsequent one got a 429, while logged-in users (keyed per user) sailed
// through untouched. That is a smaller replay of the original bug.
//
// They get a much larger allowance and a short cache lifetime, so a customer
// browsing the menu costs the server almost nothing.
const PUBLIC_CATALOGUE = [
    '/api/foods',
    '/api/branches',
    '/api/brands',
    '/api/regions',
    '/api/hero-slides',
    '/api/about',
    '/api/settings',
    '/api/policies',
];
const isPublicCatalogueRead = (req) => req.method === 'GET' && PUBLIC_CATALOGUE.some((p) => req.originalUrl.startsWith(p));
// 60s is a deliberate compromise: long enough that a customer clicking through
// the menu re-reads from cache instead of the server, short enough that an
// admin's edit shows up while they are still looking at it.
app.use((req, res, next) => {
    if (isPublicCatalogueRead(req)) {
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    }
    next();
});
const catalogueLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 6000,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: rateLimitKey,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use(PUBLIC_CATALOGUE, (req, res, next) => req.method === 'GET' ? catalogueLimiter(req, res, next) : next());
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 1500,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: rateLimitKey,
    // CORS preflights carry no credentials and do no work — counting them just
    // halves everyone's real budget.
    //
    // /api/images is skipped for the same reason a CDN would not count static
    // files: one menu page legitimately requests twenty of them, they are
    // immutable and browser-cached after the first visit, and charging them
    // against the same budget as real API calls would lock a browsing customer
    // out of the site they are trying to order from.
    //
    // Public catalogue reads are metered by catalogueLimiter above instead, so
    // they are skipped here rather than counted twice.
    skip: (req) => req.method === 'OPTIONS' || req.path.startsWith('/images/') || isPublicCatalogueRead(req),
    message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api', globalLimiter);
// ✅ Security: Auth Rate Limiting (stricter — only counts failed attempts)
const authLimiter = (0, express_rate_limit_1.default)({
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
const gatewayReturnLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/payments/fail', gatewayReturnLimiter);
app.use('/api/payments/cancel', gatewayReturnLimiter);
// ✅ Parsers
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// 🔒 Rider KYC documents (license PDF + applicant photo) are PII and must NEVER be served
// from the public static mount. They live in private-uploads/riders and are streamed only via
// the admin-authenticated GET /api/rider-applications/:id/documents/:type route. This guard
// (placed before the static mount) blocks the legacy public path so any file that ever lands
// under uploads/riders stays private.
app.use('/uploads/riders', (_req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
});
// ✅ Serve locally-uploaded PUBLIC files (food/hero/about images — dev fallback before Cloudinary)
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads'), {
    setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
    },
}));
// ✅ Security: NoSQL Injection Prevention
app.use((0, express_mongo_sanitize_1.default)());
// ─── Application Routes ─────────────────────────────────────
app.use('/api/auth', auth_routes_1.AuthRoutes);
app.use('/api/users/me/favorites', favorites_routes_1.FavoritesRoutes); // ⚠️ /api/users এর আগে (route precedence)
app.use('/api/users', user_routes_1.UserRoutes);
app.use('/api/foods', food_routes_1.FoodRoutes);
app.use('/api/branches', branch_routes_1.BranchRoutes);
app.use('/api/brands', brand_routes_1.BrandRoutes);
app.use('/api/regions', region_routes_1.RegionRoutes);
app.use('/api/coupons', coupon_routes_1.CouponRoutes);
app.use('/api/orders', order_routes_1.OrderRoutes);
app.use('/api/hero-slides', hero_routes_1.HeroRoutes);
app.use('/api/about', about_routes_1.AboutRoutes);
app.use('/api/settings', settings_routes_1.SettingsRoutes);
app.use('/api/policies', policy_routes_1.PolicyRoutes);
app.use('/api/riders', rider_routes_1.RiderRoutes);
app.use('/api/rider-applications', riderApplication_routes_1.RiderApplicationRoutes);
app.use('/api/analytics', analytics_routes_1.AnalyticsRoutes);
app.use('/api/payments', payment_routes_1.PaymentRoutes);
app.use('/api/search', search_routes_1.SearchRoutes);
app.use('/api/images', images_routes_1.ImageRoutes);
app.use('/api/reviews', review_routes_1.ReviewRoutes);
app.use('/api/feedbacks', feedback_routes_1.FeedbackRoutes);
app.use('/api/addons', addon_routes_1.AddonRoutes);
app.use('/api/categories', category_routes_1.CategoryRoutes);
app.use('/api/notifications', notification_routes_1.NotificationRoutes);
// 📚 Interactive Swagger / OpenAPI Documentation
app.use('/api-docs', swagger_routes_1.SwaggerRoutes);
app.use('/api/api-docs', swagger_routes_1.SwaggerRoutes);
// Health check
app.get('/', (req, res) => {
    res.status(200).json({ success: true, message: 'Barcode Restaurant Server is running! 🍽️🚀' });
});
app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, status: 'ok' });
});
// Global error handler
app.use(globalErrorHandler_1.default);
exports.default = app;
