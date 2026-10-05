import { describe, expect, it, vi } from 'vitest';
import { ApiExceptionFilter } from './api-exception.filter';
import { QueryValidationError } from './query-validation.error';
import { ContactNotFoundError, InvalidContactInputError } from '../../domain/contacts/contact-errors';

describe('ApiExceptionFilter', () => {
  it('returns the stable 400 shape for query validation', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const filter = new ApiExceptionFilter();

    filter.catch(new QueryValidationError('Invalid query'), {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as never);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ statusCode: 400, code: 'INVALID_QUERY', message: 'Invalid query' });
  });

  it('does not expose infrastructure errors', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const filter = new ApiExceptionFilter();

    filter.catch(new Error('pg: password=secret'), {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as never);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ statusCode: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' });
  });

  it('maps contact input and missing contact errors', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const filter = new ApiExceptionFilter();
    const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) } as never;

    filter.catch(new InvalidContactInputError('bad value'), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ statusCode: 400, code: 'INVALID_CONTACT_INPUT', message: 'bad value' });
    filter.catch(new ContactNotFoundError('missing'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ statusCode: 404, code: 'CONTACT_NOT_FOUND', message: 'Contact not found: missing' });
  });
});