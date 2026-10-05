import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crmService } from '../application/load-crm';
import { useCrmData } from './use-crm-data';

function Probe() {
  const data = useCrmData();
  return <><output data-testid="status">{data.status}</output><output data-testid="count">{data.contacts.length}</output><output data-testid="error">{data.error?.message ?? ''}</output><div data-testid="sentinel" ref={data.sentinelRef} /></>;
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
});