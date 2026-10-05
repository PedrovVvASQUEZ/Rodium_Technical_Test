import { describe, expect, it, vi } from 'vitest';
import { ContactsController } from './contacts.controller';

describe('ContactsController', () => {
  it('adapts the query before invoking the use case', async () => {
    const execute = vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 50, total: 0, totalPages: 0 });
    const controller = new ContactsController(
      { execute } as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
    );

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
    const controller = new ContactsController(
      { execute } as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
    );

    expect(() => controller.read({ unexpected: 'value' })).toThrow("Unknown query parameter 'unexpected'");
    expect(execute).not.toHaveBeenCalled();
  });

  it('adapts create, update and delete requests', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'contact', values: {} });
    const update = vi.fn().mockResolvedValue({ id: 'id', values: { name: { type: 'text', value: 'Ada' } } });
    const remove = vi.fn().mockResolvedValue(undefined);
    const controller = new ContactsController(
      { execute: vi.fn() } as never,
      { execute: create } as never,
      { execute: update } as never,
      { execute: remove } as never,
    );

    await expect(controller.create({ values: {} })).resolves.toEqual({ id: 'contact', values: {} });
    await expect(controller.update('id', { columnId: 'name', value: null })).resolves.toEqual({
      id: 'id', values: { name: { type: 'text', value: 'Ada' } },
    });
    await controller.delete('id');
    expect(create).toHaveBeenCalledWith({ values: {} });
    expect(update).toHaveBeenCalledWith({ contactId: 'id', columnId: 'name', value: null });
    expect(remove).toHaveBeenCalledWith('id');
  });
});