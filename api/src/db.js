import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

pool.on('error', (error) => {
  console.error('Postgress pool error.', error.message);
});
