import { useCallback, useEffect, useRef, useState } from 'react';
import { appendContacts, crmService } from '../application/load-crm';
import type { Column, ColumnType, Contact, ContactValue, CreateColumnInput } from '../domain/crm';

export type CrmStatus = 'loading' | 'error' | 'ready' | 'empty';
export type MutationStatus = 'idle' | 'pending' | 'error';
export type CrmData = { status: CrmStatus; columns: readonly Column[]; contacts: readonly Contact[]; error: Error | null; hasMore: boolean; loadMore: () => void; sentinelRef: (element: HTMLDivElement | null) => void; updateContactValue: (contactId: string, columnId: string, value: string | number | null) => Promise<Contact>; createContact: (values: Readonly<Record<string, string | number>>) => Promise<Contact>; deleteContact: (contactId: string) => Promise<void>; createColumn: (input: CreateColumnInput) => Promise<Column>; renameColumn: (columnId: string, label: string) => Promise<Column>; deleteColumn: (columnId: string) => Promise<void>; reorderColumns: (ids: readonly string[]) => Promise<readonly Column[]>; updateStatus: MutationStatus; createStatus: MutationStatus; deleteStatus: MutationStatus; columnCreateStatus: MutationStatus; columnRenameStatus: MutationStatus; columnDeleteStatus: MutationStatus; columnReorderStatus: MutationStatus; mutationError: Error | null; columnMutationError: Error | null };
const PAGE_SIZE = 50;

