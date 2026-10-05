import { Column, ContactValue } from '../../domain/columns/column';
import { Contact } from '../../domain/contacts/contact';
import { ContactRepository } from '../../domain/contacts/contact-repository';
import { findContactColumn, validateValueForColumn } from './contact-validation';

export type CreateContactInput = { values?: Readonly<Record<string, unknown>> };

export class CreateContact {
  constructor(private readonly repository: ContactRepository, private readonly columns: readonly Column[]) {}

  execute(input: CreateContactInput): Promise<Contact> {
    const values: Record<string, ContactValue> = {};
    for (const [columnId, value] of Object.entries(input.values ?? {})) {
      values[columnId] = validateValueForColumn(findContactColumn(this.columns, columnId), value);
    }
    return this.repository.create(values);
  }
}