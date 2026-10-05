import { appName } from '../domain/app-name';
import { ContactGrid } from './ContactGrid';
import { ContactForm } from './ContactForm';
import { ColumnForm } from './ColumnForm';
import { useCrmData } from './use-crm-data';
import './crm.css';

export function App() {
  const { status, columns, contacts, error, sentinelRef, updateContactValue, createContact, deleteContact, createColumn, renameColumn, deleteColumn, reorderColumns, updateStatus, createStatus, deleteStatus, columnCreateStatus, columnRenameStatus, columnDeleteStatus, columnReorderStatus, mutationError, columnMutationError } = useCrmData();
  const columnMutationBusy = [columnCreateStatus, columnRenameStatus, columnDeleteStatus, columnReorderStatus].includes('pending');
  const contactMutationBusy = [updateStatus, createStatus, deleteStatus].includes('pending');
  const mutationBusy = columnMutationBusy || contactMutationBusy;

  return (
    <main className="crm-page">
      <header className="crm-header"><h1>{appName}</h1><p>Répertoire des contacts</p></header>
      {status === 'loading' && <p className="state">Chargement des contacts...</p>}
      {status === 'error' && <p className="state state-error" role="alert">{error?.message}</p>}
      {status === 'empty' && <p className="state">Aucun contact à afficher.</p>}
      {(status === 'ready' || status === 'empty') && <ContactForm columns={columns} onCreate={createContact} busy={mutationBusy} error={mutationError} />}
      {(status === 'ready' || status === 'empty') && <ColumnForm onCreate={createColumn} busy={columnMutationBusy} error={columnMutationError} />}
      {(status === 'ready' || status === 'empty') && <ContactGrid columns={columns} contacts={contacts} onUpdateCell={updateContactValue} onDeleteContact={deleteContact} deleteStatus={deleteStatus} contactMutationBusy={contactMutationBusy} onRenameColumn={renameColumn} onDeleteColumn={deleteColumn} onReorderColumns={reorderColumns} columnMutationBusy={columnMutationBusy} columnRenameStatus={columnRenameStatus} columnDeleteStatus={columnDeleteStatus} columnReorderStatus={columnReorderStatus} columnMutationError={columnMutationError} />}
      {status === 'ready' && error && <p className="state state-error" role="alert">{error.message}</p>}
      <div className="sentinel" ref={sentinelRef} aria-hidden="true" />
    </main>
  );
}