# Rodium CRM Tabulaire

## Mission

Construire le test technique CRM tabulaire décrit dans `Rodium_Test-technique_CRM-Tabulaire.pdf`.
Le projet doit rester explicable, testable et maintenable. La stabilite et la coherence priment sur le nombre de fonctionnalites.

## Regles non negociables

- Respecter Node.js, NestJS, PostgreSQL, API REST, React et Vite.
- Utiliser TypeScript, sauf raison documentee.
- Ne pas utiliser Tailwind CSS ni de librairie de grille metier prete a l'emploi.
- Ne jamais exposer de secret, de donnee personnelle reelle ou de credential dans Git.
- Ne jamais melanger une decision de domaine avec la persistance ou le rendu UI.
- Ne pas faire de refactor hors du perimetre de l'etape en cours.
- Toute entree utilisateur doit etre validee; toute requete SQL dynamique doit utiliser une liste blanche.
- Les changements doivent etre petits, testables et reversibles.

## Architecture cible

Le backend suit quatre couches:

1. `domain`: entites, types, regles metier et erreurs; aucune dependance NestJS ou SQL.
2. `application`: cas d'utilisation et ports; orchestre le domaine.
3. `infrastructure`: PostgreSQL, migrations, repositories et adaptateurs HTTP.
4. `presentation`: controllers, DTOs, validation et mapping des reponses.

Le frontend separe:

1. `domain`: types et regles de validation reutilisables.
2. `application`: services et contrats API.
3. `infrastructure`: client HTTP et configuration.
4. `presentation`: composants, hooks et etat de l'ecran.

Les dependances vont vers le domaine. Les implementations dependent des ports, jamais l'inverse.

## Workflow multi-agent obligatoire

L'agent principal est l'orchestrateur. Il suit une seule etape a la fois:

1. Lire le contexte local et le cahier des charges.
2. Ecrire une hypothese falsifiable et le critere d'acceptation de l'etape.
3. Deleguer une tache delimitee a un seul agent specialise.
4. Relire le diff et verifier les contrats entre couches.
5. Lancer le test, lint, typecheck ou build le plus proche du changement.
6. Faire une revue de risques avec l'agent `reviewer` si le changement touche un contrat partage.
7. Corriger les problemes de l'etape et relancer les controles.
8. Creer un commit atomique avant de commencer l'etape suivante.

Ne pas lancer deux agents qui modifient les memes fichiers en parallele. Les agents specialises ne creent pas de commit et ne rebasent pas la branche; ils rendent compte des fichiers modifies, des commandes executees et des risques restants.

## Convention de commits

Utiliser Conventional Commits, en francais ou en anglais coherent:

```text
feat(scope): ajoute la lecture paginee des contacts
fix(scope): valide le tri sur les colonnes autorisees
test(scope): couvre le filtrage des contacts
docs(scope): documente le workflow de demarrage
chore(scope): initialise Docker et les outils
```

Un commit correspond a une etape fonctionnelle ou technique validee. Ne pas utiliser `--no-verify`, ne pas committer de fichiers generes, et ne jamais regrouper une fonctionnalite non testee avec une autre.

## Definition of Done

Une etape est terminee seulement si:

- le comportement est implemente dans la bonne couche;
- les erreurs et validations importantes sont traitees;
- un test adapte existe ou l'absence est justifiee;
- la commande de verification passe;
- le README ou la documentation est mise a jour si le contrat change;
- le diff est relu;
- un commit atomique est cree.

## Priorites du test technique

MVP: grille, CRUD contacts, edition de cellule, colonnes dynamiques, tri/filtre cote serveur, chargement progressif, persistance, seed de 500 contacts et Docker. Les optimisations visuelles, le drag-and-drop avance et la virtualisation viennent ensuite.