import { describe, expect, it } from 'vitest';
import { appendContacts } from './load-crm';

describe('appendContacts', () => {
  it('concatène les pages sans perdre les contacts existants', () => {
    const contact = (id: string) => ({ id, values: {} });
    expect(appendContacts([contact('1')], { items: [contact('2')], page: 2, pageSize: 1, total: 2, totalPages: 2 })).toEqual([contact('1'), contact('2')]);
  });
});