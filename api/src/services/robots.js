import { pool } from '../db.js';

const ROBOT_COLUMNS = 'id, name, status, lat, lon, updated_at';
const DEFAULT_CENTER = { lat: 51.3397, lon: 12.3731 };
const DEFAULT_SPREAD = 0.02;
const UNIQUE_VIOLATION = '23505';
const MOVE_STEP = 0.001;

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

export async function moveRobot(id) {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const current = await client.query(
      'select lat, lon from robots where id = $1 for update',
      [id],
    );
    if (current.rows.length === 0) {
      await client.query('rollback');
      return null;
    }

    const lat = randomAround(current.rows[0].lat, MOVE_STEP);
    const lon = randomAround(current.rows[0].lon, MOVE_STEP);

    const { rows } = await client.query(
      `update robots
      set lat = $2, lon = $3, status = 'moving', updated_at = now()
      where id = $1
      returning ${ROBOT_COLUMNS}`,
      [id, lat, lon],
    );

    await client.query(
      'insert into robot_positions (robot_id, lat, lon) values ($1, $2, $3)',
      [id, lat, lon],
    );

    await client.query('commit');
    return rows[0];
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
