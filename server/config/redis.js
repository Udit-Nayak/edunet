const Redis = require('ioredis');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true, // Don't connect immediately
});

// Connect to Redis
redisClient.connect().catch((err) => {
  console.error('❌ Redis Connection Error:', err.message);
  console.log('⚠️  Running without Redis cache');
});

redisClient.on('connect', () => {
  console.log('✅ Redis Connected');
});

redisClient.on('ready', () => {
  console.log('🔴 Redis Ready');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Error:', err.message);
});

redisClient.on('close', () => {
  console.log('⚠️  Redis Connection Closed');
});

module.exports = redisClient;