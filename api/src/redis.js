import Redis from 'ioredis';
import { config } from './config.js';

function logError(error) {
  console.error('Redis error:', error.message || error.code);
}

export const redis = new Redis(config.redisUrl, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
});

redis.on('error', logError);

export const subscriber = new Redis(config.redisUrl);
subscriber.on('error', logError);
