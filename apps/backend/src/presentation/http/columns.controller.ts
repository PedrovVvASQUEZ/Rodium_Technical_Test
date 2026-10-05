import { Controller, Get, Inject } from '@nestjs/common';
import { ListColumns } from '../../application/columns/list-columns';
import { LIST_COLUMNS } from './provider-tokens';

@Controller('columns')
export class ColumnsController {
  constructor(@Inject(LIST_COLUMNS) private readonly listColumns: ListColumns) {}

  @Get()
  read() {
    return this.listColumns.execute();
  }
}