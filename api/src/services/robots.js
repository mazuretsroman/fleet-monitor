import { pool } from '../db.js';

const ROBOT_COLUMNS = 'id, name, status, lat, lon, updated_at';
const DEFAULT_CENTER = { lat: 51.3397, lon: 12.3731 };
const DEFAULT_SPREAD = 0.02;
const UNIQUE_VIOLATION = '23505';

export class RobotNameTakenError extends Error {}

function randomAround(value, spread) {
  return value + (Math.random() * 2 - 1) * spread;
}

export async function listRobots() {
  const { rows } = await pool.query(
    `select ${ROBOT_COLUMNS} from robots order by id`,
  );
  return rows;
}

export async function createRobot({ name, lat, lon }) {
  const position = {
    lat: lat ?? randomAround(DEFAULT_CENTER.lat, DEFAULT_SPREAD),
    lon: lon ?? randomAround(DEFAULT_CENTER.lon, DEFAULT_SPREAD),
  };

  const client = await pool.connect();
  try {
    await client.query('begin');

    const { rows } = await client.query(
      `insert into robots (name, lat, lon)
      values ($1, $2, $3)
      returning ${ROBOT_COLUMNS}`,
      [name, position.lat, position.lon],
    );
    const robot = rows[0];

    await client.query(
      'insert into robot_positions (robot_id, lat, lon) values ($1, $2, $3)',
      [robot.id, robot.lat, robot.lon],
    );

    await client.query('commit');
    return robot;
  } catch (error) {
    await client.query('rollback');
    if (error.code === UNIQUE_VIOLATION) {
      throw new RobotNameTakenError();
    }
    throw error;
  } finally {
    client.release();
  }
}
