import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ListContacts, ListContactsResult } from '../../application/contacts/list-contacts';
import { LIST_CONTACTS } from './provider-tokens';
import { adaptListContactsQuery, ListContactsQueryDto } from './list-contacts-query.dto';

@Controller('contacts')
export class ContactsController {
  constructor(@Inject(LIST_CONTACTS) private readonly listContacts: ListContacts) {}

  @Get()
  read(@Query() query: ListContactsQueryDto): Promise<ListContactsResult> {
    return this.listContacts.execute(adaptListContactsQuery(query));
  }
}