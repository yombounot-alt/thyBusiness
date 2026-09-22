# 0001 — Choix de l'ORM : Prisma

## Décision

Utiliser **Prisma** comme ORM pour le backend NestJS, plutôt que TypeORM.

## Raisons

- Schéma déclaratif (`schema.prisma`) : une seule source de vérité pour les modèles et les migrations, plus rapide à faire évoluer que le mapping décorateurs/entités de TypeORM.
- Client généré et typé : élimine une classe entière de bugs de désynchronisation DTO/entité.
- `prisma migrate dev` donne une boucle d'itération rapide adaptée à un développement solo/MVP.
- Modèle mental plus simple que le mix repository/active-record de TypeORM.

## Compromis accepté

Moins ergonomique pour des requêtes récursives/graphes très complexes. Pour l'agrégation du dashboard, on utilisera `prisma.$queryRaw` si nécessaire plutôt que de forcer l'ORM.
