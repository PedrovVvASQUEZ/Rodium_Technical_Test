import { describe, expect, it } from 'vitest';
import { adaptListContactsQuery } from './list-contacts-query.dto';

describe('adaptListContactsQuery', () => {
  it('applies the read API defaults', () => {
    expect(adaptListContactsQuery({})).toEqual({ page: 1, pageSize: 50, sortDirection: 'asc' });
  });

  it('rejects unknown and repeated query parameters', () => {
    expect(() => adaptListContactsQuery({ unknown: 'value' })).toThrow("Unknown query parameter 'unknown'");
    expect(() => adaptListContactsQuery({ page: ['1', '2'] })).toThrow('must be provided once');
  });

  it('rejects malformed paging and sort values', () => {
    expect(() => adaptListContactsQuery({ page: '1.5' })).toThrow('positive integer');
    expect(() => adaptListContactsQuery({ pageSize: '0' })).toThrow('positive integer');
    expect(() => adaptListContactsQuery({ sortDirection: 'up' })).toThrow("must be 'asc' or 'desc'");
  });
});