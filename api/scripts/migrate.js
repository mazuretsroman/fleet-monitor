import path from 'node:path';
import { runner } from 'node-pg-migrate';
import { config } from '../src/config.js';

const direction = process.argv[2] === 'down' ? 'down' : 'up'

await runner({
  databaseUrl: config.databaseUrl,
  dir: path.join(import.meta.dirname, '../migrations'),
  direction,
  migrationsTable: 'pgmigrations',
  count: direction === 'down' ? 1 : Infinity, 
});
