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

  it('délègue les mutations de colonnes', async () => {
    vi.spyOn(apiClient, 'createColumn').mockResolvedValue({ id: 'c1', label: 'Pays', type: 'text' });
    vi.spyOn(apiClient, 'renameColumn').mockResolvedValue({ id: 'c1', label: 'Région', type: 'text' });
    vi.spyOn(apiClient, 'deleteColumn').mockResolvedValue();
    vi.spyOn(apiClient, 'reorderColumns').mockResolvedValue([{ id: 'c1', label: 'Région', type: 'text' }]);
    await expect(crmService.createColumn({ label: 'Pays', type: 'text' })).resolves.toMatchObject({ id: 'c1' });
    await expect(crmService.renameColumn('c1', 'Région')).resolves.toMatchObject({ label: 'Région' });
    await expect(crmService.deleteColumn('c1')).resolves.toBeUndefined();
    await expect(crmService.reorderColumns(['c1'])).resolves.toHaveLength(1);
  });
});