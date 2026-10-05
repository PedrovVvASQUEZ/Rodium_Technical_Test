import { InvalidContactInputError } from '../../domain/contacts/contact-errors';

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertRecord = (value: unknown, message: string): RecordValue => {
  if (!isRecord(value)) throw new InvalidContactInputError(message);
  return value;
};

const assertOnlyKeys = (value: RecordValue, allowed: readonly string[]): void => {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new InvalidContactInputError(`Unknown body property '${key}'`);
  }
};

export type CreateContactDto = { values?: Record<string, unknown> };
export const adaptCreateContact = (body: unknown): CreateContactDto => {
  const record = assertRecord(body, 'Request body must be an object');
  assertOnlyKeys(record, ['values']);
  if (record.values === undefined) return {};
  return { values: assertRecord(record.values, "Body property 'values' must be an object") };
};

export type UpdateContactValueDto = { columnId: string; value: unknown };
export const adaptUpdateContactValue = (body: unknown): UpdateContactValueDto => {
  const record = assertRecord(body, 'Request body must be an object');
  assertOnlyKeys(record, ['columnId', 'value']);
  if (typeof record.columnId !== 'string' || record.columnId.trim() === '') {
    throw new InvalidContactInputError("Body property 'columnId' must be a non-empty string");
  }
  if (!Object.prototype.hasOwnProperty.call(record, 'value')) {
    throw new InvalidContactInputError("Body property 'value' is required");
  }
  return { columnId: record.columnId, value: record.value };
};