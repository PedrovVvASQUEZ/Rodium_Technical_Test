import { describe, expect, it } from 'vitest';
import { apiClient } from '../infrastructure/api/api-client';
import { appendContacts, crmService } from './load-crm';
import { vi } from 'vitest';

describe('appendContacts', () => {
  it('concatène les pages sans perdre les contacts existants', () => {
    const contact = (id: string) => ({ id, values: {} });
    expect(appendContacts([contact('1')], { items: [contact('2')], page: 2, pageSize: 1, total: 2, totalPages: 2 })).toEqual([contact('1'), contact('2')]);
  });
});

describe('crmService', () => {
  it('délègue la création et la suppression au client', async () => {
    vi.spyOn(apiClient, 'createContact').mockResolvedValue({ id: '1', values: {} });
    vi.spyOn(apiClient, 'deleteContact').mockResolvedValue();
    await expect(crmService.createContact({ name: 'Ada' })).resolves.toEqual({ id: '1', values: {} });
    await expect(crmService.deleteContact('1')).resolves.toBeUndefined();
    expect(apiClient.createContact).toHaveBeenCalledWith({ name: 'Ada' });
    expect(apiClient.deleteContact).toHaveBeenCalledWith('1');
  });
});