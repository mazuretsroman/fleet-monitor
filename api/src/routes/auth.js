import bcrypt from 'bcrypt';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Credentials are required.' });
  }

  const { email, password } = parsed.data;

  const { rows } = await pool.query(
    'select id, email, password_hash from users where email = $1',
    [email],
  );
  const user = rows[0];

  const passwordMatches = user
    ? await bcrypt.compare(password, user.password_hash)
    : false;

  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
    },
  );

  res.json({ token });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
