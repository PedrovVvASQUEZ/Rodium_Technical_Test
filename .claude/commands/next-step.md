# Etape suivante du projet

Execute cette procedure pour une seule etape:

1. Lis `CLAUDE.md`, le README et les changements non commites.
2. Identifie l'etape la plus petite qui apporte une capacite testable.
3. Demande a `architect` le contrat et les criteres d'acceptation.
4. Delegue l'implementation a `backend` ou `frontend`, jamais aux deux si les fichiers se chevauchent.
5. Demande a `qa` la verification ciblee.
6. Demande a `reviewer` une revue si un contrat partage est touche.
7. Corrige les problemes trouves.
8. Execute les verifications finales.
9. Cree un commit Conventional Commit atomique et affiche son hash.

Ne passe pas a l'etape suivante tant que la verification ou le commit n'est pas termine.