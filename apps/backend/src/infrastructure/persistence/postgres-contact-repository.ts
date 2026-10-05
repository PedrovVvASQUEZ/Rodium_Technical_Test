import { Pool, type PoolClient } from 'pg';
import { type Column, validateContactValue, type ContactValue } from '../../domain/columns/column';
import { ContactNotFoundError, InvalidContactInputError } from '../../domain/contacts/contact-errors';
import {
  type ContactRepository,
  type ContactRepositoryQuery,
  type ContactRepositoryResult,
} from '../../domain/contacts/contact-repository';
import { type Contact } from '../../domain/contacts/contact';
import { readColumns, type ColumnSource } from '../../application/columns/column-repository';

type ContactRow = { id: string; values: unknown; total: string };
type StoredValue = { type: string; value: string | number };

const CONTACT_BY_ID = `
  SELECT c.id::text AS id,
    COALESCE(jsonb_object_agg(cv.column_id::text,
      CASE cv.value_type
        WHEN 'number' THEN jsonb_build_object('type', cv.value_type, 'value', cv.value_number)
        WHEN 'date' THEN jsonb_build_object('type', cv.value_type, 'value', to_char(cv.value_date, 'YYYY-MM-DD'))
        ELSE jsonb_build_object('type', cv.value_type, 'value', cv.value_text)
      END
    ) FILTER (WHERE cv.column_id IS NOT NULL), '{}'::jsonb) AS values,
    '1' AS total
  FROM contacts c LEFT JOIN contact_values cv ON cv.contact_id = c.id
  WHERE c.id = $1::uuid
  GROUP BY c.id`;

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
  constructor(private readonly pool: Pool, private readonly columnSource: ColumnSource) {}

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

    const columns = await readColumns(this.columnSource);
    const allowedColumns = new Map(columns.map((column) => [column.id, column]));
    const sortColumn = query.sortBy === undefined ? undefined : allowedColumns.get(query.sortBy);
    if (query.sortBy !== undefined && !sortColumn) {
      throw new Error(`Unknown sort column: ${query.sortBy}`);
    }
    const filterColumn = query.filterBy === undefined ? undefined : allowedColumns.get(query.filterBy);
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

  async create(values: Readonly<Record<string, ContactValue>>): Promise<Contact> {
    const columns = await readColumns(this.columnSource);
    const allowedColumns = new Map(columns.map((column) => [column.id, column]));
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<{ id: string }>('INSERT INTO contacts DEFAULT VALUES RETURNING id::text AS id');
      const id = result.rows[0].id;
      for (const [columnId, value] of Object.entries(values)) {
        const column = allowedColumns.get(columnId);
        if (!column) throw new InvalidContactInputError(`Unknown column: ${columnId}`);
        if (column.type !== value.type) throw new InvalidContactInputError(`Value type does not match column '${columnId}'`);
        await this.insertValue(client, id, column, value);
      }
      await client.query('COMMIT');
      return { id, values };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateValue(contactId: string, columnId: string, value: ContactValue | null): Promise<Contact> {
    const columns = await readColumns(this.columnSource);
    const column = columns.find((candidate) => candidate.id === columnId);
    if (!column) throw new InvalidContactInputError(`Unknown column: ${columnId}`);
    if (value !== null && column.type !== value.type) {
      throw new InvalidContactInputError(`Value type does not match column '${columnId}'`);
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const contact = await client.query('SELECT id FROM contacts WHERE id = $1::uuid FOR UPDATE', [contactId]);
      if (contact.rowCount !== 1) throw new ContactNotFoundError(contactId);
      if (value === null) {
        await client.query('DELETE FROM contact_values WHERE contact_id = $1::uuid AND column_id = $2::uuid', [contactId, columnId]);
      } else {
        await this.insertValue(client, contactId, column, value);
      }
      const updated = await client.query<ContactRow>(CONTACT_BY_ID, [contactId]);
      const mappedContact = this.mapContact(updated.rows[0]);
      await client.query('COMMIT');
      return mappedContact;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteById(contactId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('DELETE FROM contacts WHERE id = $1::uuid', [contactId]);
      if (result.rowCount !== 1) throw new ContactNotFoundError(contactId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private insertValue(client: PoolClient, contactId: string, column: Column, value: ContactValue): Promise<unknown> {
    if (value.type === 'number') {
      return client.query(
        `INSERT INTO contact_values (contact_id, column_id, value_type, value_number)
         VALUES ($1::uuid, $2::uuid, 'number', $3)
         ON CONFLICT (contact_id, column_id) DO UPDATE SET value_type = EXCLUDED.value_type, value_number = EXCLUDED.value_number, value_text = NULL, value_date = NULL`,
        [contactId, column.id, value.value],
      );
    }
    if (value.type === 'date') {
      return client.query(
        `INSERT INTO contact_values (contact_id, column_id, value_type, value_date)
         VALUES ($1::uuid, $2::uuid, 'date', $3::date)
         ON CONFLICT (contact_id, column_id) DO UPDATE SET value_type = EXCLUDED.value_type, value_date = EXCLUDED.value_date, value_text = NULL, value_number = NULL`,
        [contactId, column.id, value.value],
      );
    }
    return client.query(
      `INSERT INTO contact_values (contact_id, column_id, value_type, value_text)
       VALUES ($1::uuid, $2::uuid, $3::column_type, $4)
       ON CONFLICT (contact_id, column_id) DO UPDATE SET value_type = EXCLUDED.value_type, value_text = EXCLUDED.value_text, value_number = NULL, value_date = NULL`,
      [contactId, column.id, value.type, value.value],
    );
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