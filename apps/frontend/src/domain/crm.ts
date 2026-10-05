export type ColumnType = 'text' | 'number' | 'date' | 'phone';

export type Column = { id: string; label: string; type: ColumnType };
export type ContactValue = { type: ColumnType; value: string | number };
export type Contact = { id: string; values: Readonly<Record<string, ContactValue>> };
export type ContactsPage = { items: readonly Contact[]; page: number; pageSize: number; total: number; totalPages: number };

const columnTypes: readonly ColumnType[] = ['text', 'number', 'date', 'phone'];
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isColumnType = (value: unknown): value is ColumnType => typeof value === 'string' && columnTypes.includes(value as ColumnType);

export function validateColumns(value: unknown): readonly Column[] {
  if (!Array.isArray(value)) throw new Error('Columns response must be an array');
  return value.map((candidate) => {
    if (!isRecord(candidate) || typeof candidate.id !== 'string' || candidate.id.trim() === '' || typeof candidate.label !== 'string' || candidate.label.trim() === '' || !isColumnType(candidate.type)) throw new Error('Columns response contains an invalid column');
    return { id: candidate.id, label: candidate.label, type: candidate.type };
  });
}

function validateContactValue(value: unknown): ContactValue {
  if (!isRecord(value) || !isColumnType(value.type)) throw new Error('Contact response contains an invalid value type');
  if (value.type === 'number' && typeof value.value === 'number' && Number.isFinite(value.value)) return { type: value.type, value: value.value };
  if (value.type !== 'number' && typeof value.value === 'string') return { type: value.type, value: value.value };
  throw new Error('Contact response contains an invalid value');
}

function validateContact(value: unknown): Contact {
  if (!isRecord(value) || typeof value.id !== 'string' || !isRecord(value.values)) throw new Error('Contacts response contains an invalid contact');
  const values = Object.fromEntries(Object.entries(value.values).map(([key, candidate]) => [key, validateContactValue(candidate)]));
  return { id: value.id, values };
}

export function validateContactsPage(value: unknown): ContactsPage {
  if (!isRecord(value) || !Array.isArray(value.items) || typeof value.page !== 'number' || typeof value.pageSize !== 'number' || typeof value.total !== 'number' || typeof value.totalPages !== 'number' || !Number.isSafeInteger(value.page) || !Number.isSafeInteger(value.pageSize) || !Number.isSafeInteger(value.total) || !Number.isSafeInteger(value.totalPages)) throw new Error('Contacts response has an invalid page');
  const isEmptyResult = value.total === 0 && value.totalPages === 0 && value.page === 1;
  const hasValidPageRange = isEmptyResult || (value.page >= 1 && value.page <= value.totalPages);
  if (value.pageSize < 1 || value.total < 0 || value.totalPages !== Math.ceil(value.total / value.pageSize) || !hasValidPageRange) throw new Error('Contacts response has an inconsistent page');
  return { items: value.items.map(validateContact), page: value.page, pageSize: value.pageSize, total: value.total, totalPages: value.totalPages };
}