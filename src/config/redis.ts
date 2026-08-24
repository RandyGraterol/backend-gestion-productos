/**
 * Redis Client Configuration
 * Provides caching layer for the API
 */

import { config } from './env';

// Redis client instance (lazy initialization)
let redisClient: any = null;
let redisConnected = false;

/**
 * Initialize Redis connection
 */
export const initRedis = async (): Promise<void> => {
  if (!config.redis.enabled) {
    console.log('ℹ️  Redis disabled (REDIS_ENABLED=false)');
    return;
  }

  try {
    // Dynamic import to avoid errors when Redis is not installed
    const Redis = require('ioredis');
    
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.error('❌ Redis: Max reconnection attempts reached');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
      redisConnected = true;
    });

    redisClient.on('error', (err: Error) => {
      console.error('❌ Redis error:', err.message);
      redisConnected = false;
    });

    redisClient.on('close', () => {
      console.log('⚠️  Redis connection closed');
      redisConnected = false;
    });

    await redisClient.ping();
  } catch (error) {
    console.error('❌ Redis initialization failed:', error);
    console.warn('⚠️  Running without cache (REDIS_ENABLED=false recommended)');
    redisConnected = false;
  }
};

/**
 * Get Redis client
 */
export const getRedisClient = () => redisClient;

/**
 * Check if Redis is connected
 */
export const isRedisConnected = (): boolean => redisConnected && redisClient !== null;

/**
 * Cache wrapper with TTL
 */
export const cache = {
  /**
   * Get value from cache
   */
  get: async <T>(key: string): Promise<T | null> => {
    if (!isRedisConnected()) return null;
    
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  /**
   * Set value in cache with TTL
   */
  set: async (key: string, value: any, ttlSeconds?: number): Promise<void> => {
    if (!isRedisConnected()) return;
    
    try {
      const ttl = ttlSeconds || config.redis.ttlProducts;
      await redisClient.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  },

  /**
   * Delete value from cache
   */
  del: async (key: string): Promise<void> => {
    if (!isRedisConnected()) return;
    
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error('Cache del error:', error);
    }
  },

  /**
   * Delete all keys matching pattern
   */
  delPattern: async (pattern: string): Promise<void> => {
    if (!isRedisConnected()) return;
    
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      console.error('Cache delPattern error:', error);
    }
  },

  /**
   * Flush all cache
   */
  flush: async (): Promise<void> => {
    if (!isRedisConnected()) return;
    
    try {
      await redisClient.flushdb();
      console.log('🗑️  Redis cache flushed');
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  },
};

/**
 * Cache key generators
 */
export const cacheKeys = {
  dashboardStats: (userId: string) => `dashboard:stats:${userId}`,
  dashboardCategory: (userId: string) => `dashboard:category:${userId}`,
  dashboardMovements: (userId: string) => `dashboard:movements:${userId}`,
  dashboardTopProducts: (userId: string) => `dashboard:top:${userId}`,
  dashboardLowStock: (userId: string) => `dashboard:lowstock:${userId}`,
  products: (userId: string, page: number) => `products:${userId}:${page}`,
  product: (userId: string, id: string) => `product:${userId}:${id}`,
  categories: (userId: string, page: number) => `categories:${userId}:${page}`,
  category: (userId: string, id: string) => `category:${userId}:${id}`,
  stockMovements: (userId: string, page: number) => `stock:${userId}:${page}`,
  exchangeRate: () => `exchange:rate:bcv`,
};

/**
 * Close Redis connection
 */
export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    redisConnected = false;
    console.log('Redis connection closed');
  }
};
