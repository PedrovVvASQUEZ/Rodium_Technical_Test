import { describe, expect, it } from 'vitest';
import { validateColumn, validateContactValue } from './column';

describe('column validation', () => {
  it('accepts the closed set of column types', () => {
    expect(validateColumn({ id: 'name', label: 'Name', type: 'text' })).toEqual({
      id: 'name',
      label: 'Name',
      type: 'text',
    });
  });

  it('rejects unknown column types and mismatched values', () => {
    expect(() => validateColumn({ id: 'name', label: 'Name', type: 'email' })).toThrow();
    expect(() => validateContactValue({ type: 'number', value: '12' })).toThrow();
  });
});