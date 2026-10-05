import { Column } from '../../domain/columns/column';
import { Contact } from '../../domain/contacts/contact';
import { ContactRepository } from '../../domain/contacts/contact-repository';
import { findContactColumn, validateContactId, validateValueForColumn } from './contact-validation';

export type UpdateContactValueInput = { contactId: string; columnId: string; value: unknown };

export class UpdateContactValue {
  constructor(private readonly repository: ContactRepository, private readonly columns: readonly Column[]) {}

  execute(input: UpdateContactValueInput): Promise<Contact> {
    validateContactId(input.contactId);
    const column = findContactColumn(this.columns, input.columnId);
    const value = input.value === null ? null : validateValueForColumn(column, input.value);
    return this.repository.updateValue(input.contactId, column.id, value);
  }
}