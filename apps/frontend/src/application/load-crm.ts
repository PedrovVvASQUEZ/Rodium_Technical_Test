import type { Column, ColumnType, Contact, ContactsPage } from '../domain/crm';
import { apiClient } from '../infrastructure/api/api-client';

export type CrmPage = { columns: readonly Column[]; contacts: ContactsPage };
export const crmService = {
  loadFirstPage(pageSize: number): Promise<CrmPage> { return Promise.all([apiClient.getColumns(), apiClient.getContacts(1, pageSize)]).then(([columns, contacts]) => ({ columns, contacts })); },
  loadContacts(page: number, pageSize: number): Promise<ContactsPage> { return apiClient.getContacts(page, pageSize); },
  updateContactValue(contactId: string, columnId: string, type: ColumnType, value: string | number | null): Promise<Contact> { return apiClient.updateContactValue(contactId, columnId, type, value); },
  createContact(values: Readonly<Record<string, string | number>>): Promise<Contact> { return apiClient.createContact(values); },
  deleteContact(contactId: string): Promise<void> { return apiClient.deleteContact(contactId); },
};
export function appendContacts(current: readonly Contact[], page: ContactsPage): readonly Contact[] {
  const contactsById = new Map(current.map((contact) => [contact.id, contact]));
  page.items.forEach((contact) => contactsById.set(contact.id, contact));
  return [...contactsById.values()];
}