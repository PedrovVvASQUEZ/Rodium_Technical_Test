import type { Column, Contact, ContactValue } from '../domain/crm';
import './crm.css';

function displayValue(value: ContactValue | undefined, columnType: Column['type']): string { if (!value || value.type !== columnType) return ''; if (value.type === 'date') { const date = new Date(`${value.value}T00:00:00`); return Number.isNaN(date.getTime()) ? String(value.value) : new Intl.DateTimeFormat('fr-FR').format(date); } return String(value.value); }
export function ContactGrid({ columns, contacts }: { columns: readonly Column[]; contacts: readonly Contact[] }) {
  return <div className="grid-scroll" role="region" aria-label="Contacts"><table className="contact-grid"><thead><tr><th scope="col">ID</th>{columns.map((column) => <th scope="col" key={column.id}>{column.label}</th>)}</tr></thead><tbody>{contacts.map((contact) => <tr key={contact.id}><th scope="row">{contact.id}</th>{columns.map((column) => <td key={column.id}>{displayValue(contact.values[column.id], column.type)}</td>)}</tr>)}</tbody></table></div>;
}