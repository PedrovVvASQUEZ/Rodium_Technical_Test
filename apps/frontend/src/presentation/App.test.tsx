import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { useCrmData } from './use-crm-data';

vi.mock('./use-crm-data', () => ({ useCrmData: vi.fn() }));

const mockedUseCrmData = vi.mocked(useCrmData);

afterEach(() => vi.resetAllMocks());

describe('App', () => {
  it('affiche l etat vide', () => {
    mockedUseCrmData.mockReturnValue({ status: 'empty', columns: [], contacts: [], error: null, hasMore: false, loadMore: vi.fn(), sentinelRef: vi.fn(), updateContactValue: vi.fn(), createContact: vi.fn(), deleteContact: vi.fn(), createColumn: vi.fn(), renameColumn: vi.fn(), deleteColumn: vi.fn(), reorderColumns: vi.fn(), updateStatus: 'idle', createStatus: 'idle', deleteStatus: 'idle', columnCreateStatus: 'idle', columnRenameStatus: 'idle', columnDeleteStatus: 'idle', columnReorderStatus: 'idle', mutationError: null, columnMutationError: null });
    render(<App />);
    expect(screen.getByText('Aucun contact à afficher.')).toBeTruthy();
  });

  it('affiche une erreur controlee', () => {
    mockedUseCrmData.mockReturnValue({ status: 'error', columns: [], contacts: [], error: new Error('Serveur indisponible'), hasMore: false, loadMore: vi.fn(), sentinelRef: vi.fn(), updateContactValue: vi.fn(), createContact: vi.fn(), deleteContact: vi.fn(), createColumn: vi.fn(), renameColumn: vi.fn(), deleteColumn: vi.fn(), reorderColumns: vi.fn(), updateStatus: 'idle', createStatus: 'idle', deleteStatus: 'idle', columnCreateStatus: 'idle', columnRenameStatus: 'idle', columnDeleteStatus: 'idle', columnReorderStatus: 'idle', mutationError: null, columnMutationError: null });
    render(<App />);
    expect(screen.getByRole('alert').textContent).toBe('Serveur indisponible');
  });

  it('affiche encore une erreur de création quand le statut est redevenu idle', () => {
    mockedUseCrmData.mockReturnValue({ status: 'ready', columns: [], contacts: [], error: null, hasMore: false, loadMore: vi.fn(), sentinelRef: vi.fn(), updateContactValue: vi.fn(), createContact: vi.fn(), deleteContact: vi.fn(), createColumn: vi.fn(), renameColumn: vi.fn(), deleteColumn: vi.fn(), reorderColumns: vi.fn(), updateStatus: 'idle', createStatus: 'idle', deleteStatus: 'idle', columnCreateStatus: 'idle', columnRenameStatus: 'idle', columnDeleteStatus: 'idle', columnReorderStatus: 'idle', mutationError: new Error('Echec CREATE'), columnMutationError: null });
    render(<App />);
    expect(screen.getByRole('alert').textContent).toBe('Echec CREATE');
  });

  it('désactive la création de colonne pendant une autre mutation de colonne', () => {
    mockedUseCrmData.mockReturnValue({ status: 'ready', columns: [], contacts: [], error: null, hasMore: false, loadMore: vi.fn(), sentinelRef: vi.fn(), updateContactValue: vi.fn(), createContact: vi.fn(), deleteContact: vi.fn(), createColumn: vi.fn(), renameColumn: vi.fn(), deleteColumn: vi.fn(), reorderColumns: vi.fn(), updateStatus: 'idle', createStatus: 'idle', deleteStatus: 'idle', columnCreateStatus: 'idle', columnRenameStatus: 'pending', columnDeleteStatus: 'idle', columnReorderStatus: 'idle', mutationError: null, columnMutationError: null });
    render(<App />);
    expect(screen.getAllByRole('button', { name: 'Création...' })).toHaveLength(2);
    expect((screen.getByLabelText('Libellé') as HTMLInputElement).disabled).toBe(true);
  });
});