import { FormEvent, useState } from 'react';
import type { Column } from '../domain/crm';

type ContactFormProps = { columns: readonly Column[]; onCreate: (values: Readonly<Record<string, string | number>>) => Promise<unknown>; busy?: boolean; error?: Error | null };

export function parseField(raw: string, column: Column): string | number | undefined {
  if (raw.trim() === '') return undefined;
  if (column.type === 'number') {
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`${column.label} doit être un nombre.`);
    return value;
  }
  if (column.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error(`${column.label} doit être une date valide.`);
  return raw;
}

export function ContactForm({ columns, onCreate, busy = false, error = null }: ContactFormProps) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const values = Object.fromEntries(columns.flatMap((column) => {
        const value = parseField(draft[column.id] ?? '', column);
        return value === undefined ? [] : [[column.id, value]];
      }));
      setValidationError(null);
      await onCreate(values);
      setDraft({});
    } catch (cause: unknown) {
      setValidationError(cause instanceof Error ? cause.message : 'Les valeurs sont invalides.');
    }
  };
  return <form className="contact-form" onSubmit={(event) => void submit(event)} aria-busy={busy}>
    <h2>Ajouter un contact</h2>
    <div className="contact-form-fields">{columns.map((column) => <label key={column.id}>{column.label}<input name={column.id} type={column.type === 'phone' ? 'tel' : column.type} value={draft[column.id] ?? ''} disabled={busy} onChange={(event) => setDraft({ ...draft, [column.id]: event.target.value })} /></label>)}</div>
    <button type="submit" disabled={busy}>{busy ? 'Création...' : 'Ajouter'}</button>
    <span role="status" aria-live="polite">{busy ? 'Création en cours...' : ''}</span>
    {(validationError || error) && <p role="alert">{validationError ?? error?.message}</p>}
  </form>;
}