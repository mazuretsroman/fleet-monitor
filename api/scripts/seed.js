import bcrypt from 'bcrypt';
import { pool } from '../src/db.js';

const passwordHash = await bcrypt.hash('test123', 10);

await pool.query(
  `insert into users (email, password_hash)
  values ($1, $2)
  on conflict (email) do nothing`,
  ['admin@test.com'],
  passwordHash,
);

await pool.end();
