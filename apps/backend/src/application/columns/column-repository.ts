import { Column, ColumnType } from '../../domain/columns/column';

export type CreateColumn = { label: string; type: ColumnType; position?: number };
export type ReorderColumns = { ids: readonly string[] };
export type ColumnSource = Pick<ColumnRepository, 'findAll'> | readonly Column[];
export const readColumns = (source: ColumnSource): Promise<readonly Column[]> =>
  Array.isArray(source)
    ? Promise.resolve(source as readonly Column[])
    : (source as Pick<ColumnRepository, 'findAll'>).findAll();

export interface ColumnRepository {
  findAll(): Promise<readonly Column[]>;
  create(input: CreateColumn): Promise<Column>;
  rename(id: string, label: string): Promise<Column>;
  delete(id: string): Promise<void>;
  reorder(input: ReorderColumns): Promise<readonly Column[]>;
}