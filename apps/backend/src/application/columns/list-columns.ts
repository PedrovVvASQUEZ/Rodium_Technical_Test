import { Column } from '../../domain/columns/column';
import { ColumnRepository } from './column-repository';

export class ListColumns {
  constructor(private readonly columnRepository: ColumnRepository) {}

  execute(): Promise<readonly Column[]> {
    return this.columnRepository.findAll();
  }
}