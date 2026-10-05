import { useCallback, useEffect, useRef, useState } from 'react';
import { appendContacts, crmService } from '../application/load-crm';
import type { Column, ColumnType, Contact, ContactValue } from '../domain/crm';

export type CrmStatus = 'loading' | 'error' | 'ready' | 'empty';
export type CrmData = { status: CrmStatus; columns: readonly Column[]; contacts: readonly Contact[]; error: Error | null; hasMore: boolean; loadMore: () => void; sentinelRef: (element: HTMLDivElement | null) => void; updateContactValue: (contactId: string, columnId: string, value: string | number | null) => Promise<Contact> };
const PAGE_SIZE = 50;

export function useCrmData(): CrmData {
  const [status, setStatus] = useState<CrmStatus>('loading');
  const [columns, setColumns] = useState<readonly Column[]>([]);
  const [contacts, setContacts] = useState<readonly Contact[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const nextPage = useRef(2); const loading = useRef(false); const observer = useRef<IntersectionObserver | null>(null);
  const updateContactValue = useCallback(async (contactId: string, columnId: string, value: string | number | null) => {
    const column = columns.find((candidate) => candidate.id === columnId);
    if (!column) throw new Error('Colonne inconnue.');
    const previousValue = contacts.find((contact) => contact.id === contactId)?.values[columnId];
    setContacts((current) => current.map((contact) => contact.id !== contactId ? contact : { ...contact, values: { ...contact.values, [columnId]: value === null ? null : { type: column.type, value } as ContactValue } }));
    try {
      const updated = await crmService.updateContactValue(contactId, columnId, column.type, value);
      setContacts((current) => current.map((contact) => contact.id === contactId ? updated : contact));
      return updated;
    } catch (cause: unknown) {
      setContacts((current) => current.map((contact) => contact.id !== contactId ? contact : { ...contact, values: { ...contact.values, [columnId]: previousValue ?? null } }));
      throw cause;
    }
  }, [columns, contacts]);
  const loadMore = useCallback(() => {
    if (loading.current || !hasMore) return;
    loading.current = true;
    crmService.loadContacts(nextPage.current, PAGE_SIZE).then((page) => { setContacts((current) => appendContacts(current, page)); setHasMore(page.page < page.totalPages); nextPage.current = page.page + 1; setError(null); }).catch((cause: unknown) => setError(cause instanceof Error ? cause : new Error('Erreur de chargement.'))).finally(() => { loading.current = false; });
  }, [hasMore]);
  const sentinelRef = useCallback((element: HTMLDivElement | null) => { observer.current?.disconnect(); if (!element) return; observer.current = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) loadMore(); }); observer.current.observe(element); }, [loadMore]);
  useEffect(() => {
    let active = true;
    crmService.loadFirstPage(PAGE_SIZE).then((result) => { if (!active) return; setColumns(result.columns); setContacts(result.contacts.items); setHasMore(result.contacts.page < result.contacts.totalPages); nextPage.current = result.contacts.page + 1; setStatus(result.contacts.items.length === 0 ? 'empty' : 'ready'); }).catch((cause: unknown) => { if (!active) return; setError(cause instanceof Error ? cause : new Error('Erreur de chargement.')); setStatus('error'); });
    return () => { active = false; observer.current?.disconnect(); };
  }, []);
  return { status, columns, contacts, error, hasMore, loadMore, sentinelRef, updateContactValue };
}