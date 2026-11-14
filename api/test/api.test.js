import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, beforeEach, describe, test } from 'node:test';
import bcrypt from 'bcrypt';
import { app } from '../src/app.js';
import { config } from '../src/config.js';
import { pool } from '../src/db.js';
import { redis, subscriber } from '../src/redis.js';
import { clearRobotsCache } from '../src/services/robotsCache.js';

const EMAIL = 'admin@test.com';
const PASSWORD = 'test123';
const MOVE_STEP = 0.001;

// The suite truncates tables: never let it touch a real database.
// Checked at load time, so nothing runs if the check fails
if (!config.databaseUrl.endsWith('_test')) {
  throw new Error('Refusing to run tests: DATABASE_URL must end in _test.');
}

let server;
let baseUrl;
let token;

async function request(method, path, { body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return {
    status: response.status,
    cache: response.headers.get('x-cache'),
    body: await response.json(),
  };
}

before(async () => import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, beforeEach, describe, test } from 'node:test';
import bcrypt from 'bcrypt';
import { app } from '../src/app.js';
import { config } from '../src/config.js';
import { pool } from '../src/db.js';
import { redis, subscriber } from '../src/redis.js';
import { clearRobotsCache } from '../src/services/robotsCache.js';

const EMAIL = 'admin@test.com';
const PASSWORD = 'test123';
const MOVE_STEP = 0.001;

// The suite truncates tables: never let it touch a real database.
// Checked at load time, so nothing runs if the check fails
if (!config.databaseUrl.endsWith('_test')) {
  throw new Error('Refusing to run tests: DATABASE_URL must end in _test.');
}

let server;
let baseUrl;
let token;

async function request(method, path, { body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return {
    status: response.status,
    cache: response.headers.get('x-cache'),
    body: await response.json(),
  };
}

before(async () => {
  await pool.query('truncate users, robots restart identity cascade');
  await pool.query('insert into users (email, password_hash) values ($1, $2)', [
    EMAIL,
    await bcrypt.hash(PASSWORD, 4),
  ]);

  // Port 0: the OS picks a free port
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://localhost:${server.address().port}`;

  const login = await request('POST', '/auth/login', {
    body: { email: EMAIL, password: PASSWORD },
  });
  token = login.body.token;
});

beforeEach(async () => {
  await pool.query('truncate robots restart identity cascade');
  await clearRobotsCache();
});

after(async () => {
  server.close();
  await pool.end();
  await redis.quit();
  await subscriber.quit();
});

describe('POST /auth/login', () => {
  test('returns a token that opens protected routes', async () => {
    const login = await request('POST', '/auth/login', {
      body: { email: EMAIL, password: PASSWORD },
      auth: false,
    });
    assert.equal(login.status, 200);
    assert.equal(typeof login.body.token, 'string');

    const me = await request('GET', '/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, EMAIL);
  });

  test('rejects a wrong password with 401', async () => {
    const response = await request('POST', '/auth/login', {
      body: { email: EMAIL, password: 'wrong' },
      auth: false,
    });
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: 'Invalid credentials.' });
  });

  test('rejects a missing password with 400', async () => {
    const response = await request('POST', '/auth/login', {
      body: { email: EMAIL },
      auth: false,
    });
    assert.equal(response.status, 400);
  });
});

describe('GET /robots', () => {
  test('requires a token', async () => {
    const response = await request('GET', '/robots', { auth: false });
    assert.equal(response.status, 401);
  });

  test('serves the second request from the cache', async () => {
    const first = await request('GET', '/robots');
    const second = await request('GET', '/robots');

    assert.equal(first.status, 200);
    assert.deepEqual(first.body, { robots: [] });
    assert.equal(first.cache, 'MISS');
    assert.equal(second.cache, 'HIT');
    assert.deepEqual(second.body, first.body);
  });
});

describe('POST /robots', () => {
  test('creates a robot and invalidates the cached list', async () => {
    await request('GET', '/robots'); // warm the cache

    const created = await request('POST', '/robots', {
      body: { name: 'Alpha', lat: 51.34, lon: 12.37 },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.robot.name, 'Alpha');
    assert.equal(created.body.robot.status, 'idle');

    const list = await request('GET', '/robots');
    assert.equal(list.cache, 'MISS');
    assert.deepEqual(list.body.robots, [created.body.robot]);
  });

  test('rejects a duplicate name with 409', async () => {
    await request('POST', '/robots', { body: { name: 'Alpha' } });
    const duplicate = await request('POST', '/robots', {
      body: { name: 'Alpha' },
    });
    assert.equal(duplicate.status, 409);
  });

  test('rejects lat without lon with 400', async () => {
    const response = await request('POST', '/robots', {
      body: { name: 'Alpha', lat: 51.34 },
    });
    assert.equal(response.status, 400);
  });
});

describe('POST /robots/:id/move', () => {
  test('moves the robot by at most one step and records history', async () => {
    const { body } = await request('POST', '/robots', {
      body: { name: 'Alpha', lat: 51.34, lon: 12.37 },
    });

    const moved = await request('POST', `/robots/${body.robot.id}/move`);
    assert.equal(moved.status, 200);
    assert.equal(moved.body.robot.status, 'moving');
    assert.ok(Math.abs(moved.body.robot.lat - 51.34) <= MOVE_STEP);
    assert.ok(Math.abs(moved.body.robot.lon - 12.37) <= MOVE_STEP);

    // One row from creation, one from the move
    const history = await pool.query(
      'select count(*)::int as count from robot_positions where robot_id = $1',
      [body.robot.id],
    );
    assert.equal(history.rows[0].count, 2);
  });

  test('returns 404 for an unknown robot', async () => {
    const response = await request('POST', '/robots/999/move');
    assert.equal(response.status, 404);
  });

  test('returns 400 for an invalid id', async () => {
    const response = await request('POST', '/robots/abc/move');
    assert.equal(response.status, 400);
  });
});{
  await pool.query('truncate users, robots restart identity cascade');
  await pool.query('insert into users (email, password_hash) values ($1, $2)', [
    EMAIL,
    await bcrypt.hash(PASSWORD, 4),
  ]);

  // Port 0: the OS picks a free port
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://localhost:${server.address().port}`;

  const login = await request('POST', '/auth/login', {
    body: { email: EMAIL, password: PASSWORD },
  });
  token = login.body.token;
});

beforeEach(async () => {
  await pool.query('truncate robots restart identity cascade');
  await clearRobotsCache();
});

after(async () => {
  server.close();
  await pool.end();
  await redis.quit();
  await subscriber.quit();
});

describe('POST /auth/login', () => {
  test('returns a token that opens protected routes', async () => {
    const login = await request('POST', '/auth/login', {
      body: { email: EMAIL, password: PASSWORD },
      auth: false,
    });
    assert.equal(login.status, 200);
    assert.equal(typeof login.body.token, 'string');

    const me = await request('GET', '/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, EMAIL);
  });

  test('rejects a wrong password with 401', async () => {
    const response = await request('POST', '/auth/login', {
      body: { email: EMAIL, password: 'wrong' },
      auth: false,
    });
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: 'Invalid credentials.' });
  });

  test('rejects a missing password with 400', async () => {
    const response = await request('POST', '/auth/login', {
      body: { email: EMAIL },
      auth: false,
    });
    assert.equal(response.status, 400);
  });
});

