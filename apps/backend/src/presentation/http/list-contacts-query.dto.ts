import { QueryValidationError } from './query-validation.error';

const allowedKeys = new Set(['page', 'pageSize', 'sortBy', 'sortDirection', 'filterBy', 'filterValue']);

type QueryValue = string | string[] | undefined;
export type ListContactsQueryDto = Record<string, QueryValue>;

const readSingle = (query: ListContactsQueryDto, key: string): string | undefined => {
  const value = query[key];
  if (Array.isArray(value)) {
    throw new QueryValidationError(`Query parameter '${key}' must be provided once`);
  }
  return value;
};

const readPositiveInteger = (query: ListContactsQueryDto, key: string, fallback: number): number => {
  const value = readSingle(query, key);
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) {
    throw new QueryValidationError(`Query parameter '${key}' must be a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new QueryValidationError(`Query parameter '${key}' must be a positive integer`);
  }
  return parsed;
};

export type ListContactsQueryInputDto = {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection: 'asc' | 'desc';
  filterBy?: string;
  filterValue?: string;
};

export const adaptListContactsQuery = (query: ListContactsQueryDto): ListContactsQueryInputDto => {
  for (const key of Object.keys(query)) {
    if (!allowedKeys.has(key)) throw new QueryValidationError(`Unknown query parameter '${key}'`);
  }

  const sortDirection = readSingle(query, 'sortDirection');
  if (sortDirection !== undefined && sortDirection !== 'asc' && sortDirection !== 'desc') {
    throw new QueryValidationError("Query parameter 'sortDirection' must be 'asc' or 'desc'");
  }

  return {
    page: readPositiveInteger(query, 'page', 1),
    pageSize: readPositiveInteger(query, 'pageSize', 50),
    sortBy: readSingle(query, 'sortBy'),
    sortDirection: (sortDirection ?? 'asc') as 'asc' | 'desc',
    filterBy: readSingle(query, 'filterBy'),
    filterValue: readSingle(query, 'filterValue'),
  };
};