import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ContactGrid, convertInputValue } from './ContactGrid';

describe('ContactGrid', () => {
  it.each([
    ['text', 'Ada', 'Ada'],
    ['number', '42.5', 42.5],
    ['date', '2024-06-20', '2024-06-20'],
    ['phone', '+33123456789', '+33123456789'],
  ] as const)('convertit une valeur %s', (type, raw, expected) => {
    expect(convertInputValue(raw, type)).toBe(expected);
    expect(convertInputValue('', type)).toBeNull();
  });

  it('valide Escape sans appeler le callback', () => {
    const onUpdateCell = vi.fn().mockResolvedValue({ id: 'c-1', values: {} });
    render(<ContactGrid columns={[{ id: 'name', label: 'Nom', type: 'text' }]} contacts={[{ id: 'c-1', values: { name: { type: 'text', value: 'Ada' } } }]} onUpdateCell={onUpdateCell} />);
    fireEvent.click(screen.getByRole('button', { name: 'Modifier Nom de c-1' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nom de c-1' }), { target: { value: 'Grace' } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Nom de c-1' }), { key: 'Escape' });
    expect(onUpdateCell).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Modifier Nom de c-1' }).textContent).toBe('Ada');
  });

  it('affiche une erreur de validation sans sauvegarder', () => {
    expect(() => convertInputValue('abc', 'number')).toThrow('Le nombre est invalide.');
  });

  it('n envoie qu une sauvegarde concurrente', async () => {
    let resolve!: (contact: { id: string; values: Record<string, { type: 'number'; value: number }> }) => void;
    const onUpdateCell = vi.fn().mockReturnValue(new Promise((nextResolve) => { resolve = nextResolve; }));
    render(<ContactGrid columns={[{ id: 'score', label: 'Score', type: 'number' }]} contacts={[{ id: 'c-1', values: { score: { type: 'number', value: 1 } } }]} onUpdateCell={onUpdateCell} />);
    fireEvent.click(screen.getByRole('button', { name: 'Modifier Score de c-1' }));
    const input = screen.getByRole('spinbutton', { name: 'Score de c-1' });
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onUpdateCell).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Sauvegarde...')).toBeTruthy();
    resolve({ id: 'c-1', values: { score: { type: 'number', value: 2 } } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Modifier Score de c-1' }).textContent).toBe('1'));
  });

  it('désactive l input pendant la sauvegarde', async () => {
    let resolve!: (contact: { id: string; values: Record<string, { type: 'text'; value: string }> }) => void;
    const onUpdateCell = vi.fn().mockReturnValue(new Promise((nextResolve) => { resolve = nextResolve; }));
    render(<ContactGrid columns={[{ id: 'name', label: 'Nom', type: 'text' }]} contacts={[{ id: 'c-1', values: { name: { type: 'text', value: 'Ada' } } }]} onUpdateCell={onUpdateCell} />);
    fireEvent.click(screen.getByRole('button', { name: 'Modifier Nom de c-1' }));
    const input = screen.getByRole('textbox', { name: 'Nom de c-1' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((input as HTMLInputElement).disabled).toBe(true);
    expect(input.getAttribute('aria-busy')).toBe('true');
    resolve({ id: 'c-1', values: { name: { type: 'text', value: 'Ada' } } });
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  });

  it('rend les colonnes dynamiques, les types et les cellules absentes', () => {
    const html = renderToStaticMarkup(<ContactGrid columns={[{ id: 'name', label: 'Nom', type: 'text' }, { id: 'score', label: 'Score', type: 'number' }, { id: 'birth', label: 'Naissance', type: 'date' }, { id: 'phone', label: 'Téléphone', type: 'phone' }]} contacts={[{ id: 'c-1', values: { name: { type: 'text', value: 'Ada' }, score: { type: 'number', value: 42 }, birth: { type: 'date', value: '2020-01-02' } } }]} />);
    expect(html).toContain('Ada');
    expect(html).toContain('42');
    expect(html).toContain('02/01/2020');
    expect(html).toContain('<td></td>');
  });

  it('laisse vide une valeur dont le type ne correspond pas a la colonne', () => {
    const html = renderToStaticMarkup(<ContactGrid columns={[{ id: 'score', label: 'Score', type: 'number' }]} contacts={[{ id: 'c-1', values: { score: { type: 'text', value: '42' } } }]} />);
    expect(html).toContain('<td></td>');
    expect(html).not.toContain('>42<');
  });
});