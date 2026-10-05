import { useEffect, useRef, useState } from 'react';
import type { Column, Contact, ContactValue } from '../domain/crm';
import './crm.css';

function displayValue(value: ContactValue | null | undefined, columnType: Column['type']): string { if (!value || value.type !== columnType) return ''; if (value.type === 'date') { const date = new Date(`${value.value}T00:00:00`); return Number.isNaN(date.getTime()) ? String(value.value) : new Intl.DateTimeFormat('fr-FR').format(date); } return String(value.value); }
function inputValue(value: ContactValue | null | undefined, columnType: Column['type']): string { if (!value || value.type !== columnType) return ''; return String(value.value); }
export function convertInputValue(raw: string, type: Column['type']): string | number | null { if (raw === '') return null; if (type === 'number') { const value = Number(raw); if (!Number.isFinite(value)) throw new Error('Le nombre est invalide.'); return value; } return raw; }
export function ContactGrid({ columns, contacts, onUpdateCell }: { columns: readonly Column[]; contacts: readonly Contact[]; onUpdateCell?: (contactId: string, columnId: string, value: string | number | null) => Promise<Contact> }) {
  const [editing, setEditing] = useState<{ contactId: string; columnId: string; draft: string } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<{ key: string; message: string } | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const cellButtons = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => { if (!editing && focusKey) { cellButtons.current.get(focusKey)?.focus(); setFocusKey(null); } }, [editing, focusKey]);
  const beginEdit = (contact: Contact, column: Column) => { if (saving) return; setSaveError(null); setEditing({ contactId: contact.id, columnId: column.id, draft: inputValue(contact.values[column.id], column.type) }); };
  const commit = async (contact: Contact, column: Column) => {
    if (!editing || saving || editing.contactId !== contact.id || editing.columnId !== column.id || !onUpdateCell) return;
    let value: string | number | null;
    const key = `${contact.id}:${column.id}`;
    try { value = convertInputValue(editing.draft, column.type); } catch (error) { setSaveError({ key, message: error instanceof Error ? error.message : 'La valeur est invalide.' }); return; }
    setSaving(key); setSaveError(null);
    try { await onUpdateCell(contact.id, column.id, value); setEditing(null); setFocusKey(key); } catch (error) { setSaveError({ key, message: error instanceof Error ? error.message : 'La sauvegarde a échoué.' }); } finally { setSaving(null); }
  };
  return <div className="grid-scroll" role="region" aria-label="Contacts"><table className="contact-grid"><thead><tr><th scope="col">ID</th>{columns.map((column) => <th scope="col" key={column.id}>{column.label}</th>)}</tr></thead><tbody>{contacts.map((contact) => <tr key={contact.id}><th scope="row">{contact.id}</th>{columns.map((column) => { const isEditing = editing?.contactId === contact.id && editing.columnId === column.id; const key = `${contact.id}:${column.id}`; return <td key={column.id} onDoubleClick={() => onUpdateCell && beginEdit(contact, column)}>{isEditing ? <><input aria-label={`${column.label} de ${contact.id}`} aria-busy={saving === key} disabled={saving === key} type={column.type === 'phone' ? 'tel' : column.type} value={editing.draft} autoFocus onChange={(event) => setEditing({ ...editing, draft: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') void commit(contact, column); if (event.key === 'Escape') { setEditing(null); setFocusKey(key); setSaveError(null); } }} /><span className="cell-status" role="status" aria-live="polite">{saving === key ? 'Sauvegarde...' : ''}</span>{saveError?.key === key && <span className="cell-error" role="alert">{saveError.message}</span>}</> : onUpdateCell ? <><button type="button" className="cell-value" ref={(element) => { if (element) cellButtons.current.set(key, element); else cellButtons.current.delete(key); }} onClick={() => beginEdit(contact, column)} aria-label={`Modifier ${column.label} de ${contact.id}`}>{displayValue(contact.values[column.id], column.type)}</button>{saveError?.key === key && saving === null && <span className="cell-error" role="alert">{saveError.message}</span>}</> : displayValue(contact.values[column.id], column.type)}</td>; })}</tr>)}</tbody></table></div>;
}