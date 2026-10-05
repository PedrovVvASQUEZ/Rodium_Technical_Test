import { appName } from '../domain/app-name';
import { ContactGrid } from './ContactGrid';
import { ContactForm } from './ContactForm';
import { useCrmData } from './use-crm-data';
import './crm.css';

export function App() {
  const { status, columns, contacts, error, sentinelRef, updateContactValue, createContact, deleteContact, createStatus, deleteStatus, mutationError } = useCrmData();

  return (
    <main className="crm-page">
      <header className="crm-header"><h1>{appName}</h1><p>Répertoire des contacts</p></header>
      {status === 'loading' && <p className="state">Chargement des contacts...</p>}
      {status === 'error' && <p className="state state-error" role="alert">{error?.message}</p>}
      {status === 'empty' && <p className="state">Aucun contact à afficher.</p>}
      {(status === 'ready' || status === 'empty') && <ContactForm columns={columns} onCreate={createContact} busy={createStatus === 'pending'} error={mutationError} />}
      {(status === 'ready' || status === 'empty') && <ContactGrid columns={columns} contacts={contacts} onUpdateCell={updateContactValue} onDeleteContact={deleteContact} deleteStatus={deleteStatus} />}
      {status === 'ready' && error && <p className="state state-error" role="alert">{error.message}</p>}
      <div className="sentinel" ref={sentinelRef} aria-hidden="true" />
    </main>
  );
}