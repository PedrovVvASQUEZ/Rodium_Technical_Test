import { isColumnType, MAX_COLUMN_LABEL_LENGTH, type ColumnType } from '../../domain/columns/column';
import { InvalidColumnError } from '../../domain/columns/column-errors';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const validateColumnId = (id: string): string => {
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) throw new InvalidColumnError('Column id must be a valid UUID');
  return id;
};
export const validateLabel = (label: string): string => {
  if (typeof label !== 'string') throw new InvalidColumnError('Column label must be a string');
  const trimmed = label.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_COLUMN_LABEL_LENGTH) throw new InvalidColumnError(`Column label must be 1-${MAX_COLUMN_LABEL_LENGTH} characters`);
  return trimmed;
};
export const validateType = (type: unknown): ColumnType => {
  if (!isColumnType(type)) throw new InvalidColumnError('Column type is invalid');
  return type;
};
export const validatePosition = (position: unknown): number | undefined => {
  if (position === undefined) return undefined;
  if (!Number.isSafeInteger(position) || (position as number) < 0) throw new InvalidColumnError('Column position must be a non-negative safe integer');
  return position as number;
};
export const validateReorderIds = (ids: unknown): readonly string[] => {
  if (!Array.isArray(ids) || ids.length === 0) throw new InvalidColumnError('Column ids must be a non-empty array');
  const validated = ids.map((id) => validateColumnId(id));
  if (new Set(validated).size !== validated.length) throw new InvalidColumnError('Column ids must be unique');
  return validated;
};