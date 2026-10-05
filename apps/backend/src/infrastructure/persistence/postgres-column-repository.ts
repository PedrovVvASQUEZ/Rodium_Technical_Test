import { Pool } from 'pg';
import { ColumnRepository } from '../../application/columns/column-repository';
import { validateColumn, type Column } from '../../domain/columns/column';

type ColumnRow = { id: string; label: string; type: string };

export class PostgresColumnRepository implements ColumnRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<readonly Column[]> {
    const result = await this.pool.query<ColumnRow>(
      'SELECT id::text, label, type::text FROM columns ORDER BY position ASC, id ASC',
    );
    return result.rows.map((row) => validateColumn(row));
  }
}