# 0002 — Stratégie multi-tenant

## Décision

Isolation multi-tenant appliquée **au niveau applicatif**, pas via PostgreSQL Row-Level Security (RLS), pour ce cycle MVP.

## Règles obligatoires

1. `businessId` est **toujours** lu depuis le claim JWT vérifié (`@CurrentBusiness()`), jamais depuis un paramètre, un body ou une query string envoyés par le client.
2. Toute lecture/écriture/suppression sur une ressource appartenant à une entreprise filtre `{ id, businessId }` **ensemble** — jamais `{ id }` seul. C'est la règle n°1 de prévention IDOR.
3. Un token d'une entreprise A qui référence une ressource de l'entreprise B doit recevoir **404** (pas 403, pour ne pas révéler l'existence de la ressource).
4. Chaque module métier a un test e2e dédié à cette isolation croisée (créer entreprise A et B, vérifier qu'aucune fuite n'est possible dans un sens ni dans l'autre).

## Durcissement différé (post-MVP)

Row-Level Security Postgres (`SET LOCAL app.business_id` par requête/transaction). Nécessite d'envelopper chaque appel Prisma dans une transaction avec un `SET LOCAL` brut — complexité supplémentaire mieux justifiée une fois la surface d'API stabilisée. Pas requis pour ce cycle : l'isolation applicative + les tests e2e systématiques constituent la barre de sécurité du MVP.
