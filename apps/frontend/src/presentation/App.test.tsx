import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { useCrmData } from './use-crm-data';

vi.mock('./use-crm-data', () => ({ useCrmData: vi.fn() }));

const mockedUseCrmData = vi.mocked(useCrmData);

afterEach(() => vi.resetAllMocks());

describe('App', () => {
  it('affiche l etat vide', () => {
    mockedUseCrmData.mockReturnValue({ status: 'empty', columns: [], contacts: [], error: null, hasMore: false, loadMore: vi.fn(), sentinelRef: vi.fn(), updateContactValue: vi.fn(), createContact: vi.fn(), deleteContact: vi.fn(), updateStatus: 'idle', createStatus: 'idle', deleteStatus: 'idle', mutationError: null });
    render(<App />);
    expect(screen.getByText('Aucun contact à afficher.')).toBeTruthy();
  });

  it('affiche une erreur controlee', () => {
    mockedUseCrmData.mockReturnValue({ status: 'error', columns: [], contacts: [], error: new Error('Serveur indisponible'), hasMore: false, loadMore: vi.fn(), sentinelRef: vi.fn(), updateContactValue: vi.fn(), createContact: vi.fn(), deleteContact: vi.fn(), updateStatus: 'idle', createStatus: 'idle', deleteStatus: 'idle', mutationError: null });
    render(<App />);
    expect(screen.getByRole('alert').textContent).toBe('Serveur indisponible');
  });

  it('affiche encore une erreur de création quand le statut est redevenu idle', () => {
    mockedUseCrmData.mockReturnValue({ status: 'ready', columns: [], contacts: [], error: null, hasMore: false, loadMore: vi.fn(), sentinelRef: vi.fn(), updateContactValue: vi.fn(), createContact: vi.fn(), deleteContact: vi.fn(), updateStatus: 'idle', createStatus: 'idle', deleteStatus: 'idle', mutationError: new Error('Echec CREATE') });
    render(<App />);
    expect(screen.getByRole('alert').textContent).toBe('Echec CREATE');
  });
});