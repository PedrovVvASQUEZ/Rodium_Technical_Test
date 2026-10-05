import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createPostgresPool } from '../postgres-client';

export const migrateDatabase = async (): Promise<void> => {
  const pool = createPostgresPool();
  try {
    const migration = await readFile(resolve(__dirname, '../../../../migrations/001_initial.sql'), 'utf8');
    await pool.query(migration);
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  migrateDatabase().catch((error: unknown) => {
    console.error('Database migration failed:', error);
    process.exitCode = 1;
  });
}