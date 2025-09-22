const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

/**
 * Initialize Redis connection for session storage
 */
const initializeRedis = async () => {
  if (!process.env.REDIS_URL) {
    logger.info('Redis URL not provided, skipping Redis initialization');
    return null;
  }

  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis server connection refused');
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          logger.error('Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          logger.error('Redis connection attempts exceeded');
          return undefined;
        }
        // Reconnect after
        return Math.min(options.attempt * 100, 3000);
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('end', () => {
      logger.info('Redis client disconnected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    return null;
  }
};

/**
 * Get Redis client instance
 */
const getRedisClient = () => {
  return redisClient;
};

/**
 * Close Redis connection
 */
const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
};

/**
 * Session store configuration for Redis
 */
const getSessionStore = () => {
  if (!redisClient) {
    return null;
  }

  const RedisStore = require('connect-redis').default;
  return new RedisStore({
    client: redisClient,
    prefix: 'sso-gateway:sess:',
    ttl: 24 * 60 * 60, // 24 hours
  });
};

module.exports = {
  initializeRedis,
  getRedisClient,
  closeRedis,
  getSessionStore,
};
