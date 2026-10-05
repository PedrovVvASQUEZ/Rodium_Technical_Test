import { describe, expect, it, vi } from 'vitest';
import { CreateColumnUseCase, DeleteColumnUseCase, RenameColumnUseCase, ReorderColumnsUseCase } from './manage-columns';

describe('column use cases', () => {
  const repository = {
    create: vi.fn().mockResolvedValue({ id: 'id', label: 'Name', type: 'text', position: 0 }),
    rename: vi.fn().mockResolvedValue({ id: 'id', label: 'Renamed', type: 'text', position: 0 }),
    delete: vi.fn().mockResolvedValue(undefined),
    reorder: vi.fn().mockResolvedValue([]),
    findAll: vi.fn(),
  };

  it('trims and validates labels and preserves omitted position', async () => {
    await new CreateColumnUseCase(repository).execute({ label: '  Name  ', type: 'text' });
    expect(repository.create).toHaveBeenCalledWith({ label: 'Name', type: 'text', position: undefined });
    expect(() => new CreateColumnUseCase(repository).execute({ label: ' ', type: 'text' })).toThrow('1-120');
    expect(() => new CreateColumnUseCase(repository).execute({ label: 'Name', type: 'email' as never })).toThrow('invalid');
  });

  it('only renames labels and validates complete reorder ids', async () => {
    await new RenameColumnUseCase(repository).execute({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', label: ' New ' });
    expect(repository.rename).toHaveBeenCalledWith('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'New');
    await new ReorderColumnsUseCase(repository).execute({ ids: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'] });
    expect(repository.reorder).toHaveBeenCalledWith({ ids: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'] });
    expect(() => new ReorderColumnsUseCase(repository).execute({ ids: ['bad', 'bad'] })).toThrow('valid UUID');
    expect(() => new DeleteColumnUseCase(repository).execute('bad')).toThrow('valid UUID');
  });
});
