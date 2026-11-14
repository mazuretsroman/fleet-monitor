import bcrypt from 'bcrypt';
import { pool } from '../src/db.js';
import { createRobot, RobotNameTakenError } from '../src/services/robots.js';

const passwordHash = await bcrypt.hash('test123', 10);

const ROBOTS = [
  { name: 'Robot Alpha', lat: 51.3397, lon: 12.3731 },
  { name: 'Robot Beta', lat: 51.3455, lon: 12.3602 },
  { name: 'Robot Gamma', lat: 51.3321, lon: 12.3894 },
];

await pool.query(
  `insert into users (email, password_hash)
  values ($1, $2)
  on conflict (email) do nothing`,
  ['admin@test.com', passwordHash],
);

for (const robot of ROBOTS) {
  try {
    await createRobot(robot);
  } catch (error) {
    if (!(error instanceof RobotNameTakenError)) {
      throw error;
    }
  }
}

await pool.end();
