import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crmService } from '../application/load-crm';
import { useCrmData } from './use-crm-data';

function Probe() {
  const data = useCrmData();
  return <><output data-testid="status">{data.status}</output><output data-testid="count">{data.contacts.length}</output><output data-testid="value">{String(data.contacts[0]?.values.name?.value ?? '')}</output><output data-testid="error">{data.error?.message ?? ''}</output><output data-testid="mutation-error">{data.mutationError?.message ?? ''}</output><output data-testid="create-status">{data.createStatus}</output><output data-testid="delete-status">{data.deleteStatus}</output><button onClick={() => void data.updateContactValue('1', 'name', 'Grace').catch(() => undefined)}>update</button><button onClick={() => void data.createContact({ name: 'New' }).catch(() => undefined)}>create</button><button onClick={() => void data.deleteContact('1').catch(() => undefined)}>delete</button><div data-testid="sentinel" ref={data.sentinelRef} /></>;
}

afterEach(() => vi.restoreAllMocks());

describe('useCrmData', () => {
  it('charge une page puis concatène une seule page par intersection', async () => {
    const first = Promise.resolve({ columns: [], contacts: { items: [{ id: '1', values: {} }], page: 1, pageSize: 1, total: 2, totalPages: 2 } });
    const second = Promise.resolve({ items: [{ id: '2', values: {} }], page: 2, pageSize: 1, total: 2, totalPages: 2 });
    vi.spyOn(crmService, 'loadFirstPage').mockReturnValue(first);
    const loadContacts = vi.spyOn(crmService, 'loadContacts').mockReturnValue(second);
    let callback: IntersectionObserverCallback = () => undefined;
    vi.stubGlobal('IntersectionObserver', class { constructor(next: IntersectionObserverCallback) { callback = next; } observe() {} disconnect() {} });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'));
    callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    expect(loadContacts).toHaveBeenCalledTimes(1);
  });

  it('déduplique les contacts ajoutés par pagination et création', async () => {
    const first = { items: [{ id: '1', values: {} }], page: 1, pageSize: 1, total: 2, totalPages: 2 };
    vi.spyOn(crmService, 'loadFirstPage').mockResolvedValue({ columns: [], contacts: first });
    vi.spyOn(crmService, 'loadContacts').mockResolvedValue({ items: [{ id: '1', values: {} }, { id: '2', values: {} }], page: 2, pageSize: 2, total: 2, totalPages: 2 });
    vi.spyOn(crmService, 'createContact').mockResolvedValue({ id: '2', values: {} });
    let callback: IntersectionObserverCallback = () => undefined;
    vi.stubGlobal('IntersectionObserver', class { constructor(next: IntersectionObserverCallback) { callback = next; } observe() {} disconnect() {} });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'));
    callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    fireEvent.click(screen.getByRole('button', { name: 'create' }));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
  });

  it('remet les statuts de création et suppression à idle après succès ou erreur', async () => {
    vi.spyOn(crmService, 'loadFirstPage').mockResolvedValue({ columns: [], contacts: { items: [{ id: '1', values: {} }], page: 1, pageSize: 1, total: 1, totalPages: 1 } });
    vi.spyOn(crmService, 'createContact').mockResolvedValue({ id: '2', values: {} });
    vi.spyOn(crmService, 'deleteContact').mockRejectedValue(new Error('Echec DELETE'));
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'));
    fireEvent.click(screen.getByRole('button', { name: 'create' }));
    await waitFor(() => expect(screen.getByTestId('create-status').textContent).toBe('idle'));
    fireEvent.click(screen.getByRole('button', { name: 'delete' }));
    await waitFor(() => expect(screen.getByTestId('delete-status').textContent).toBe('idle'));
  });

  it('conserve l ancienne valeur pendant le PATCH', async () => {
    let resolveUpdate!: (contact: { id: string; values: { name: { type: 'text'; value: string } } }) => void;
    vi.spyOn(crmService, 'loadFirstPage').mockResolvedValue({ columns: [{ id: 'name', label: 'Nom', type: 'text' }], contacts: { items: [{ id: '1', values: { name: { type: 'text', value: 'Ada' } } }], page: 1, pageSize: 1, total: 1, totalPages: 1 } });
    vi.spyOn(crmService, 'updateContactValue').mockReturnValue(new Promise((resolve) => { resolveUpdate = resolve; }));
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'));
    fireEvent.click(screen.getByRole('button', { name: 'update' }));
    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('Ada'));
    resolveUpdate({ id: '1', values: { name: { type: 'text', value: 'Grace' } } });
    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('Grace'));
  });

  it('charge toutes les pages jusqu a totalPages puis s arrete', async () => {
    const pages = [
      { items: [{ id: '1', values: {} }], page: 1, pageSize: 1, total: 3, totalPages: 3 },
      { items: [{ id: '2', values: {} }], page: 2, pageSize: 1, total: 3, totalPages: 3 },
      { items: [{ id: '3', values: {} }], page: 3, pageSize: 1, total: 3, totalPages: 3 },
    ];
    vi.spyOn(crmService, 'loadFirstPage').mockResolvedValue({ columns: [], contacts: pages[0] });
    const loadContacts = vi.spyOn(crmService, 'loadContacts').mockImplementation(async (page) => pages[page - 1]);
    const callbacks: IntersectionObserverCallback[] = [];
    vi.stubGlobal('IntersectionObserver', class { constructor(next: IntersectionObserverCallback) { callbacks.push(next); } observe() {} disconnect() {} });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'));
    const intersect = () => callbacks[callbacks.length - 1]([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);

    intersect();
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    intersect();
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'));
    intersect();
    await waitFor(() => expect(loadContacts).toHaveBeenCalledTimes(2));
    expect(loadContacts).toHaveBeenNthCalledWith(1, 2, 50);
    expect(loadContacts).toHaveBeenNthCalledWith(2, 3, 50);
  });

  it('efface une erreur progressive apres la reprise sur la page suivante', async () => {
    const page = { items: [{ id: '1', values: {} }], page: 1, pageSize: 1, total: 2, totalPages: 2 };
    const nextPage = { items: [{ id: '2', values: {} }], page: 2, pageSize: 1, total: 2, totalPages: 2 };
    vi.spyOn(crmService, 'loadFirstPage').mockResolvedValue({ columns: [], contacts: page });
    const loadContacts = vi.spyOn(crmService, 'loadContacts')
      .mockRejectedValueOnce(new Error('Erreur temporaire'))
      .mockResolvedValueOnce(nextPage);
    let callback: IntersectionObserverCallback = () => undefined;
    vi.stubGlobal('IntersectionObserver', class { constructor(next: IntersectionObserverCallback) { callback = next; } observe() {} disconnect() {} });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'));

    callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Erreur temporaire'));
    callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    expect(screen.getByTestId('status').textContent).toBe('ready');
    expect(screen.getByTestId('error').textContent).toBe('');
    expect(loadContacts).toHaveBeenCalledTimes(2);
  });

  it('remplace la ligne par la reponse serveur', async () => {
    vi.spyOn(crmService, 'loadFirstPage').mockResolvedValue({ columns: [{ id: 'name', label: 'Nom', type: 'text' }], contacts: { items: [{ id: '1', values: { name: { type: 'text', value: 'Ada' } } }], page: 1, pageSize: 1, total: 1, totalPages: 1 } });
    const update = vi.spyOn(crmService, 'updateContactValue').mockResolvedValue({ id: '1', values: { name: { type: 'text', value: 'Ada Lovelace' } } });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'));
    fireEvent.click(screen.getByRole('button', { name: 'update' }));
    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('Ada Lovelace'));
    expect(update).toHaveBeenCalledWith('1', 'name', 'text', 'Grace');
  });

  it('restaure uniquement la cellule en erreur et conserve une page ajoutée entre-temps', async () => {
    let rejectUpdate!: (cause: Error) => void;
    let resolvePage!: (page: { items: { id: string; values: Record<string, { type: 'text'; value: string }> }[]; page: number; pageSize: number; total: number; totalPages: number }) => void;
    vi.spyOn(crmService, 'loadFirstPage').mockResolvedValue({ columns: [{ id: 'name', label: 'Nom', type: 'text' }], contacts: { items: [{ id: '1', values: { name: { type: 'text', value: 'Ada' } } }], page: 1, pageSize: 1, total: 2, totalPages: 2 } });
    vi.spyOn(crmService, 'updateContactValue').mockReturnValue(new Promise((_resolve, reject) => { rejectUpdate = reject; }));
    vi.spyOn(crmService, 'loadContacts').mockReturnValue(new Promise((resolve) => { resolvePage = resolve; }));
    let callback: IntersectionObserverCallback = () => undefined;
    vi.stubGlobal('IntersectionObserver', class { constructor(next: IntersectionObserverCallback) { callback = next; } observe() {} disconnect() {} });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'));
    fireEvent.click(screen.getByRole('button', { name: 'update' }));
    callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    resolvePage({ items: [{ id: '2', values: { name: { type: 'text', value: 'Grace' } } }], page: 2, pageSize: 1, total: 2, totalPages: 2 });
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    rejectUpdate(new Error('Echec PATCH'));
    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('Ada'));
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('insère le contact créé et retire le contact supprimé après succès', async () => {
    vi.spyOn(crmService, 'loadFirstPage').mockResolvedValue({ columns: [], contacts: { items: [{ id: '1', values: {} }], page: 1, pageSize: 1, total: 1, totalPages: 1 } });
    vi.spyOn(crmService, 'createContact').mockResolvedValue({ id: '2', values: {} });
    vi.spyOn(crmService, 'deleteContact').mockResolvedValue();
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'));
    fireEvent.click(screen.getByRole('button', { name: 'create' }));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    fireEvent.click(screen.getByRole('button', { name: 'delete' }));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    expect(crmService.createContact).toHaveBeenCalledWith({ name: 'New' });
    expect(crmService.deleteContact).toHaveBeenCalledWith('1');
  });

  it('conserve la ligne si la suppression échoue', async () => {
    vi.spyOn(crmService, 'loadFirstPage').mockResolvedValue({ columns: [], contacts: { items: [{ id: '1', values: {} }], page: 1, pageSize: 1, total: 1, totalPages: 1 } });
    vi.spyOn(crmService, 'deleteContact').mockRejectedValue(new Error('Echec DELETE'));
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'));
    fireEvent.click(screen.getByRole('button', { name: 'delete' }));
    await waitFor(() => expect(screen.getByTestId('mutation-error').textContent).toBe('Echec DELETE'));
    expect(screen.getByTestId('count').textContent).toBe('1');
  });
});