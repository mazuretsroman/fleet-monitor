import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import {
  createRobot,
  listRobots,
  moveRobot,
  RobotNameTakenError,
} from '../services/robots.js';
import {
  clearRobotsCache,
  getCachedRobots,
  setCacheRobots,
} from '../services/robotsCache.js';

const createRobotSchema = z
  .object({
    name: z.string().trim().min(1).max(50),
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),
  })
  .refine((body) => (body.lat === undefined) === (body.lon === undefined));
const robotIdSchema = z.coerce.number().int().positive().max(2147483647);

export const robotsRouter = Router();

robotsRouter.use(requireAuth);

robotsRouter.get('/', async (req, res) => {
  const cached = await getCachedRobots();
  if (cached) {
    return res.set('X-Cache', 'HIT').json({ robots: cached });
  }

  const robots = await listRobots();
  await setCacheRobots(robots);
  res.set('X-Cache', 'MISS').json({ robots });
});

robotsRouter.post('/', async (req, res) => {
  const parsed = createRobotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error:
        'Name (1-50 characters) is required; lat and lon must be given together.',
    });
  }

  try {
    const robot = await createRobot(parsed.data);
    await clearRobotsCache();
    res.status(201).json({ robot });
  } catch (error) {
    if (error instanceof RobotNameTakenError) {
      return res.status(409).json({ error: 'Name is taken.' });
    }
    throw error;
  }
});

robotsRouter.post('/:id/move', async (req, res) => {
  const id = robotIdSchema.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: 'Invalid id.' });
  }

  const robot = await moveRobot(id.data);
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found.' });
  }

  res.json({ robot });
});
