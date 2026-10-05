import { describe, expect, it, vi } from 'vitest';
import { Column } from '../../domain/columns/column';
import { ListContacts, validateListContactsQuery } from './list-contacts';

const columns: readonly Column[] = [
  { id: 'name', label: 'Name', type: 'text' },
  { id: 'age', label: 'Age', type: 'number' },
  { id: 'birthday', label: 'Birthday', type: 'date' },
];

describe('validateListContactsQuery', () => {
  it('validates bounds, known columns and typed filters', () => {
    expect(
      validateListContactsQuery(
        {
          page: 2,
          pageSize: 25,
          sortBy: 'name',
          sortDirection: 'desc',
          filterBy: 'age',
          filterValue: '42',
        },
        columns,
      ),
    ).toEqual({
      page: 2,
      pageSize: 25,
      sortBy: 'name',
      sortDirection: 'desc',
      filterBy: 'age',
      filterValue: 42,
      filterMode: 'exact',
    });
  });

  it('rejects invalid bounds and unknown columns', () => {
    expect(() => validateListContactsQuery({ page: 0, pageSize: 10 }, columns)).toThrow();
    expect(() => validateListContactsQuery({ page: 1_000_001, pageSize: 10 }, columns)).toThrow();
    expect(() => validateListContactsQuery({ page: Number.MAX_SAFE_INTEGER, pageSize: 100 }, columns)).toThrow();
    expect(() => validateListContactsQuery({ page: Number.MAX_SAFE_INTEGER + 1, pageSize: 10 }, columns)).toThrow();
    expect(() => validateListContactsQuery({ page: 1, pageSize: 101 }, columns)).toThrow();
    expect(() => validateListContactsQuery({ page: 1, pageSize: Number.MAX_SAFE_INTEGER }, columns)).toThrow();
    expect(() => validateListContactsQuery({ page: 1, pageSize: 10, sortBy: 'missing' }, columns)).toThrow();
    expect(() => validateListContactsQuery({ page: 1, pageSize: 10, sortDirection: 'sideways' as 'asc' }, columns)).toThrow();
    expect(() => validateListContactsQuery({ page: 1, pageSize: 10, filterBy: 'birthday', filterValue: '2026-99-40' }, columns)).toThrow();
  });

  it('rejects invalid filter fields at runtime', () => {
    expect(() => validateListContactsQuery({ page: 1, pageSize: 10, filterBy: '' }, columns)).toThrow(
      'Filter column must be a non-empty string',
    );
    expect(() => validateListContactsQuery({ page: 1, pageSize: 10, filterBy: '   ' }, columns)).toThrow(
      'Filter column must be a non-empty string',
    );
    expect(() => validateListContactsQuery({ page: 1, pageSize: 10, filterBy: 42 as unknown as string }, columns)).toThrow(
      'Filter column must be a non-empty string',
    );
    expect(() => validateListContactsQuery({ page: 1, pageSize: 10, filterBy: 'age', filterValue: 42 as unknown as string }, columns)).toThrow(
      'Filter value must be a string',
    );
  });
});

describe('ListContacts', () => {
  it('maps repository results to a paginated result', async () => {
    const findMany = vi.fn().mockResolvedValue({
      items: [{ id: 'contact-1', values: {} }],
      total: 51,
    });
    const listContacts = new ListContacts({ findMany }, columns);

    await expect(
      listContacts.execute({ page: 2, pageSize: 25, filterBy: 'name', filterValue: 'ali' }),
    ).resolves.toEqual({
      items: [{ id: 'contact-1', values: {} }],
      page: 2,
      pageSize: 25,
      total: 51,
      totalPages: 3,
    });
    expect(findMany).toHaveBeenCalledWith({
      page: 2,
      pageSize: 25,
      sortBy: undefined,
      sortDirection: 'asc',
      filterBy: 'name',
      filterValue: 'ali',
      filterMode: 'contains-insensitive',
    });
  });
});