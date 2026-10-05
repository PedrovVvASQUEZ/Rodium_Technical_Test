import { appName } from '../domain/app-name';
import { ContactGrid } from './ContactGrid';
import { useCrmData } from './use-crm-data';
import './crm.css';

export function App() {
  const { status, columns, contacts, error, sentinelRef } = useCrmData();

  return (
    <main className="crm-page">
      <header className="crm-header"><h1>{appName}</h1><p>Répertoire des contacts</p></header>
      {status === 'loading' && <p className="state">Chargement des contacts...</p>}
      {status === 'error' && <p className="state state-error" role="alert">{error?.message}</p>}
      {status === 'empty' && <p className="state">Aucun contact à afficher.</p>}
      {(status === 'ready' || status === 'empty') && <ContactGrid columns={columns} contacts={contacts} />}
      {status === 'ready' && error && <p className="state state-error" role="alert">{error.message}</p>}
      <div className="sentinel" ref={sentinelRef} aria-hidden="true" />
    </main>
  );
}