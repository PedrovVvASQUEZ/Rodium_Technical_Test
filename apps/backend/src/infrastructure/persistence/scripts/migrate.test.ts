import { describe, expect, it } from 'vitest';
import { sortMigrationFiles } from './migrate';

describe('sortMigrationFiles', () => {
  it('sorts migration filenames by their numeric version', () => {
    expect(sortMigrationFiles(['010_more.sql', '001_initial.sql', '002_second.sql'])).toEqual([
      '001_initial.sql',
      '002_second.sql',
      '010_more.sql',
    ]);
  });

  it('rejects duplicate numeric versions', () => {
    expect(() => sortMigrationFiles(['001_initial.sql', '1_duplicate.sql'])).toThrow(
      'Ambiguous migration version: 1',
    );
  });
});