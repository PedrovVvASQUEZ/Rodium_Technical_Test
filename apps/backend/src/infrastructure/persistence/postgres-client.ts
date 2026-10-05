import { Pool, type PoolConfig } from 'pg';

export const createPostgresPool = (config: PoolConfig = {}): Pool => {
  const connectionString = config.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to connect to PostgreSQL');
  }

  return new Pool({ ...config, connectionString });
};