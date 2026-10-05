import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ColumnForm } from './ColumnForm';

describe('ColumnForm', () => {
  it('valide un libellé vide et trop long sans créer', () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<ColumnForm onCreate={onCreate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter la colonne' }));
    expect(screen.getByRole('alert').textContent).toContain('entre 1 et 120');
    fireEvent.change(screen.getByLabelText('Libellé'), { target: { value: 'a'.repeat(121) } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter la colonne' }));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('envoie le type sélectionné et expose aria-busy pendant la création', async () => {
    let resolve!: () => void;
    const onCreate = vi.fn().mockReturnValue(new Promise<void>((nextResolve) => { resolve = nextResolve; }));
    const { rerender } = render(<ColumnForm onCreate={onCreate} busy />);
    expect(screen.getByRole('form').getAttribute('aria-busy')).toBe('true');
    expect((screen.getByRole('button', { name: 'Création...' }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<ColumnForm onCreate={onCreate} />);
    fireEvent.change(screen.getByLabelText('Libellé'), { target: { value: 'Date de naissance' } });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'date' } });
    fireEvent.submit(screen.getByRole('form'));
    expect(onCreate).toHaveBeenCalledWith({ label: 'Date de naissance', type: 'date' });
    rerender(<ColumnForm onCreate={onCreate} busy />);
    resolve();
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
  });

  it('réinitialise le formulaire après succès et conserve la saisie après erreur', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<ColumnForm onCreate={onCreate} />);
    fireEvent.change(screen.getByLabelText('Libellé'), { target: { value: 'Pays' } });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'number' } });
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect((screen.getByLabelText('Libellé') as HTMLInputElement).value).toBe(''));
    expect((screen.getByLabelText('Type') as HTMLSelectElement).value).toBe('text');

    onCreate.mockRejectedValueOnce(new Error('Echec CREATE'));
    fireEvent.change(screen.getByLabelText('Libellé'), { target: { value: 'Région' } });
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Echec CREATE'));
    expect((screen.getByLabelText('Libellé') as HTMLInputElement).value).toBe('Région');
    rerender(<ColumnForm onCreate={onCreate} error={new Error('Erreur externe')} />);
  });
});