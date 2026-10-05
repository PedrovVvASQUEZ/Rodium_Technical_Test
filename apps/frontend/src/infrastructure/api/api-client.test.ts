import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiClient } from './api-client';

afterEach(() => vi.restoreAllMocks());

describe('apiClient', () => {
  it('charge et valide les colonnes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 'name', label: 'Nom', type: 'text' }]), { status: 200 })));
    await expect(apiClient.getColumns()).resolves.toEqual([{ id: 'name', label: 'Nom', type: 'text' }]);
  });

  it('normalise les erreurs HTTP et de contrat', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    await expect(apiClient.getContacts(1, 50)).rejects.toMatchObject({ kind: 'http', status: 503 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"items": []}', { status: 200 })));
    await expect(apiClient.getContacts(1, 50)).rejects.toBeInstanceOf(ApiError);
  });

  it('rejette une page valide qui ne correspond pas a la page demandee', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [], page: 2, pageSize: 50, total: 100, totalPages: 2 }), { status: 200 })));
    await expect(apiClient.getContacts(1, 50)).rejects.toMatchObject({ kind: 'contract' });
  });

  it('envoie le payload PATCH type par la colonne et valide le contact retourne', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ id: 'c-1', values: {} }), { status: 200 })));
    vi.stubGlobal('fetch', fetch);
    await expect(apiClient.updateContactValue('c-1', 'name', 'text', 'Grace')).resolves.toEqual({ id: 'c-1', values: {} });
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/contacts/c-1', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ columnId: 'name', value: { type: 'text', value: 'Grace' } }) });
    await apiClient.updateContactValue('c-1', 'name', 'text', null);
    expect(fetch).toHaveBeenLastCalledWith('http://localhost:3000/contacts/c-1', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ columnId: 'name', value: null }) });
  });

  it('rejette un contact PATCH invalide', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'c-1', values: { score: { type: 'number', value: 'bad' } } }), { status: 200 })));
    await expect(apiClient.updateContactValue('c-1', 'score', 'number', 4)).rejects.toMatchObject({ kind: 'contract' });
  });

  it.each([
    { page: 0, pageSize: 50, total: 1, totalPages: 1 },
    { page: 1, pageSize: 0, total: 1, totalPages: 1 },
    { page: 1, pageSize: 50, total: -1, totalPages: 0 },
    { page: 1, pageSize: 50, total: 51, totalPages: 1 },
    { page: 3, pageSize: 50, total: 51, totalPages: 2 },
  ])('rejette une pagination incoherente: $page/$pageSize/$total/$totalPages', async (pagination) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [], ...pagination }), { status: 200 })));
    await expect(apiClient.getContacts(pagination.page, pagination.pageSize)).rejects.toMatchObject({ kind: 'contract' });
  });
});