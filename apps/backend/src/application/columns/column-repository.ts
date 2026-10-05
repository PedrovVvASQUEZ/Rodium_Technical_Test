import { Column } from '../../domain/columns/column';

export interface ColumnRepository {
  findAll(): Promise<readonly Column[]>;
}