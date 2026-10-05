export class QueryValidationError extends Error {
  readonly code = 'INVALID_QUERY';

  constructor(message: string) {
    super(message);
    this.name = 'QueryValidationError';
  }
}