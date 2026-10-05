import { Column, ContactValue, validateContactValue } from '../../domain/columns/column';
import { InvalidContactInputError } from '../../domain/contacts/contact-errors';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validateContactId = (id: string): void => {
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    throw new InvalidContactInputError('Contact id must be a valid UUID');
  }
};

const validateDate = (value: string): void => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InvalidContactInputError('Date value must use YYYY-MM-DD format');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || !date.toISOString().startsWith(`${value}T`)) {
    throw new InvalidContactInputError('Date value is invalid');
  }
};

export const findContactColumn = (columns: readonly Column[], columnId: string): Column => {
  const column = columns.find((candidate) => candidate.id === columnId);
  if (!column) throw new InvalidContactInputError(`Unknown column: ${columnId}`);
  return column;
};

export const validateValueForColumn = (column: Column, value: unknown): ContactValue => {
  let validated: ContactValue;
  try {
    validated = validateContactValue(value);
  } catch {
    throw new InvalidContactInputError(`Value for column '${column.id}' is invalid`);
  }
  if (validated.type !== column.type) {
    throw new InvalidContactInputError(`Value type does not match column '${column.id}'`);
  }
  if (validated.type === 'date') validateDate(validated.value);
  return validated;
};