export function useCrmData(): CrmData {
  const [status, setStatus] = useState<CrmStatus>('loading');
  const [columns, setColumns] = useState<readonly Column[]>([]);
  const [contacts, setContacts] = useState<readonly Contact[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<MutationStatus>('idle');
  const [createStatus, setCreateStatus] = useState<MutationStatus>('idle');
  const [deleteStatus, setDeleteStatus] = useState<MutationStatus>('idle');
  const [mutationError, setMutationError] = useState<Error | null>(null);
  const [columnCreateStatus, setColumnCreateStatus] = useState<MutationStatus>('idle');
  const [columnRenameStatus, setColumnRenameStatus] = useState<MutationStatus>('idle');
  const [columnDeleteStatus, setColumnDeleteStatus] = useState<MutationStatus>('idle');
  const [columnReorderStatus, setColumnReorderStatus] = useState<MutationStatus>('idle');
  const [columnMutationError, setColumnMutationError] = useState<Error | null>(null);
  const mutationLock = useRef(false);
  const nextPage = useRef(2); const loading = useRef(false); const observer = useRef<IntersectionObserver | null>(null);
  const updateContactValue = useCallback(async (contactId: string, columnId: string, value: string | number | null) => {
    if (mutationLock.current) throw new Error('Une autre mutation est déjà en cours.');
    const column = columns.find((candidate) => candidate.id === columnId);
    if (!column) throw new Error('Colonne inconnue.');
    mutationLock.current = true; setUpdateStatus('pending'); setMutationError(null);
    try {
      const updated = await crmService.updateContactValue(contactId, columnId, column.type, value);
      setContacts((current) => current.map((contact) => contact.id === contactId ? updated : contact));
      return updated;
    } catch (cause: unknown) {
      setUpdateStatus('error'); setMutationError(cause instanceof Error ? cause : new Error('La sauvegarde a échoué.'));
      throw cause;
    } finally { mutationLock.current = false; setUpdateStatus('idle'); }
  }, [columns, contacts]);
  const createContact = useCallback(async (values: Readonly<Record<string, string | number>>) => {
    if (mutationLock.current) throw new Error('Une autre mutation est déjà en cours.');
    mutationLock.current = true; setCreateStatus('pending'); setMutationError(null);
    try { const created = await crmService.createContact(values, columns); setContacts((current) => [created, ...current.filter((contact) => contact.id !== created.id)]); setStatus('ready'); return created; }
    catch (cause: unknown) { setCreateStatus('error'); setMutationError(cause instanceof Error ? cause : new Error('La création a échoué.')); throw cause; }
    finally { mutationLock.current = false; setCreateStatus('idle'); }
  }, [columns]);
  const deleteContact = useCallback(async (contactId: string) => {
    if (mutationLock.current) throw new Error('Une autre mutation est déjà en cours.');
    mutationLock.current = true; setDeleteStatus('pending'); setMutationError(null);
    try { await crmService.deleteContact(contactId); setContacts((current) => current.filter((contact) => contact.id !== contactId)); }
    catch (cause: unknown) { setDeleteStatus('error'); setMutationError(cause instanceof Error ? cause : new Error('La suppression a échoué.')); throw cause; }
    finally { mutationLock.current = false; setDeleteStatus('idle'); }
  }, []);
  const createColumn = useCallback(async (input: CreateColumnInput) => {
    if (mutationLock.current) throw new Error('Une autre mutation est déjà en cours.');
    mutationLock.current = true; setColumnCreateStatus('pending'); setColumnMutationError(null);
    try { const created = await crmService.createColumn(input); setColumns((current) => [...current, created]); return created; }
    catch (cause: unknown) { setColumnCreateStatus('error'); setColumnMutationError(cause instanceof Error ? cause : new Error('La création de colonne a échoué.')); throw cause; }
    finally { mutationLock.current = false; setColumnCreateStatus('idle'); }
  }, []);
  const renameColumn = useCallback(async (columnId: string, label: string) => {
    if (mutationLock.current) throw new Error('Une autre mutation est déjà en cours.');
    mutationLock.current = true; setColumnRenameStatus('pending'); setColumnMutationError(null);
    try { const renamed = await crmService.renameColumn(columnId, label); setColumns((current) => current.map((column) => column.id === columnId ? renamed : column)); return renamed; }
    catch (cause: unknown) { setColumnRenameStatus('error'); setColumnMutationError(cause instanceof Error ? cause : new Error('Le renommage de colonne a échoué.')); throw cause; }
    finally { mutationLock.current = false; setColumnRenameStatus('idle'); }
  }, []);
  const deleteColumn = useCallback(async (columnId: string) => {
    if (mutationLock.current) throw new Error('Une autre mutation est déjà en cours.');
    mutationLock.current = true; setColumnDeleteStatus('pending'); setColumnMutationError(null);
    try { await crmService.deleteColumn(columnId); setColumns((current) => current.filter((column) => column.id !== columnId)); setContacts((current) => current.map((contact) => { const values = { ...contact.values }; delete values[columnId]; return { ...contact, values }; })); }
    catch (cause: unknown) { setColumnDeleteStatus('error'); setColumnMutationError(cause instanceof Error ? cause : new Error('La suppression de colonne a échoué.')); throw cause; }
    finally { mutationLock.current = false; setColumnDeleteStatus('idle'); }
  }, []);
  const reorderColumns = useCallback(async (ids: readonly string[]) => {
    if (mutationLock.current) throw new Error('Une autre mutation est déjà en cours.');
    mutationLock.current = true; setColumnReorderStatus('pending'); setColumnMutationError(null);
    try { const reordered = await crmService.reorderColumns(ids); setColumns(reordered); return reordered; }
    catch (cause: unknown) { setColumnReorderStatus('error'); setColumnMutationError(cause instanceof Error ? cause : new Error('Le déplacement de colonne a échoué.')); throw cause; }
    finally { mutationLock.current = false; setColumnReorderStatus('idle'); }
  }, []);
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
  return { status, columns, contacts, error, hasMore, loadMore, sentinelRef, updateContactValue, createContact, deleteContact, createColumn, renameColumn, deleteColumn, reorderColumns, updateStatus, createStatus, deleteStatus, columnCreateStatus, columnRenameStatus, columnDeleteStatus, columnReorderStatus, mutationError, columnMutationError };
}