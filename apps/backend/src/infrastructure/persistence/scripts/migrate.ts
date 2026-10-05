import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createPostgresPool } from '../postgres-client';

const migrationFilePattern = /^(\d+)_.*\.sql$/;

export const sortMigrationFiles = (files: string[]): string[] => {
  const migrations = files.map((file) => {
    const match = migrationFilePattern.exec(file);
    if (!match) throw new Error(`Invalid migration filename: ${file}`);
    const version = Number(match[1]);
    if (!Number.isSafeInteger(version)) throw new Error(`Migration version is too large: ${file}`);
    return { file, version };
  });

  const versions = new Set<number>();
  for (const migration of migrations) {
    if (versions.has(migration.version)) {
      throw new Error(`Ambiguous migration version: ${migration.version}`);
    }
    versions.add(migration.version);
  }

  return migrations.sort((left, right) => left.version - right.version).map(({ file }) => file);
};

export const migrateDatabase = async (): Promise<void> => {
  const pool = createPostgresPool();
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const migrationsDirectory = resolve(__dirname, '../../../../migrations');
    const files = sortMigrationFiles((await readdir(migrationsDirectory)).filter((file) => migrationFilePattern.test(file)));
    for (const file of files) {
      const version = String(Number(migrationFilePattern.exec(file)![1]));
      const applied = await pool.query(
        "SELECT 1 FROM schema_migrations WHERE version = $1 OR (version ~ '^[0-9]+$' AND version::numeric = $1::numeric)",
        [version],
      );
      if (applied.rowCount !== 0) continue;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(await readFile(resolve(migrationsDirectory, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }
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