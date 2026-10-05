import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { Contact } from '../../domain/contacts/contact';
import { CreateContact } from '../../application/contacts/create-contact';
import { DeleteContact } from '../../application/contacts/delete-contact';
import { ListContacts, ListContactsResult } from '../../application/contacts/list-contacts';
import { UpdateContactValue } from '../../application/contacts/update-contact-value';
import { adaptCreateContact, adaptUpdateContactValue } from './contact.dto';
import { CREATE_CONTACT, DELETE_CONTACT, LIST_CONTACTS, UPDATE_CONTACT_VALUE } from './provider-tokens';
import { adaptListContactsQuery, ListContactsQueryDto } from './list-contacts-query.dto';

@Controller('contacts')
export class ContactsController {
  constructor(
    @Inject(LIST_CONTACTS) private readonly listContacts: ListContacts,
    @Inject(CREATE_CONTACT) private readonly createContact: CreateContact,
    @Inject(UPDATE_CONTACT_VALUE) private readonly updateContactValue: UpdateContactValue,
    @Inject(DELETE_CONTACT) private readonly deleteContact: DeleteContact,
  ) {}

  @Get()
  read(@Query() query: ListContactsQueryDto): Promise<ListContactsResult> {
    return this.listContacts.execute(adaptListContactsQuery(query));
  }

  @Post()
  create(@Body() body: unknown) {
    return this.createContact.execute(adaptCreateContact(body));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown): Promise<Contact> {
    const input = adaptUpdateContactValue(body);
    return this.updateContactValue.execute({ contactId: id, ...input });
  }

  @Delete(':id')
  delete(@Param('id') id: string): Promise<void> {
    return this.deleteContact.execute(id);
  }
}