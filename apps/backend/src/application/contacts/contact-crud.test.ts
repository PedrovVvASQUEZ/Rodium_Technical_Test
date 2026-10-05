import { describe, expect, it, vi } from 'vitest';
import { Column } from '../../domain/columns/column';
import { ContactNotFoundError, InvalidContactInputError } from '../../domain/contacts/contact-errors';
import { CreateContact } from './create-contact';
import { DeleteContact } from './delete-contact';
import { UpdateContactValue } from './update-contact-value';

const columns: readonly Column[] = [
  { id: 'name', label: 'Name', type: 'text' },
  { id: 'score', label: 'Score', type: 'number' },
  { id: 'joined', label: 'Joined', type: 'date' },
];

const repository = () => ({
  findMany: vi.fn(),
  create: vi.fn().mockResolvedValue({ id: 'contact', values: {} }),
  updateValue: vi.fn(),
  deleteById: vi.fn(),
});

describe('contact CRUD use cases', () => {
  it('validates column and value types before creating', async () => {
    const repo = repository();
    const create = new CreateContact(repo, columns);
    await create.execute({ values: { name: { type: 'text', value: 'Ada' } } });
    expect(repo.create).toHaveBeenCalledWith({ name: { type: 'text', value: 'Ada' } });
    expect(() => create.execute({ values: { score: { type: 'text', value: '42' } } })).toThrow(InvalidContactInputError);
    expect(() => create.execute({ values: { unknown: { type: 'text', value: 'x' } } })).toThrow(InvalidContactInputError);
  });

  it('validates UUID and preserves null as a cell deletion', async () => {
    const repo = repository();
    const update = new UpdateContactValue(repo, columns);
    const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await update.execute({ contactId: id, columnId: 'name', value: null });
    expect(repo.updateValue).toHaveBeenCalledWith(id, 'name', null);
    expect(() => update.execute({ contactId: 'bad', columnId: 'name', value: null })).toThrow(InvalidContactInputError);
    expect(() => update.execute({ contactId: id, columnId: 'joined', value: { type: 'date', value: '2024-99-99' } })).toThrow(InvalidContactInputError);
  });

  it('validates UUID before deleting and propagates not found errors', async () => {
    const repo = repository();
    repo.deleteById.mockRejectedValue(new ContactNotFoundError('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'));
    const remove = new DeleteContact(repo);
    await expect(remove.execute('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).rejects.toBeInstanceOf(ContactNotFoundError);
    expect(() => remove.execute('bad')).toThrow(InvalidContactInputError);
  });
});