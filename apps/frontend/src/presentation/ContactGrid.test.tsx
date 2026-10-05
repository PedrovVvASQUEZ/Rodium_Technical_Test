import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ContactGrid } from './ContactGrid';

describe('ContactGrid', () => {
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