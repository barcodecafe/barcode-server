import Redis from 'ioredis';
import config from '../config';

let redisClient: Redis | null = null;
let isRedisConnected = false;

if (config.redis_url) {
  try {
    redisClient = new Redis(config.redis_url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) {
          console.warn('⚠️ Redis connection retries exhausted. Disabling cache temporarily.');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      console.log('⚡ Redis Cache Connected Successfully!');
    });

    redisClient.on('error', (err) => {
      isRedisConnected = false;
      console.warn('⚠️ Redis Error (falling back to DB):', err.message);
    });
  } catch (err: any) {
    console.warn('⚠️ Failed to initialize Redis client:', err?.message || err);
    redisClient = null;
    isRedisConnected = false;
  }
} else {
  console.log('ℹ️ No REDIS_URL configured. Caching is disabled (falling back to DB).');
}

/**
 * Get cached data by key
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!redisClient || !isRedisConnected) return null;
  try {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Redis getCache error for key ${key}:`, err);
    return null;
  }
};

/**
 * Set cache key with TTL in seconds (default: 300s = 5 minutes)
 */
export const setCache = async (key: string, data: any, ttlSeconds = 300): Promise<void> => {
  if (!redisClient || !isRedisConnected || data === undefined || data === null) return;
  try {
    const serialized = JSON.stringify(data);
    await redisClient.setex(key, ttlSeconds, serialized);
  } catch (err) {
    console.warn(`Redis setCache error for key ${key}:`, err);
  }
};

/**
 * Invalidate cache key or wildcard pattern (e.g. "foods:*", "branches:*")
 */
export const clearCachePattern = async (pattern: string): Promise<void> => {
  if (!redisClient || !isRedisConnected) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (err) {
    console.warn(`Redis clearCachePattern error for pattern ${pattern}:`, err);
  }
};

export default {
  getCache,
  setCache,
  clearCachePattern,
};
