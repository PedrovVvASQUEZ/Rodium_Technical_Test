export type ColumnType = 'text' | 'number' | 'date' | 'phone';

export type Column = {
  id: string;
  label: string;
  type: ColumnType;
  position?: number;
};

export const MAX_COLUMN_LABEL_LENGTH = 120;

export type ContactValue =
  | { type: 'text'; value: string }
  | { type: 'number'; value: number }
  | { type: 'date'; value: string }
  | { type: 'phone'; value: string };

const columnTypes: readonly ColumnType[] = ['text', 'number', 'date', 'phone'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isColumnType = (value: unknown): value is ColumnType =>
  typeof value === 'string' && columnTypes.includes(value as ColumnType);

export const validateColumn = (value: unknown): Column => {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.trim() === '') {
    throw new Error('Column id must be a non-empty string');
  }

  if (typeof value.label !== 'string' || value.label.trim() === '' || value.label.trim().length > MAX_COLUMN_LABEL_LENGTH) {
    throw new Error(`Column label must be 1-${MAX_COLUMN_LABEL_LENGTH} characters`);
  }

  if (!isColumnType(value.type)) {
    throw new Error('Column type is invalid');
  }

  if (value.position !== undefined && (!Number.isSafeInteger(value.position) || (value.position as number) < 0)) {
    throw new Error('Column position must be a non-negative safe integer');
  }

  return {
    id: value.id,
    label: value.label.trim(),
    type: value.type,
    position: value.position as number,
  };
};

export const validateContactValue = (value: unknown): ContactValue => {
  if (!isRecord(value) || !isColumnType(value.type)) {
    throw new Error('Contact value type is invalid');
  }

  if (value.type === 'number' && typeof value.value === 'number' && Number.isFinite(value.value)) {
    return { type: value.type, value: value.value };
  }

  if (
    (value.type === 'text' || value.type === 'phone' || value.type === 'date') &&
    typeof value.value === 'string'
  ) {
    return { type: value.type, value: value.value };
  }

  throw new Error('Contact value does not match its type');
};