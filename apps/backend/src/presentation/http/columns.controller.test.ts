import { describe, expect, it, vi } from 'vitest';
import { ColumnsController } from './columns.controller';

describe('ColumnsController', () => {
  it('adapts column CRUD and reorder requests', async () => {
    const list = { execute: vi.fn().mockResolvedValue([]) };
    const create = { execute: vi.fn().mockResolvedValue({ id: 'id' }) };
    const rename = { execute: vi.fn().mockResolvedValue({ id: 'id' }) };
    const remove = { execute: vi.fn().mockResolvedValue(undefined) };
    const reorder = { execute: vi.fn().mockResolvedValue([]) };
    const controller = new ColumnsController(list as never, create as never, rename as never, remove as never, reorder as never);

    await controller.create({ label: ' Name ', type: 'text' });
    await controller.rename('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', { label: 'New' });
    await controller.reorder({ ids: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'] });
    await expect(controller.remove('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).resolves.toBeUndefined();
    expect(create.execute).toHaveBeenCalledWith({ label: ' Name ', type: 'text', position: undefined });
    expect(rename.execute).toHaveBeenCalledWith({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', label: 'New' });
    expect(reorder.execute).toHaveBeenCalledWith({ ids: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'] });
    expect(remove.execute).toHaveBeenCalledWith('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  });

  it('rejects unsupported request properties before use cases', () => {
    const controller = new ColumnsController({ execute: vi.fn() } as never, { execute: vi.fn() } as never, { execute: vi.fn() } as never, { execute: vi.fn() } as never, { execute: vi.fn() } as never);
    expect(() => controller.rename('id', { label: 'x', type: 'text' })).toThrow('Unknown body property');
  });
});
