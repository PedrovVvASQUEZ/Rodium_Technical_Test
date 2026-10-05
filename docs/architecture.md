# Architecture

## Objectif

Le projet est organise en Clean Architecture pour isoler les regles CRM des frameworks, de PostgreSQL et de React.

## Backend

```text
src/
  domain/
    contacts/
    columns/
  application/
    contacts/
    columns/
  infrastructure/
    persistence/
    http/
  presentation/
    contacts/
    columns/
```

Le domaine ne depend d'aucun framework. Les cas d'utilisation dependent de ports. PostgreSQL implemente les repositories et les controllers traduisent HTTP vers les DTOs d'application.

## Frontend

```text
src/
  domain/
  application/
  infrastructure/api/
  presentation/components/
  presentation/pages/
```

La grille est un composant metier local. Les librairies primitives de formulaire, validation, requetes ou drag-and-drop sont acceptables, mais une grille complete prete a l'emploi ne l'est pas.

## Decisions de donnees

Les colonnes sont persistantes et ordonnees. Les valeurs de contact sont associees a une colonne et conservees dans une representation compatible avec son type. Le tri et le filtrage sont executes par PostgreSQL avant la pagination.

## Evolution

Chaque changement de contrat doit inclure une migration ou une mise a jour de seed, un test, une documentation courte et un commit atomique.