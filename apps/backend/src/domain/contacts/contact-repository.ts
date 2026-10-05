import { Contact } from './contact';

export type ContactRepositoryQuery = {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection: 'asc' | 'desc';
  filterBy?: string;
  filterValue?: string | number;
  filterMode?: 'contains-insensitive' | 'exact';
};

export type ContactRepositoryResult = {
  items: readonly Contact[];
  total: number;
};

export interface ContactRepository {
  findMany(query: ContactRepositoryQuery): Promise<ContactRepositoryResult>;
  create(values: Readonly<Record<string, import('../columns/column').ContactValue>>): Promise<import('./contact').Contact>;
  updateValue(contactId: string, columnId: string, value: import('../columns/column').ContactValue | null): Promise<void>;
  deleteById(contactId: string): Promise<void>;
}