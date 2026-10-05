# Rodium CRM Tabulaire

Projet du test technique Rodium. Le cahier des charges est disponible dans `Rodium_Test-technique_CRM-Tabulaire.pdf`.

## Demarrage avec Claude Code

Le workflow multi-agent du projet est defini dans `CLAUDE.md` et `.claude/`. L'agent principal orchestre les agents specialises, valide chaque etape et cree un commit atomique apres les controles.

La commande `/next-step` fournit la procedure standard pour avancer d'une etape testable a la suivante.

## Principes

- Clean Architecture cote backend et frontend.
- Une fonctionnalite a la fois, avec test cible et commit pertinent.
- Aucun secret ni donnee personnelle reelle.
- Pas de Tailwind ni de librairie de grille metier prete a l'emploi.

## Etat du projet

Le projet est en phase d'initialisation. Les commandes de lancement et de test seront ajoutees avec le scaffold applicatif.

## Persistance PostgreSQL

Avec Docker et `DATABASE_URL` configure (voir `.env.example`) :

```text
npm run db:up
npm run db:migrate
npm run db:seed
npm test --workspace @rodium/backend
npm run test:integration --workspace @rodium/backend
```

Les tests d'integration utilisent PostgreSQL reel et echouent explicitement si `DATABASE_URL` est absent ou inaccessible. Le seed contient uniquement des donnees synthetiques et peut etre rejoue.