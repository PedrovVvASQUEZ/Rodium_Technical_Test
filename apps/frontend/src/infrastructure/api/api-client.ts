import { validateColumn, validateColumns, validateContact, validateContactsPage, type Column, type ColumnType, type Contact, type ContactsPage, type CreateColumnInput } from '../../domain/crm';

export class ApiError extends Error {
  constructor(message: string, readonly kind: 'network' | 'http' | 'contract', readonly status?: number) { super(message); this.name = 'ApiError'; }
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

async function get(path: string): Promise<unknown> {
  let response: Response;
  try { response = await fetch(`${apiBaseUrl}${path}`); } catch { throw new ApiError('Le serveur est inaccessible.', 'network'); }
  if (!response.ok) throw new ApiError(`La requête a échoué (${response.status}).`, 'http', response.status);
  try { return await response.json(); } catch { throw new ApiError('La réponse du serveur est invalide.', 'contract'); }
}

async function patch(path: string, body: unknown): Promise<unknown> {
  let response: Response;
  try { response = await fetch(`${apiBaseUrl}${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch { throw new ApiError('Le serveur est inaccessible.', 'network'); }
  if (!response.ok) throw new ApiError(`La requête a échoué (${response.status}).`, 'http', response.status);
  try { return await response.json(); } catch { throw new ApiError('La réponse du serveur est invalide.', 'contract'); }
}

async function post(path: string, body: unknown): Promise<unknown> {
  let response: Response;
  try { response = await fetch(`${apiBaseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch { throw new ApiError('Le serveur est inaccessible.', 'network'); }
  if (!response.ok) throw new ApiError(`La requête a échoué (${response.status}).`, 'http', response.status);
  try { return await response.json(); } catch { throw new ApiError('La réponse du serveur est invalide.', 'contract'); }
}

async function remove(path: string): Promise<void> {
  let response: Response;
  try { response = await fetch(`${apiBaseUrl}${path}`, { method: 'DELETE' }); } catch { throw new ApiError('Le serveur est inaccessible.', 'network'); }
  if (response.status !== 204) throw new ApiError(`La requête a échoué (${response.status}).`, 'http', response.status);
}

export const apiClient = {
  async getColumns(): Promise<readonly Column[]> {
    try { return validateColumns(await get('/columns')); } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError('Le contrat des colonnes est invalide.', 'contract'); }
  },
  async getContacts(page: number, pageSize: number): Promise<ContactsPage> {
    try {
      const response = validateContactsPage(await get(`/contacts?page=${page}&pageSize=${pageSize}`));
      if (response.page !== page) throw new Error('Contacts response page does not match the requested page');
      return response;
    } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError('Le contrat des contacts est invalide.', 'contract'); }
  },
  async updateContactValue(contactId: string, columnId: string, type: ColumnType, value: string | number | null): Promise<Contact> {
    try {
      const response = validateContactsPage({ items: [await patch(`/contacts/${encodeURIComponent(contactId)}`, { columnId, value: value === null ? null : { type, value } })], page: 1, pageSize: 1, total: 1, totalPages: 1 });
      return response.items[0];
    } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError('Le contrat du contact est invalide.', 'contract'); }
  },
  async createContact(values: Readonly<Record<string, string | number>>): Promise<Contact> {
    try { return validateContact(await post('/contacts', { values })); }
    catch (error) { if (error instanceof ApiError) throw error; throw new ApiError('Le contrat du contact est invalide.', 'contract'); }
  },
  async deleteContact(contactId: string): Promise<void> {
    await remove(`/contacts/${encodeURIComponent(contactId)}`);
  },
  async createColumn(input: CreateColumnInput): Promise<Column> {
    try { return validateColumn(await post('/columns', input)); }
    catch (error) { if (error instanceof ApiError) throw error; throw new ApiError('Le contrat de la colonne est invalide.', 'contract'); }
  },
  async renameColumn(columnId: string, label: string): Promise<Column> {
    try { return validateColumn(await patch(`/columns/${encodeURIComponent(columnId)}`, { label })); }
    catch (error) { if (error instanceof ApiError) throw error; throw new ApiError('Le contrat de la colonne est invalide.', 'contract'); }
  },
  async deleteColumn(columnId: string): Promise<void> {
    await remove(`/columns/${encodeURIComponent(columnId)}`);
  },
  async reorderColumns(ids: readonly string[]): Promise<readonly Column[]> {
    try { return validateColumns(await patch('/columns/reorder', { ids })); }
    catch (error) { if (error instanceof ApiError) throw error; throw new ApiError('Le contrat des colonnes est invalide.', 'contract'); }
  },
};