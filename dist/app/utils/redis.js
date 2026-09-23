"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCachePattern = exports.setCache = exports.getCache = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = __importDefault(require("../config"));
let redisClient = null;
let isRedisConnected = false;
if (config_1.default.redis_url) {
    try {
        redisClient = new ioredis_1.default(config_1.default.redis_url, {
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
    }
    catch (err) {
        console.warn('⚠️ Failed to initialize Redis client:', (err === null || err === void 0 ? void 0 : err.message) || err);
        redisClient = null;
        isRedisConnected = false;
    }
}
else {
    console.log('ℹ️ No REDIS_URL configured. Caching is disabled (falling back to DB).');
}
/**
 * Get cached data by key
 */
const getCache = (key) => __awaiter(void 0, void 0, void 0, function* () {
    if (!redisClient || !isRedisConnected)
        return null;
    try {
        const raw = yield redisClient.get(key);
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    catch (err) {
        console.warn(`Redis getCache error for key ${key}:`, err);
        return null;
    }
});
exports.getCache = getCache;
/**
 * Set cache key with TTL in seconds (default: 300s = 5 minutes)
 */
const setCache = (key_1, data_1, ...args_1) => __awaiter(void 0, [key_1, data_1, ...args_1], void 0, function* (key, data, ttlSeconds = 300) {
    if (!redisClient || !isRedisConnected || data === undefined || data === null)
        return;
    try {
        const serialized = JSON.stringify(data);
        yield redisClient.setex(key, ttlSeconds, serialized);
    }
    catch (err) {
        console.warn(`Redis setCache error for key ${key}:`, err);
    }
});
exports.setCache = setCache;
/**
 * Invalidate cache key or wildcard pattern (e.g. "foods:*", "branches:*")
 */
const clearCachePattern = (pattern) => __awaiter(void 0, void 0, void 0, function* () {
    if (!redisClient || !isRedisConnected)
        return;
    try {
        const keys = yield redisClient.keys(pattern);
        if (keys.length > 0) {
            yield redisClient.del(...keys);
        }
    }
    catch (err) {
        console.warn(`Redis clearCachePattern error for pattern ${pattern}:`, err);
    }
});
exports.clearCachePattern = clearCachePattern;
exports.default = {
    getCache: exports.getCache,
    setCache: exports.setCache,
    clearCachePattern: exports.clearCachePattern,
};
