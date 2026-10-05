import { Column, ContactValue } from '../../domain/columns/column';
import { Contact } from '../../domain/contacts/contact';
import { ContactRepository } from '../../domain/contacts/contact-repository';
import type { ColumnSource } from '../columns/column-repository';
import { findContactColumn, validateValueForColumn } from './contact-validation';

export type CreateContactInput = { values?: Readonly<Record<string, unknown>> };

export class CreateContact {
  constructor(private readonly repository: ContactRepository, private readonly columns: ColumnSource) {}

  execute(input: CreateContactInput): Promise<Contact> {
    const create = (columns: readonly Column[]): Promise<Contact> => {
    const values: Record<string, ContactValue> = {};
    for (const [columnId, value] of Object.entries(input.values ?? {})) {
      values[columnId] = validateValueForColumn(findContactColumn(columns, columnId), value);
    }
    return this.repository.create(values);
    };
    return Array.isArray(this.columns)
      ? create(this.columns as readonly Column[])
      : (this.columns as { findAll(): Promise<readonly Column[]> }).findAll().then((columns) => create(columns));
  }
}