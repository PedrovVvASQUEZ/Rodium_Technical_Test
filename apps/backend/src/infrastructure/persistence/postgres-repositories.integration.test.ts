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
  let columnsRepository: PostgresColumnRepository;

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
      columnsRepository = new PostgresColumnRepository(pool);
      contacts = new PostgresContactRepository(pool, columnsRepository);
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
    await pool.query(`
      WITH ordered_columns AS (
        SELECT id, row_number() OVER (ORDER BY position ASC, id ASC) - 1 AS next_position
        FROM columns
      )
      UPDATE columns
      SET position = ordered_columns.next_position
      FROM ordered_columns
      WHERE columns.id = ordered_columns.id
    `);
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
    for (const [columnId, value] of updates) {
      const updated = await contacts.updateValue(created.id, columnId, value);
      expect(updated.values[columnId]).toEqual(value);
    }
    const cleared = await contacts.updateValue(created.id, byType('text'), null);
    expect(cleared.values[byType('text')]).toBeUndefined();
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

  it('creates at a dense position, rejects duplicate labels, reorders and cascades values', async () => {
    const inserted = await columnsRepository.create({ label: 'Temporary', type: 'text', position: 1 });
    let columns = await columnsRepository.findAll();
    expect(columns.map((column) => column.position)).toEqual(columns.map((_, index) => index));
    expect(inserted.position).toBe(1);
    await expect(columnsRepository.rename(inserted.id, 'Name')).rejects.toThrow('already exists');

    const reorderedIds = [...columns].reverse().map((column) => column.id);
    await columnsRepository.reorder({ ids: reorderedIds });
    columns = await columnsRepository.findAll();
    expect(columns.map((column) => column.id)).toEqual(reorderedIds);

    const contact = await contacts.create({ [inserted.id]: { type: 'text', value: 'temporary' } });
    await columnsRepository.delete(inserted.id);
    const cascade = await pool.query('SELECT 1 FROM contact_values WHERE contact_id = $1::uuid AND column_id = $2::uuid', [contact.id, inserted.id]);
    expect(cascade.rowCount).toBe(0);
    columns = await columnsRepository.findAll();
    expect(columns.map((column) => column.position)).toEqual(columns.map((_, index) => index));
  });

  it('preserves a dynamic column and dense positions when the seed runs again', async () => {
    const dynamic = await columnsRepository.create({ label: 'Dynamic', type: 'text', position: 1 });
    try {
      const seededNameColumn = (await columnsRepository.findAll()).find((column) => column.label === 'Name')!;
      const seededContact = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      await pool.query(
        `UPDATE contact_values SET value_text = $1
         WHERE contact_id = $2 AND column_id = $3`,
        ['Edited name', seededContact, seededNameColumn.id],
      );
      const beforeSeed = await columnsRepository.findAll();

      await seedDatabase();

      const afterSeed = await columnsRepository.findAll();
      const preservedValue = await pool.query(
        `SELECT value_text FROM contact_values WHERE contact_id = $1 AND column_id = $2`,
        [seededContact, seededNameColumn.id],
      );
      expect(preservedValue.rows[0].value_text).toBe('Edited name');
      expect(afterSeed.find((column) => column.id === dynamic.id)?.position).toBe(dynamic.position);
      expect(afterSeed.map((column) => column.position)).toEqual(afterSeed.map((_, index) => index));
      expect(afterSeed.filter((column) => column.id !== dynamic.id).map((column) => [column.id, column.position])).toEqual(
        beforeSeed.filter((column) => column.id !== dynamic.id).map((column) => [column.id, column.position]),
      );
    } finally {
      await columnsRepository.delete(dynamic.id);
    }
  });

  it('rejects a reorder containing a duplicate UUID in the repository', async () => {
    const columns = await columnsRepository.findAll();
    const duplicateIds = columns.map((column) => column.id);
    duplicateIds[duplicateIds.length - 1] = duplicateIds[0];

    await expect(columnsRepository.reorder({ ids: duplicateIds })).rejects.toThrow(
      'Reorder must contain every existing column exactly once',
    );
    expect((await columnsRepository.findAll()).map((column) => column.position)).toEqual(
      columns.map((column) => column.position),
    );
  });
});