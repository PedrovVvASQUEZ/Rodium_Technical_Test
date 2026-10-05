import type { ColumnRepository, CreateColumn, ReorderColumns } from './column-repository';
import { validateColumnId, validateLabel, validatePosition, validateReorderIds, validateType } from './column-validation';

export class CreateColumnUseCase {
  constructor(private readonly repository: ColumnRepository) {}
  execute(input: CreateColumn): ReturnType<ColumnRepository['create']> { return this.repository.create({ label: validateLabel(input.label), type: validateType(input.type), position: validatePosition(input.position) }); }
}
export class RenameColumnUseCase {
  constructor(private readonly repository: ColumnRepository) {}
  execute(input: { id: string; label: string }): ReturnType<ColumnRepository['rename']> { return this.repository.rename(validateColumnId(input.id), validateLabel(input.label)); }
}
export class DeleteColumnUseCase {
  constructor(private readonly repository: ColumnRepository) {}
  execute(id: string): ReturnType<ColumnRepository['delete']> { return this.repository.delete(validateColumnId(id)); }
}
export class ReorderColumnsUseCase {
  constructor(private readonly repository: ColumnRepository) {}
  execute(input: ReorderColumns): ReturnType<ColumnRepository['reorder']> { return this.repository.reorder({ ids: validateReorderIds(input.ids) }); }
}