export class InvalidColumnError extends Error {
  readonly code = 'INVALID_COLUMN';
  constructor(message: string) { super(message); this.name = 'InvalidColumnError'; }
}

export class ColumnNotFoundError extends Error {
  readonly code = 'COLUMN_NOT_FOUND';
  constructor(id: string) { super(`Column not found: ${id}`); this.name = 'ColumnNotFoundError'; }
}

export class ColumnConflictError extends Error {
  readonly code = 'COLUMN_CONFLICT';
  constructor(message: string) { super(message); this.name = 'ColumnConflictError'; }
}