import { FormEvent, useState } from 'react';
import type { ColumnType, CreateColumnInput } from '../domain/crm';

type ColumnFormProps = { onCreate: (input: CreateColumnInput) => Promise<unknown>; busy?: boolean; error?: Error | null };

export function ColumnForm({ onCreate, busy = false, error = null }: ColumnFormProps) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<ColumnType>('text');
  const [validationError, setValidationError] = useState<string | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = label.trim();
    if (normalized.length < 1 || normalized.length > 120) { setValidationError('Le libellé doit contenir entre 1 et 120 caractères.'); return; }
    try { setValidationError(null); await onCreate({ label: normalized, type }); setLabel(''); setType('text'); }
    catch (cause: unknown) { setValidationError(cause instanceof Error ? cause.message : 'La création a échoué.'); }
  };
  return <form className="column-form" onSubmit={(event) => void submit(event)} aria-busy={busy} aria-labelledby="column-form-title">
    <h2 id="column-form-title">Ajouter une colonne</h2>
    <label htmlFor="column-label">Libellé</label>
    <input id="column-label" value={label} disabled={busy} onChange={(event) => setLabel(event.target.value)} aria-invalid={Boolean(validationError)} />
    <label htmlFor="column-type">Type</label>
    <select id="column-type" value={type} disabled={busy} onChange={(event) => setType(event.target.value as ColumnType)}>
      <option value="text">Texte</option><option value="number">Nombre</option><option value="date">Date</option><option value="phone">Téléphone</option>
    </select>
    <button type="submit" disabled={busy}>{busy ? 'Création...' : 'Ajouter la colonne'}</button>
    <span role="status" aria-live="polite">{busy ? 'Création de la colonne en cours...' : ''}</span>
    {(validationError || error) && <p role="alert">{validationError ?? error?.message}</p>}
  </form>;
}
