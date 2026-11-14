import path from 'node:path';
import { runner } from 'node-pg-migrate';
import pg from 'pg';
import { config } from '../src/config.js';

const url = new URL(config.databaseUrl);
const database = url.pathname.sclice(1);

if (!database.endsWith('_test')) {
  throw new Error(`Refusing to prepare "${database}": not a test database.`);
}

url.pathname = '/postgres';
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
const { rows } = await client.query(
  'select 1 from pg_database where datname = $1',
  [database]
);
if (rows.length === 0) {
  await client.query(`create databse ${database}`);
}
await client.end();

await runner({
  databaseUrl: config.databaseUrl,
  dir: path.join(import.meta.dirname, '../migrations'),
  direction: 'up',
  migrationsTable: 'pgmigrations',
  log: () => {},
});
