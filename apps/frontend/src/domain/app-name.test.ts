import { describe, expect, it } from 'vitest';
import { appName } from './app-name';

describe('appName', () => {
  it('exposes the product name', () => {
    expect(appName).toBe('Rodium CRM');
  });
});