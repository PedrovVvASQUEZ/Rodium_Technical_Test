import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { seedDatabase } from './scripts/seed';
import { migrateDatabase } from './scripts/migrate';
import { createPostgresPool } from './postgres-client';
import { PostgresColumnRepository } from './postgres-column-repository';
import { PostgresContactRepository } from './postgres-contact-repository';

describe('PostgreSQL repositories', () => {
  let pool: Pool;
  let contacts: PostgresContactRepository;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for PostgreSQL integration tests');
    }

    const check = createPostgresPool();
    try {
      await check.query('SELECT 1');
      await migrateDatabase();
      pool = createPostgresPool();
      await pool.query(
        `INSERT INTO columns (id, label, type, position)
         VALUES ('55555555-5555-4555-8555-555555555555', 'Phone', 'phone', 4)
         ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, type = EXCLUDED.type, position = EXCLUDED.position`,
      );
      const columns = await new PostgresColumnRepository(pool).findAll();
      contacts = new PostgresContactRepository(pool, columns);
    } catch (error) {
      throw new Error(
        `PostgreSQL integration tests require an accessible DATABASE_URL (${String(error)})`,
      );
    } finally {
      await check.end();
    }
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM contact_values');
    await pool.query('DELETE FROM contacts');
    await seedDatabase();
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('returns paginated contacts with a total and typed filter', async () => {
    const columns = await new PostgresColumnRepository(pool).findAll();
    const score = columns.find((column) => column.label === 'Score');
    expect(score).toBeDefined();

    const result = await contacts.findMany({
      page: 1,
      pageSize: 2,
      sortBy: score!.id,
      sortDirection: 'desc',
      filterBy: score!.id,
      filterValue: 82,
      filterMode: 'exact',
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].values[score!.id]).toEqual({ type: 'number', value: 82 });
  });

  it('rejects a column identifier outside the whitelist before querying', async () => {
    await expect(
      contacts.findMany({
        page: 1,
        pageSize: 10,
        sortBy: "score' DESC; DROP TABLE contacts; --",
        sortDirection: 'asc',
      }),
    ).rejects.toThrow('Unknown sort column');
  });

  it('sorts number columns numerically', async () => {
    const columns = await new PostgresColumnRepository(pool).findAll();
    const score = columns.find((column) => column.label === 'Score');
    expect(score).toBeDefined();

    const result = await contacts.findMany({
      page: 1,
      pageSize: 4,
      sortBy: score!.id,
      sortDirection: 'asc',
    });

    expect(result.items.map((item) => item.values[score!.id])).toEqual([
      { type: 'number', value: 67 },
      { type: 'number', value: 74 },
      { type: 'number', value: 82 },
      { type: 'number', value: 100 },
    ]);
  });

  it('filters date columns exactly', async () => {
    const columns = await new PostgresColumnRepository(pool).findAll();
    const joined = columns.find((column) => column.label === 'Joined');
    expect(joined).toBeDefined();

    const result = await contacts.findMany({
      page: 1,
      pageSize: 10,
      filterBy: joined!.id,
      filterValue: '2024-06-20',
      filterMode: 'exact',
      sortDirection: 'asc',
    });

    expect(result.total).toBe(1);
    expect(result.items[0].values[joined!.id]).toEqual({ type: 'date', value: '2024-06-20' });
  });

  it('creates contacts and updates text, number, date, phone and null values', async () => {
    const created = await contacts.create({});
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    const columns = await new PostgresColumnRepository(pool).findAll();
    const byType = (type: string) => columns.find((column) => column.type === type)!.id;
    const updates = [
      [byType('text'), { type: 'text', value: 'Updated' }],
      [byType('number'), { type: 'number', value: 12.5 }],
      [byType('date'), { type: 'date', value: '2025-02-03' }],
      [byType('phone'), { type: 'phone', value: '+33123456789' }],
    ] as const;
    for (const [columnId, value] of updates) await contacts.updateValue(created.id, columnId, value);
    await contacts.updateValue(created.id, byType('text'), null);
    const result = await contacts.findMany({ page: 1, pageSize: 10, sortDirection: 'asc' });
    const updated = result.items.find((item) => item.id === created.id)!;
    expect(updated.values[byType('text')]).toBeUndefined();
    expect(updated.values[byType('number')]).toEqual({ type: 'number', value: 12.5 });
    expect(updated.values[byType('date')]).toEqual({ type: 'date', value: '2025-02-03' });
    expect(updated.values[byType('phone')]).toEqual({ type: 'phone', value: '+33123456789' });
  });

  it('deletes contacts and reports absent contacts', async () => {
    const created = await contacts.create({});
    await contacts.deleteById(created.id);
    await expect(contacts.deleteById(created.id)).rejects.toThrow('Contact not found');
    await expect(contacts.updateValue('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '55555555-5555-4555-8555-555555555555', null)).rejects.toThrow('Contact not found');
  });
});