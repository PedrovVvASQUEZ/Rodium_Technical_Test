# Rodium CRM Tabulaire

Application CRM tabulaire du test technique Rodium. Le backend est en NestJS/TypeScript, la persistance utilise PostgreSQL et l'interface est en React/Vite. Aucune librairie de grille metier prete a l'emploi ni Tailwind CSS n'est utilisee.

Le fichier `Rodium_Test-technique_CRM-Tabulaire.pdf` est disponible localement et reste ignore par Git car il s'agit du sujet de référence fourni pour le test. Les informations ci-dessous sont basees sur le code, les tests et les scripts disponibles.

## Prerequis

- Node.js et npm;
- Docker et Docker Compose pour PostgreSQL;
- un shell permettant d'executer les scripts npm.

Aucune version minimale de Node.js n'est declaree dans les manifests. Les dependances verrouillees sont installees avec `npm ci`.

## Installation et configuration

Depuis la racine du projet :

```bash
npm ci
cp .env.example .env
```

Les valeurs de developpement PostgreSQL utilisees par Docker sont :

```text
DATABASE_URL=postgresql://rodium:rodium_dev_only@localhost:5432/rodium
BACKEND_PORT=3000
VITE_API_BASE_URL=http://localhost:3000
```


## PostgreSQL, migrations et seed

Le fichier `docker-compose.yml` demarre uniquement le service PostgreSQL 16 sur le port `5432` et conserve les donnees dans le volume Docker `rodium_postgres_data`.

```bash
npm run db:up
npm run db:migrate
npm run db:seed
```

`db:migrate` compile le backend puis applique, dans l'ordre numerique, les fichiers SQL de `apps/backend/migrations/`. Les migrations deja enregistrees dans `schema_migrations` ne sont pas rejouees.

`db:seed` compile le backend puis insere 500 contacts synthetiques, par lots de 100, a partir des colonnes existantes. Le seed est idempotent : il ne remplace pas les colonnes, les contacts utilisateur ou les valeurs deja modifiees. Il echoue si aucune colonne n'existe.

Pour arreter PostgreSQL :

```bash
npm run db:down
```

## Lancement

Dans deux terminaux apres la preparation de PostgreSQL :

```bash
npm run dev:backend
npm run dev:frontend
```

L'interface est disponible sur [http://localhost:5173](http://localhost:5173). Le backend ecoute sur [http://localhost:3000](http://localhost:3000), avec CORS autorise par defaut depuis `http://localhost:5173`.

Le script racine `npm run dev` affiche ces deux commandes mais ne lance pas les processus lui-meme.

## Fonctionnalites verifiees dans le code

- lecture paginee des contacts, avec chargement progressif frontend par pages de 50;
- creation et suppression de contacts;
- edition d'une valeur de cellule avec types `text`, `number`, `date` et `phone`, y compris l'effacement;
- creation, renommage, suppression et reordonnancement de colonnes;
- persistance PostgreSQL des colonnes, contacts et valeurs;
- tri et filtrage cote repository/API, avec liste blanche des colonnes SQL et gestion des types numeriques et dates;
- validation des entrees et adaptation des erreurs API;
- seed deterministe et rejouable de 500 contacts.

Le frontend affiche la grille et ses actions, mais aucun controle d'interface de tri ou de filtre n'est present dans les composants verifies. Le tri/filtre est donc une capacite backend testee, pas une fonctionnalite exposee par l'ecran actuel.

## Tests et controles

Tests unitaires et tests frontend :

```bash
npm test
npm test --workspace @rodium/backend
npm test --workspace @rodium/frontend
```

Le test backend exclut explicitement les tests d'integration PostgreSQL. Les tests frontend utilisent Vitest et Testing Library.

Tests d'integration PostgreSQL :

```bash
npm run test:integration
# ou
npm run test:integration --workspace @rodium/backend
```

Cette suite execute les migrations et verifie notamment la pagination, le tri, les filtres types, la liste blanche SQL, le seed de 500 contacts, le CRUD contacts et le CRUD/reordonnancement des colonnes. Elle exige une base accessible via `DATABASE_URL`; la commande racine fournit l'URL de developpement dans son environnement.

Typecheck et build :

```bash
npm run typecheck
npm run build
```

Dans le depot, le lint racine est un alias de `npm run typecheck`.

## Architecture

Le backend suit une Clean Architecture en quatre zones : `domain` pour les regles et types, `application` pour les cas d'utilisation et ports, `infrastructure` pour PostgreSQL et les adaptateurs, puis `presentation` pour NestJS, HTTP et DTOs. Le frontend separe de meme `domain`, `application`, `infrastructure/api` et `presentation`.

Les repositories PostgreSQL implementent les ports applicatifs. Les regles de validation restent hors de la persistance et du rendu. Les decisions de donnees sont decrites plus en detail dans [docs/architecture.md](docs/architecture.md).

## Limites connues

- le compose Docker ne fournit pas de services backend ou frontend;
- le PDF du sujet est disponible localement mais n'est pas versionne;
- le tri et le filtre ne disposent pas encore de controles dans l'interface;
- aucune configuration de production, authentification ou gestion de comptes n'est presente dans le code verifie;
- la virtualisation et le drag-and-drop avance ne sont pas implementes.

## Ameliorations prioritaires

1. Ajouter les controles UI de tri et de filtre et les relier aux requetes paginees serveur.
2. Ajouter un parcours Docker complet pour lancer PostgreSQL, le backend et le frontend ensemble.
3. Ajouter une verification end-to-end du demarrage et de la grille avec 500 contacts.
4. Preciser les prerequis de version Node.js et preparer la configuration de production.

## Utilisation de Claude Code et des agents

Les regles de travail sont definies dans `CLAUDE.md` et `.claude/`. L'agent principal orchestre une etape a la fois, formule une hypothese et un critere d'acceptation, delegue une tache delimitee, relit les contrats, lance le controle adapte et documente le resultat. Les agents specialises disponibles dans le depot couvrent notamment l'architecture, le backend, le frontend, la QA, la revue et la documentation.

La commande `/next-step` formalise le workflow d'etape. Les agents ne creent pas de commit d'apres les regles du depot; la consigne generale du projet prevoit toutefois un commit atomique a la fin d'une etape validee.

## Temps passe

Le temps passe n'est pas mesure dans le depot et ne peut pas etre deduit de facon fiable du code ou de l'historique disponible. Ce champ reste donc a completer par l'auteur de la livraison.