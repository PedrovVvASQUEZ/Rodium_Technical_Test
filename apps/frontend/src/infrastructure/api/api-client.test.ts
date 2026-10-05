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