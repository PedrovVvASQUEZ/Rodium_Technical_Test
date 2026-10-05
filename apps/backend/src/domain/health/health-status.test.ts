import { describe, expect, it } from 'vitest';
import { getHealthStatus } from './health-status';

describe('getHealthStatus', () => {
  it('returns the backend health status', () => {
    expect(getHealthStatus()).toEqual({ status: 'ok', service: 'backend' });
  });
});