import { redis } from '../redis.js';

const KEY = 'robots:all';
const TTL_SECONDS = 10;

// The cache is an optimisation: when Redis is unavailable the API
// keeps working and reads from the database instead.
export async function getCachedRobots() {
  try {
    const cached = await redis.get(KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export async function setCacheRobots(robots) {
  try {
    await redis.set(KEY, JSON.stringify(robots), 'EX', TTL_SECONDS);
  } catch {
    // ignored
  }
}

export async function clearRobotsCache() {
  try {
    await redis.del(KEY);
  } catch {
    // ignored
  }
}
