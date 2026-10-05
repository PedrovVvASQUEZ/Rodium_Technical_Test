import { describe, expect, it, vi } from 'vitest';
import { PostgresContactRepository } from './postgres-contact-repository';

describe('PostgresContactRepository.updateValue', () => {
  it('rolls back when the reloaded contact cannot be mapped', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'contact' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 'contact', values: { name: { type: 'text', value: 42 } }, total: '1' }],
        })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn().mockResolvedValue(client) };
    const repository = new PostgresContactRepository(pool as never, [
      { id: 'name', label: 'Name', type: 'text' },
    ]);

    await expect(
      repository.updateValue(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'name',
        { type: 'text', value: 'Ada' },
      ),
    ).rejects.toThrow('Contact value does not match its type');

    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledOnce();
  });
});