import { validateColumns, validateContactsPage, type Column, type ContactsPage } from '../../domain/crm';

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
};