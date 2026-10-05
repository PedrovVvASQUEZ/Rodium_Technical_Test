import { createPostgresPool } from '../postgres-client';

const columns = [
  ['11111111-1111-4111-8111-111111111111', 'Name', 'text', 0],
  ['22222222-2222-4222-8222-222222222222', 'Company', 'text', 1],
  ['33333333-3333-4333-8333-333333333333', 'Score', 'number', 2],
  ['44444444-4444-4444-8444-444444444444', 'Joined', 'date', 3],
] as const;

const contacts = [
  ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Aster One', 'Northwind Lab', 82, '2024-01-15'],
  ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Birch Two', 'Cedar Works', 67, '2024-03-02'],
  ['cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Cobalt Three', 'Northwind Lab', 100, '2024-06-20'],
  ['dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Dune Four', 'Maple Studio', 74, '2024-09-11'],
] as const;

export const seedDatabase = async (): Promise<void> => {
  const pool = createPostgresPool();
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [id, label, type, position] of columns) {
        await client.query(
          'INSERT INTO columns (id, label, type, position) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, type = EXCLUDED.type, position = EXCLUDED.position',
          [id, label, type, position],
        );
      }
      for (const [id, name, company, score, joined] of contacts) {
        await client.query('DELETE FROM contact_values WHERE contact_id = $1', [id]);
        await client.query('INSERT INTO contacts (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [id]);
        await client.query(
          `INSERT INTO contact_values (contact_id, column_id, value_type, value_text)
           VALUES ($1, $2, 'text', $3), ($1, $4, 'text', $5)
           ON CONFLICT (contact_id, column_id) DO UPDATE SET value_type = EXCLUDED.value_type, value_text = EXCLUDED.value_text, value_number = NULL, value_date = NULL`,
          [id, columns[0][0], name, columns[1][0], company],
        );
        await client.query(
          `INSERT INTO contact_values (contact_id, column_id, value_type, value_number)
           VALUES ($1, $2, 'number', $3)
           ON CONFLICT (contact_id, column_id) DO UPDATE SET value_type = EXCLUDED.value_type, value_number = EXCLUDED.value_number, value_text = NULL, value_date = NULL`,
          [id, columns[2][0], score],
        );
        await client.query(
          `INSERT INTO contact_values (contact_id, column_id, value_type, value_date)
           VALUES ($1, $2, 'date', $3)
           ON CONFLICT (contact_id, column_id) DO UPDATE SET value_type = EXCLUDED.value_type, value_date = EXCLUDED.value_date, value_text = NULL, value_number = NULL`,
          [id, columns[3][0], joined],
        );
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