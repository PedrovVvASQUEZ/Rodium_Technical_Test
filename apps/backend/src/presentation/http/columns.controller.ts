import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post } from '@nestjs/common';
import { ListColumns } from '../../application/columns/list-columns';
import { CreateColumnUseCase, DeleteColumnUseCase, RenameColumnUseCase, ReorderColumnsUseCase } from '../../application/columns/manage-columns';
import { adaptCreateColumn, adaptRenameColumn, adaptReorderColumns } from './column.dto';
import { CREATE_COLUMN, DELETE_COLUMN, LIST_COLUMNS, RENAME_COLUMN, REORDER_COLUMNS } from './provider-tokens';

@Controller('columns')
export class ColumnsController {
  constructor(
    @Inject(LIST_COLUMNS) private readonly listColumns: ListColumns,
    @Inject(CREATE_COLUMN) private readonly createColumn: CreateColumnUseCase,
    @Inject(RENAME_COLUMN) private readonly renameColumn: RenameColumnUseCase,
    @Inject(DELETE_COLUMN) private readonly deleteColumn: DeleteColumnUseCase,
    @Inject(REORDER_COLUMNS) private readonly reorderColumns: ReorderColumnsUseCase,
  ) {}

  @Get()
  read() {
    return this.listColumns.execute();
  }

  @Post()
  create(@Body() body: unknown) { return this.createColumn.execute(adaptCreateColumn(body) as never); }

  @Patch('reorder')
  reorder(@Body() body: unknown) { return this.reorderColumns.execute(adaptReorderColumns(body) as never); }

  @Patch(':id')
  rename(@Param('id') id: string, @Body() body: unknown) { return this.renameColumn.execute({ id, ...adaptRenameColumn(body) }); }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> { await this.deleteColumn.execute(id); }
}