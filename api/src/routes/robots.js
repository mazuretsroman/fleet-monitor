import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import {
  createRobot,
  listRobots,
  RobotNameTakenError,
} from '../services/robots.js';

const createRobotSchema = z
  .object({
    name: z.string().trim().min(1).max(50),
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),
  })
  .refine((body) => (body.lat === undefined) === (body.lon === undefined));

export const robotsRouter = Router();

robotsRouter.use(requireAuth);

robotsRouter.get('/', async (req, res) => {
  const robots = await listRobots();
  res.json({ robots });
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
    res.status(201).json({ robot });
  } catch (error) {
    if (error instanceof RobotNameTakenError) {
      return res.status(409).json({ error: 'Name is taken.' });
    }
    throw error;
  }
});
