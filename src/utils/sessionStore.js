/**
 * Session store utility for SSO Gateway
 * Provides a more production-ready session store for Vercel serverless environment
 */

const session = require('express-session');

/**
 * Create a session store based on environment
 * In production, we should use a distributed session store like Redis
 * For development and testing, we use the default MemoryStore with a warning
 */
function createSessionStore() {
  // For Vercel serverless environment, we need a more durable session store
  if (process.env.NODE_ENV === 'production') {
    try {
      // Check if we have the redis package available
      let RedisStore;
      try {
        const redis = require('redis');
        RedisStore = require('connect-redis')(session);
        
        // If we have Redis configuration, use it
        if (process.env.REDIS_URL) {
          // Create Redis client with proper configuration for v4
          const redisClient = redis.createClient({
            url: process.env.REDIS_URL,
            legacyMode: true
          });
          
          // Connect to Redis (required in v4)
          (async () => {
            try {
              await redisClient.connect();
              console.log('Redis client connected successfully');
            } catch (err) {
              console.error('Redis connection failed:', err);
            }
          })();
          
          // Handle Redis connection errors
          redisClient.on('error', (err) => {
            console.error('Redis connection error:', err);
          });
          
          console.log('Using Redis session store');
          return new RedisStore({ client: redisClient });
        }
      } catch (err) {
        console.warn('Redis not available, falling back to memory store');
      }
    } catch (err) {
      console.warn('Failed to initialize Redis store:', err);
    }
  }
  
  // Fallback to memory store with warning
  console.warn('Using MemoryStore for sessions. This is not recommended for production.');
  return new session.MemoryStore();
}

module.exports = { createSessionStore };
