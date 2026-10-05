import { describe, expect, it, vi } from 'vitest';
import { ContactsController } from './contacts.controller';

describe('ContactsController', () => {
  it('adapts the query before invoking the use case', async () => {
    const execute = vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 50, total: 0, totalPages: 0 });
    const controller = new ContactsController({ execute } as never);

    await expect(controller.read({ sortBy: 'name', sortDirection: 'desc' })).resolves.toEqual({
      items: [], page: 1, pageSize: 50, total: 0, totalPages: 0,
    });
    expect(execute).toHaveBeenCalledWith({
      page: 1, pageSize: 50, sortBy: 'name', sortDirection: 'desc',
      filterBy: undefined, filterValue: undefined,
    });
  });

  it('does not invoke the use case for an unknown query parameter', () => {
    const execute = vi.fn();
    const controller = new ContactsController({ execute } as never);

    expect(() => controller.read({ unexpected: 'value' })).toThrow("Unknown query parameter 'unexpected'");
    expect(execute).not.toHaveBeenCalled();
  });
});