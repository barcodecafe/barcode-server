import dotenv from 'dotenv';
import path from 'path';

// Resolve .env relative to THIS file, not the process working directory.
// process.cwd() depends on how the app was started — pm2 without `cwd`,
// systemd, a Docker WORKDIR mismatch or a one-off shell all silently loaded no
// .env at all, and every value below fell back to its development default. The
// symptom was not an error: JWT verification began failing on every request and
// CORS stopped emitting the production origin, so the dashboard authenticated
// and then showed nothing. __dirname is dist/app/config at runtime and
// src/app/config under ts-node, so walk up to the project root either way.
dotenv.config({ path: path.join(__dirname, '../../../.env') });
// Keep the old location as a fallback so an existing deployment that relies on
// the cwd-relative file does not suddenly lose its configuration.
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Fail fast on missing secrets. Without this the process starts happily and
// then rejects every authenticated request with 403 'Invalid or expired token',
// which looks like an application bug rather than a misconfigured deploy.
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_ACCESS_SECRET'] as const;
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(', ')}. ` +
      'Set them in .env or in the deployment environment before starting the server.',
  );
}

export default {
  node_env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  database_url: process.env.DATABASE_URL,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS || '12',

  // JWT
  jwt: {
    access_secret: process.env.JWT_ACCESS_SECRET as string,
    access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
    refresh_secret: process.env.JWT_REFRESH_SECRET as string,
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Cloudinary
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },

  // SSLCommerz
  sslcommerz: {
    store_id: process.env.SSLCOMMERZ_STORE_ID,
    store_pass: process.env.SSLCOMMERZ_STORE_PASS,
    is_live: process.env.SSLCOMMERZ_IS_LIVE === 'true',
  },

  // How many reverse-proxy hops sit in front of this server. Express uses it to
  // work out the real client IP, which the rate limiter keys anonymous traffic
  // on. Coolify/Traefik alone is one hop (the default). Put Cloudflare — or any
  // other CDN — in front and it becomes two: leave this at 1 and every visitor
  // is bucketed under the CDN's edge IP, i.e. the exact shared-budget problem
  // trust proxy was added to fix.
  //
  // Never set this to 'true'. That trusts a client-supplied X-Forwarded-For, so
  // anyone can forge a fresh rate-limit bucket per request.
  // ⚠️ The empty string must fall through to the default, not be parsed:
  // Number('') is 0, and `trust proxy: 0` silently disables proxy awareness —
  // reinstating the shared-IP rate-limit bucket this setting exists to prevent.
  // A dashboard that creates the variable without a value is an easy mistake.
  trust_proxy:
    process.env.TRUST_PROXY && Number.isFinite(Number(process.env.TRUST_PROXY))
      ? Number(process.env.TRUST_PROXY)
      : 1,

  // Client
  client_url: process.env.CLIENT_URL || 'http://localhost:5173',
  // Public API base — used for gateway callbacks (SSLCommerz IPN/return URLs).
  //
  // ⚠️ This fallback is a trap in production and cost us real money once: when
  // SERVER_URL is unset and CLIENT_URL has no :port (e.g. https://example.com),
  // the regex matches nothing and server_url becomes the FRONTEND origin. The
  // gateway then POSTs its callback into the static site, nginx answers
  // "405 Not Allowed", the server never hears about the payment, and the order
  // sits at paymentStatus 'Pending' forever while the customer has been charged.
  //
  // So this value is now only a last resort: the payment module prefers
  // server_url_explicit, then the origin of the live request (see
  // publicApiBase() in payment.controller.ts).
  server_url:
    process.env.SERVER_URL ||
    (process.env.CLIENT_URL || 'http://localhost:5173').replace(/:\d+$/, ':5001'),
  // Empty unless SERVER_URL was actually configured — lets callers tell a real
  // setting apart from the fallback above.
  server_url_explicit: (process.env.SERVER_URL || '').replace(/\/+$/, ''),
};
