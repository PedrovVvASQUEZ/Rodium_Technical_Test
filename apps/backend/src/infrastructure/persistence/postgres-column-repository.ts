import { Pool, type PoolClient } from 'pg';
import { ColumnConflictError, ColumnNotFoundError, InvalidColumnError } from '../../domain/columns/column-errors';
import type { ColumnRepository, CreateColumn, ReorderColumns } from '../../application/columns/column-repository';
import { validateColumn, type Column } from '../../domain/columns/column';

type ColumnRow = { id: string; label: string; type: string; position: number };
const SELECT_COLUMNS = 'SELECT id::text, label, type::text, position FROM columns ORDER BY position ASC, id ASC';

export class PostgresColumnRepository implements ColumnRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<readonly Column[]> {
    const result = await this.pool.query<ColumnRow>(
      SELECT_COLUMNS,
    );
    return result.rows.map((row) => validateColumn(row));
  }

  async create(input: CreateColumn): Promise<Column> {
    return this.transaction(async (client) => {
      const locked = await client.query<ColumnRow>(`${SELECT_COLUMNS} FOR UPDATE`);
      const currentCount = locked.rows.length;
      const position = input.position ?? currentCount;
      if (position > currentCount) throw new InvalidColumnError('Column position is outside the current range');
      await client.query('UPDATE columns SET position = position + 1 WHERE position >= $1', [position]);
      try {
        const result = await client.query<ColumnRow>('INSERT INTO columns (id, label, type, position) VALUES (uuid_generate_v4(), $1, $2, $3) RETURNING id::text, label, type::text, position', [input.label, input.type, position]);
        return validateColumn(result.rows[0]);
      } catch (error) { throw this.mapDatabaseError(error, 'Column label already exists'); }
    });
  }

  async rename(id: string, label: string): Promise<Column> {
    try {
      const result = await this.pool.query<ColumnRow>('UPDATE columns SET label = $2 WHERE id = $1::uuid RETURNING id::text, label, type::text, position', [id, label]);
      if (result.rowCount !== 1) throw new ColumnNotFoundError(id);
      return validateColumn(result.rows[0]);
    } catch (error) { throw this.mapDatabaseError(error, 'Column label already exists'); }
  }

  async delete(id: string): Promise<void> {
    await this.transaction(async (client) => {
      const result = await client.query<{ position: number }>('DELETE FROM columns WHERE id = $1::uuid RETURNING position', [id]);
      if (result.rowCount !== 1) throw new ColumnNotFoundError(id);
      await client.query('UPDATE columns SET position = position - 1 WHERE position > $1', [result.rows[0].position]);
    });
  }

  async reorder(input: ReorderColumns): Promise<readonly Column[]> {
    return this.transaction(async (client) => {
      const current = await client.query<ColumnRow>(`${SELECT_COLUMNS} FOR UPDATE`);
      const currentIds = new Set(current.rows.map((row) => row.id));
      const requestedIds = new Set(input.ids);
      if (requestedIds.size !== input.ids.length || requestedIds.size !== currentIds.size || input.ids.some((id) => !currentIds.has(id))) throw new InvalidColumnError('Reorder must contain every existing column exactly once');
      await client.query('UPDATE columns SET position = position + $1', [current.rows.length]);
      for (const [position, id] of input.ids.entries()) await client.query('UPDATE columns SET position = $1 WHERE id = $2::uuid', [position, id]);
      const result = await client.query<ColumnRow>(SELECT_COLUMNS);
      return result.rows.map((row) => validateColumn(row));
    });
  }

  private async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  private mapDatabaseError(error: unknown, duplicateMessage: string): Error {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') return new ColumnConflictError(duplicateMessage);
    return error instanceof Error ? error : new Error(String(error));
  }
}