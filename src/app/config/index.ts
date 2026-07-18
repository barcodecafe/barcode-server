import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

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

  // Client
  client_url: process.env.CLIENT_URL || 'http://localhost:5173',
  // Public API base — used for gateway callbacks (SSLCommerz IPN). In production
  // set SERVER_URL to the real API origin (e.g. https://barcoderestaurantgroup.com);
  // in dev it falls back to the client host on the API port (:5001).
  server_url:
    process.env.SERVER_URL ||
    (process.env.CLIENT_URL || 'http://localhost:5173').replace(/:\d+$/, ':5001'),
};
