import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContactForm, parseField } from './ContactForm';

describe('ContactForm', () => {
  const columns = [{ id: 'name', label: 'Nom', type: 'text' }, { id: 'score', label: 'Score', type: 'number' }, { id: 'birth', label: 'Naissance', type: 'date' }] as const;

  it('convertit les nombres et omet les champs vides', async () => {
    const onCreate = vi.fn().mockResolvedValue({ id: '1', values: {} });
    render(<ContactForm columns={columns} onCreate={onCreate} />);
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('Score'), { target: { value: '42' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Ajouter' }).closest('form')!);
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({ name: 'Ada', score: 42 }));
  });

  it('valide localement les nombres invalides', () => {
    expect(() => parseField('abc', columns[1])).toThrow('Score doit être un nombre.');
  });
});