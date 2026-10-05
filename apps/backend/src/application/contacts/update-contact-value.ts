import { Column } from '../../domain/columns/column';
import { Contact } from '../../domain/contacts/contact';
import { ContactRepository } from '../../domain/contacts/contact-repository';
import type { ColumnSource } from '../columns/column-repository';
import { findContactColumn, validateContactId, validateValueForColumn } from './contact-validation';

export type UpdateContactValueInput = { contactId: string; columnId: string; value: unknown };

export class UpdateContactValue {
  constructor(private readonly repository: ContactRepository, private readonly columns: ColumnSource) {}

  execute(input: UpdateContactValueInput): Promise<Contact> {
    validateContactId(input.contactId);
    const update = (columns: readonly Column[]): Promise<Contact> => {
      const column = findContactColumn(columns, input.columnId);
      const value = input.value === null ? null : validateValueForColumn(column, input.value);
      return this.repository.updateValue(input.contactId, column.id, value);
    };
    return Array.isArray(this.columns)
      ? update(this.columns as readonly Column[])
      : (this.columns as { findAll(): Promise<readonly Column[]> }).findAll().then((columns) => update(columns));
  }
}