import { createPostgresPool } from '../postgres-client';

const CONTACT_COUNT = 500;
const BATCH_SIZE = 100;
const LEGACY_CONTACTS = [
  ['Aster One', 'Northwind Lab', 82, '2024-01-15'],
  ['Birch Two', 'Cedar Works', 67, '2024-03-02'],
  ['Cobalt Three', 'Northwind Lab', 100, '2024-06-20'],
  ['Dune Four', 'Maple Studio', 74, '2024-09-11'],
] as const;

type SeedColumn = { id: string; type: 'text' | 'number' | 'date' | 'phone'; position: number };

export const seedContactId = (index: number): string =>
  `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;

const valueFor = (column: SeedColumn, index: number): string | number => {
  const legacy = LEGACY_CONTACTS[index - 1];
  if (column.id === '11111111-1111-4111-8111-111111111111' && legacy) return legacy[0];
  if (column.id === '22222222-2222-4222-8222-222222222222' && legacy) return legacy[1];
  if (column.id === '33333333-3333-4333-8333-333333333333' && legacy) return legacy[2];
  if (column.id === '44444444-4444-4444-8444-444444444444' && legacy) return legacy[3];
  if (column.type === 'text') return `Synthetic contact ${index}`;
  if (column.type === 'number') return legacy?.[2] ?? index + 100;
  if (column.type === 'phone') return `+3310000${index.toString().padStart(4, '0')}`;
  return `2025-${String(((index - 1) % 12) + 1).padStart(2, '0')}-${String(((index - 1) % 28) + 1).padStart(2, '0')}`;
};

const insertValues = async (
  client: { query: (text: string, values?: readonly unknown[]) => Promise<unknown> },
  columns: readonly SeedColumn[],
  indexes: readonly number[],
  type: SeedColumn['type'],
): Promise<void> => {
  const typedColumns = columns.filter((column) => column.type === type);
  if (typedColumns.length === 0) return;
  const rows: string[] = [];
  const parameters: unknown[] = [];
  for (const index of indexes) {
    for (const column of typedColumns) {
      const offset = parameters.length;
      const value = valueFor(column, index);
      rows.push(`($${offset + 1}, $${offset + 2}, '${type}', $${offset + 3})`);
      parameters.push(seedContactId(index), column.id, value);
    }
  }
  await client.query(
    `INSERT INTO contact_values (contact_id, column_id, value_type, ${type === 'number' ? 'value_number' : type === 'date' ? 'value_date' : 'value_text'})
     VALUES ${rows.join(', ')}
     ON CONFLICT (contact_id, column_id) DO NOTHING`,
    parameters,
  );
};

export const seedDatabase = async (): Promise<void> => {
  const pool = createPostgresPool();
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<SeedColumn>(
        'SELECT id::text, type::text, position FROM columns ORDER BY position ASC, id ASC',
      );
      const existingColumns = result.rows;
      if (existingColumns.length === 0) {
        throw new Error('Cannot seed contacts because no columns exist');
      }
      for (let start = 1; start <= CONTACT_COUNT; start += BATCH_SIZE) {
        const indexes = Array.from(
          { length: Math.min(BATCH_SIZE, CONTACT_COUNT - start + 1) },
          (_, offset) => start + offset,
        );
        await client.query(
          `INSERT INTO contacts (id) VALUES ${indexes.map((_, index) => `($${index + 1})`).join(', ')}
           ON CONFLICT (id) DO NOTHING`,
          indexes.map(seedContactId),
        );
        for (const type of ['text', 'number', 'date', 'phone'] as const) {
          await insertValues(client, existingColumns, indexes, type);
        }
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  seedDatabase().catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  });
}