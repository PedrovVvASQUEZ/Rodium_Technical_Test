import { Column, ContactValue } from '../../domain/columns/column';
import { Contact } from '../../domain/contacts/contact';
import {
  ContactRepository,
  ContactRepositoryQuery,
} from '../../domain/contacts/contact-repository';
import { readColumns, type ColumnSource } from '../columns/column-repository';

export type SortDirection = 'asc' | 'desc';

export type ListContactsQueryInput = {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: SortDirection;
  filterBy?: string;
  filterValue?: string;
};

export type ListContactsQuery = ContactRepositoryQuery;

export type ListContactsResult = {
  items: readonly Contact[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export class ListContactsQueryError extends Error {
  readonly code = 'INVALID_QUERY';

  constructor(message: string) {
    super(message);
    this.name = 'ListContactsQueryError';
  }
}

const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 1_000_000;

const isSortDirection = (value: unknown): value is SortDirection =>
  value === 'asc' || value === 'desc';

const findColumn = (columns: readonly Column[], id: string): Column => {
  const column = columns.find((candidate) => candidate.id === id);
  if (!column) {
    throw new ListContactsQueryError(`Unknown column: ${id}`);
  }
  return column;
};

const parseFilterValue = (column: Column, value: string): string | number => {
  if (column.type === 'number') {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || value.trim() === '') {
      throw new ListContactsQueryError('Number filter is invalid');
    }
    return numberValue;
  }

  return value;
};

const isValidDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().startsWith(`${value}T`);
};

export const validateListContactsQuery = (
  input: ListContactsQueryInput,
  columns: readonly Column[],
): ListContactsQuery => {
  if (!Number.isSafeInteger(input.page) || input.page < 1 || input.page > MAX_PAGE) {
    throw new ListContactsQueryError('Page must be a safe integer between 1 and 1000000');
  }

  if (!Number.isSafeInteger(input.pageSize) || input.pageSize < 1 || input.pageSize > MAX_PAGE_SIZE) {
    throw new ListContactsQueryError('Page size must be a safe integer between 1 and 100');
  }

  if (input.sortBy !== undefined) {
    findColumn(columns, input.sortBy);
  }

  if (input.sortDirection !== undefined && !isSortDirection(input.sortDirection)) {
    throw new ListContactsQueryError('Sort direction is invalid');
  }

  if (input.filterBy !== undefined && typeof input.filterBy !== 'string') {
    throw new ListContactsQueryError('Filter column must be a non-empty string');
  }

  if (input.filterBy !== undefined && input.filterBy.trim() === '') {
    throw new ListContactsQueryError('Filter column must be a non-empty string');
  }

  if (input.filterValue !== undefined && typeof input.filterValue !== 'string') {
    throw new ListContactsQueryError('Filter value must be a string');
  }

  if (input.filterBy === undefined && input.filterValue !== undefined) {
    throw new ListContactsQueryError('Filter column is required');
  }

  if (input.filterBy !== undefined && input.filterValue === undefined) {
    throw new ListContactsQueryError('Filter value is required');
  }

  const filterColumn = input.filterBy !== undefined ? findColumn(columns, input.filterBy) : undefined;
  const filterValue =
    filterColumn && input.filterValue !== undefined
      ? parseFilterValue(filterColumn, input.filterValue)
      : undefined;

  if (input.filterBy && filterColumn?.type === 'date' && !isValidDate(input.filterValue!)) {
    throw new ListContactsQueryError('Date filter is invalid');
  }

  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortDirection: input.sortDirection ?? 'asc',
    filterBy: input.filterBy,
    filterValue,
    filterMode: filterColumn?.type === 'text' ? 'contains-insensitive' : filterColumn ? 'exact' : undefined,
  };
};

export class ListContacts {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly columns: ColumnSource,
  ) {}

  async execute(input: ListContactsQueryInput): Promise<ListContactsResult> {
    const columns = await readColumns(this.columns);
    const query = validateListContactsQuery(input, columns);
    const result = await this.contactRepository.findMany(query);

    return {
      items: result.items,
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / query.pageSize),
    };
  }
}

export type { ContactValue };