describe('GET /robots', () => {
  test('requires a token', async () => {
    const response = await request('GET', '/robots', { auth: false });
    assert.equal(response.status, 401);
  });

  test('serves the second request from the cache', async () => {
    const first = await request('GET', '/robots');
    const second = await request('GET', '/robots');

    assert.equal(first.status, 200);
    assert.deepEqual(first.body, { robots: [] });
    assert.equal(first.cache, 'MISS');
    assert.equal(second.cache, 'HIT');
    assert.deepEqual(second.body, first.body);
  });
});

describe('POST /robots', () => {
  test('creates a robot and invalidates the cached list', async () => {
    await request('GET', '/robots'); // warm the cache

    const created = await request('POST', '/robots', {
      body: { name: 'Alpha', lat: 51.34, lon: 12.37 },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.robot.name, 'Alpha');
    assert.equal(created.body.robot.status, 'idle');

    const list = await request('GET', '/robots');
    assert.equal(list.cache, 'MISS');
    assert.deepEqual(list.body.robots, [created.body.robot]);
  });

  test('rejects a duplicate name with 409', async () => {
    await request('POST', '/robots', { body: { name: 'Alpha' } });
    const duplicate = await request('POST', '/robots', {
      body: { name: 'Alpha' },
    });
    assert.equal(duplicate.status, 409);
  });

  test('rejects lat without lon with 400', async () => {
    const response = await request('POST', '/robots', {
      body: { name: 'Alpha', lat: 51.34 },
    });
    assert.equal(response.status, 400);
  });
});

describe('POST /robots/:id/move', () => {
  test('moves the robot by at most one step and records history', async () => {
    const { body } = await request('POST', '/robots', {
      body: { name: 'Alpha', lat: 51.34, lon: 12.37 },
    });

    const moved = await request('POST', `/robots/${body.robot.id}/move`);
    assert.equal(moved.status, 200);
    assert.equal(moved.body.robot.status, 'moving');
    assert.ok(Math.abs(moved.body.robot.lat - 51.34) <= MOVE_STEP);
    assert.ok(Math.abs(moved.body.robot.lon - 12.37) <= MOVE_STEP);

    // One row from creation, one from the move
    const history = await pool.query(
      'select count(*)::int as count from robot_positions where robot_id = $1',
      [body.robot.id],
    );
    assert.equal(history.rows[0].count, 2);
  });

  test('returns 404 for an unknown robot', async () => {
    const response = await request('POST', '/robots/999/move');
    assert.equal(response.status, 404);
  });

  test('returns 400 for an invalid id', async () => {
    const response = await request('POST', '/robots/abc/move');
    assert.equal(response.status, 400);
  });
});
