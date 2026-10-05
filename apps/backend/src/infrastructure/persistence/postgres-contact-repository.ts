import { Pool } from 'pg';
import { type Column, validateContactValue, type ContactValue } from '../../domain/columns/column';
import {
  type ContactRepository,
  type ContactRepositoryQuery,
  type ContactRepositoryResult,
} from '../../domain/contacts/contact-repository';
import { type Contact } from '../../domain/contacts/contact';

type ContactRow = { id: string; values: unknown; total: string };
type StoredValue = { type: string; value: string | number };

const SORT_ASC = `
  SELECT c.id::text AS id,
    COALESCE(jsonb_object_agg(cv.column_id::text,
      CASE cv.value_type
        WHEN 'number' THEN jsonb_build_object('type', cv.value_type, 'value', cv.value_number)
        WHEN 'date' THEN jsonb_build_object('type', cv.value_type, 'value', to_char(cv.value_date, 'YYYY-MM-DD'))
        ELSE jsonb_build_object('type', cv.value_type, 'value', cv.value_text)
      END
    ) FILTER (WHERE cv.column_id IS NOT NULL), '{}'::jsonb) AS values,
    count(*) OVER ()::text AS total
  FROM contacts c LEFT JOIN contact_values cv ON cv.contact_id = c.id
  WHERE ($2::uuid IS NULL OR EXISTS (
    SELECT 1 FROM contact_values fv
    WHERE fv.contact_id = c.id AND fv.column_id = $2::uuid
      AND (($3 = 'contains-insensitive' AND fv.value_type = 'text' AND fv.value_text ILIKE '%' || $4 || '%')
        OR ($3 = 'exact' AND fv.value_type IN ('text', 'phone') AND fv.value_text = $4)
        OR ($3 = 'exact' AND fv.value_type = 'number' AND fv.value_number = $5::numeric)
        OR ($3 = 'exact' AND fv.value_type = 'date' AND fv.value_date = $6::date))
  ))
  GROUP BY c.id
  ORDER BY (SELECT cv_sort.value_number
    FROM contact_values cv_sort
    WHERE cv_sort.contact_id = c.id AND cv_sort.column_id = $1::uuid AND cv_sort.value_type = 'number') ASC NULLS LAST,
    (SELECT CASE cv_sort.value_type
      WHEN 'date' THEN to_char(cv_sort.value_date, 'YYYY-MM-DD')
      WHEN 'number' THEN NULL
      ELSE cv_sort.value_text END
      FROM contact_values cv_sort WHERE cv_sort.contact_id = c.id AND cv_sort.column_id = $1::uuid) ASC NULLS LAST,
    c.id ASC
  LIMIT $7 OFFSET $8`;

const SORT_DESC = SORT_ASC.replaceAll(' ASC NULLS LAST', ' DESC NULLS LAST').replace('c.id ASC', 'c.id DESC');

export class PostgresContactRepository implements ContactRepository {
  private readonly allowedColumns: ReadonlyMap<string, Column>;

  constructor(private readonly pool: Pool, columns: readonly Column[]) {
    this.allowedColumns = new Map(columns.map((column) => [column.id, column]));
  }

  async findMany(query: ContactRepositoryQuery): Promise<ContactRepositoryResult> {
    if (!Number.isSafeInteger(query.page) || query.page < 1) {
      throw new Error('Page must be a positive safe integer');
    }
    if (!Number.isSafeInteger(query.pageSize) || query.pageSize < 1) {
      throw new Error('Page size must be a positive safe integer');
    }
    if (query.sortDirection !== 'asc' && query.sortDirection !== 'desc') {
      throw new Error('Sort direction is invalid');
    }

    const sortColumn = query.sortBy === undefined ? undefined : this.allowedColumns.get(query.sortBy);
    if (query.sortBy !== undefined && !sortColumn) {
      throw new Error(`Unknown sort column: ${query.sortBy}`);
    }
    const filterColumn = query.filterBy === undefined ? undefined : this.allowedColumns.get(query.filterBy);
    if (query.filterBy !== undefined && !filterColumn) {
      throw new Error(`Unknown filter column: ${query.filterBy}`);
    }
    if (query.filterBy !== undefined && query.filterValue === undefined) {
      throw new Error('Filter value is required');
    }
    if (query.filterMode !== undefined && !['contains-insensitive', 'exact'].includes(query.filterMode)) {
      throw new Error('Filter mode is invalid');
    }
    if (filterColumn?.type === 'number' && typeof query.filterValue !== 'number') {
      throw new Error('Number filter must be numeric');
    }
    if (filterColumn && filterColumn.type !== 'number' && typeof query.filterValue !== 'string') {
      throw new Error('Textual filter must be a string');
    }

    const values = [
      sortColumn?.id ?? null,
      filterColumn?.id ?? null,
      query.filterMode ?? null,
      typeof query.filterValue === 'string' ? query.filterValue : null,
      typeof query.filterValue === 'number' ? query.filterValue : null,
      filterColumn?.type === 'date' ? query.filterValue : null,
      query.pageSize,
      (query.page - 1) * query.pageSize,
    ];
    const result = await this.pool.query<ContactRow>(
      query.sortDirection === 'desc' ? SORT_DESC : SORT_ASC,
      values,
    );
    return {
      items: result.rows.map((row) => this.mapContact(row)),
      total: result.rows.length === 0 ? 0 : Number(result.rows[0].total),
    };
  }

  private mapContact(row: ContactRow): Contact {
    const rawValues = (row.values ?? {}) as Record<string, StoredValue>;
    const values: Record<string, ContactValue> = {};
    for (const [columnId, value] of Object.entries(rawValues)) {
      values[columnId] = validateContactValue(value);
    }
    return { id: row.id, values };
  }
}